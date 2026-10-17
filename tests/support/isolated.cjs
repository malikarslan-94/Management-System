const { MongoMemoryReplSet } = require('mongodb-memory-server')
const mongoose = require('../../server/node_modules/mongoose')
const { createApp } = require('../../server/app')
async function isolated() {
    const repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.24', downloadDir: '/tmp/campwise-mongodb-binaries' }, replSet: { count: 1 } })
    await mongoose.connect(repl.getUri(), { dbName: 'campwise_feature_test' })
    // Create all collections before the first multi-document transaction.
    await Promise.all(Object.values(mongoose.models).map(model => model.init()))
    const server = await new Promise(resolve => { const s = createApp({ jwtSecret: 'isolated-test-secret-only' }).listen(0, '127.0.0.1', () => resolve(s)) })
    const base = `http://127.0.0.1:${server.address().port}`
    async function request(method, path, body, token) {
        const response = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
        const raw = await response.text()
        let data; try { data = JSON.parse(raw) } catch { data = raw }
        return { status: response.status, data, response }
    }
    async function stop() { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl.stop() }
    return { request, base, stop, mongoose }
}
async function fixture(env) {
    const { request: req, mongoose: db } = env
    const signup = await req('POST', '/sign-up', { name: 'Test Admin', email: 'admin@example.test', password: 'Admin-test-pass-2026' })
    if (signup.status !== 201) throw new Error(JSON.stringify(signup.data))
    const token = signup.data.token
    const location = await db.model('Location').create({ name: 'Eastern Region', city: 'Dammam' })
    const camps = await db.model('Camp').create([{ name: 'Dammam Camp', locationId: location._id }, { name: 'Riyadh Camp', locationId: location._id }])
    const buildings = await db.model('Building').create(camps.map(camp => ({ name: 'Block A', campId: camp._id, floors: 2 })))
    const rooms = await db.model('Room').create(Array.from({ length: 8 }, (_, i) => ({ camp: camps[i < 6 ? 0 : 1]._id, buildingId: buildings[i < 6 ? 0 : 1]._id, roomNumber: String(101 + i), floor: 1, type: 'single', capacity: 1, status: i === 5 ? 'maintenance' : 'available' })))
    const people = await db.model('Employee').create(Array.from({ length: 8 }, (_, i) => ({ firstName: ['Ahmed', 'Bilal', 'Khalid', 'Omar', 'Faisal', 'Yusuf', 'Ali', 'Ibrahim'][i], lastName: 'Test', email: `resident${i}@example.test`, phone: '0500000000', iqamaNumber: `IQ${i}`, employeeId: `EMP${i}`, campId: camps[i < 6 ? 0 : 1]._id, department: 'Operations', employeeType: i === 3 ? 'Visitor' : 'Permanent' })))
    const users = {}, tokens = {}
    for (const role of ['camp_manager', 'reception', 'viewer']) {
        users[role] = await db.model('User').create({ name: role, email: `${role}@example.test`, password: 'Role-test-pass-2026', role, assignedCamps: [camps[0]._id] })
        tokens[role] = (await req('POST', '/sign-in', { user: `${role}@example.test`, password: 'Role-test-pass-2026' })).data.token
    }
    const startDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const expectedCheckoutDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const stay = (roomIndex, personIndex) => ({ roomId: String(rooms[roomIndex]._id), occupantId: String(people[personIndex]._id), startDate, expectedCheckoutDate })
    return { token, admin: signup.data.user, location, camps, buildings, rooms, people, users, tokens, stay }
}
module.exports = { isolated, fixture }
