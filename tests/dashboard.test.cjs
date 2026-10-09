// Run with: node --test tests/dashboard.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { buildSync } = require('esbuild')

const compiled = buildSync({
    entryPoints: [path.join(__dirname, '../src/views/dashboardData.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
}).outputFiles[0].text
const helperModule = { exports: {} }
vm.runInNewContext(compiled, { module: helperModule, exports: helperModule.exports, Date })
const { summarizeRooms, upcomingCheckoutFilters, formatCheckoutDate, formatRelativeTime, localDateKey } = helperModule.exports

const room = (status) => ({ status })

test('occupancy excludes maintenance and cleaning from available rooms', () => {
    const summary = summarizeRooms([
        room('occupied'), room('available'), room('maintenance'), room('cleaning'),
    ], [])
    assert.equal(summary.total, 4)
    assert.equal(summary.occupiedPercent, 25)
    assert.equal(summary.availablePercent, 25)
    assert.equal(summary.unavailablePercent, 50)
    assert.equal(summary.maintenance, 1)
})

test('room records override camp totals and preserve the unrounded chart ratio', () => {
    const summary = summarizeRooms([
        ...Array.from({ length: 2 }, () => room('occupied')),
        ...Array.from({ length: 33 }, () => room('available')),
    ], [{ totalRooms: 100, occupiedRooms: 100 }])
    assert.equal(summary.total, 35)
    assert.equal(Math.round(summary.occupiedPercent), 6)
    assert.ok(Math.abs(summary.occupiedPercent + summary.availablePercent - 100) < 1e-10)
    assert.equal(summary.fromRecords, true)
})

test('empty rooms have no invented availability or invalid percentages', () => {
    const summary = summarizeRooms([], [])
    assert.equal(summary.total, 0)
    assert.equal(summary.occupiedPercent, 0)
    assert.equal(summary.availablePercent, 0)
    assert.equal(summary.unavailablePercent, 0)
})

test('camp fallback accounts for rooms under repair and cleaning', () => {
    const summary = summarizeRooms([], [{ totalRooms: 10, occupiedRooms: 2, maintenanceRooms: 3, cleaningRooms: 1 }])
    assert.equal(summary.occupied, 2)
    assert.equal(summary.available, 4)
    assert.equal(summary.unavailable, 4)
    assert.equal(summary.maintenance, 3)
    assert.equal(summary.fromRecords, false)
})

test('fully occupied and inconsistent fallback data cannot overflow the chart', () => {
    assert.equal(summarizeRooms([room('occupied')], []).occupiedPercent, 100)
    const summary = summarizeRooms([], [{ totalRooms: 2, occupiedRooms: 5, maintenanceRooms: 1 }])
    assert.equal(summary.occupiedPercent, 100)
    assert.equal(summary.availablePercent, 0)
    assert.equal(summary.unavailablePercent, 0)
})

test('checkout window includes today and the next two calendar dates, across year boundaries', () => {
    const filters = upcomingCheckoutFilters('2026-12-31')
    assert.equal(filters.expectedCheckoutFrom, '2026-12-31T00:00:00.000Z')
    assert.equal(filters.expectedCheckoutTo, '2027-01-02T23:59:59.999Z')
    assert.equal(filters.status, 'active')
    assert.equal(filters.sortBy, 'expectedCheckoutDate')
    assert.equal(filters.limit, 6)
})

test('date-only checkouts do not shift to the previous date in western time zones', () => {
    const previous = process.env.TZ
    try {
        process.env.TZ = 'America/Los_Angeles'
        assert.equal(localDateKey(new Date(2026, 9, 8, 20)), '2026-10-08')
        assert.match(formatCheckoutDate('2026-10-08T00:00:00.000Z'), /8/)
        assert.doesNotMatch(formatCheckoutDate('2026-10-08T00:00:00.000Z'), /7/)
    } finally {
        if (previous === undefined) delete process.env.TZ
        else process.env.TZ = previous
    }
})

test('relative dates handle missing and invalid data', () => {
    assert.equal(formatRelativeTime(undefined), '—')
    assert.equal(formatRelativeTime('invalid'), '—')
    assert.equal(formatRelativeTime('2026-10-07T12:00:00Z', Date.parse('2026-10-08T12:00:00Z')), '1 day ago')
    assert.equal(formatCheckoutDate('invalid'), '—')
})

function assignmentRoute() {
    let getAll
    const calls = {}
    const query = {
        populate() { return this },
        sort(sort) { calls.sort = sort; return this },
        skip(skip) { calls.skip = skip; return this },
        limit(limit) { calls.limit = limit; return this },
        async lean() { return [] },
    }
    const model = {
        find(filter) { calls.filter = filter; return query },
        async countDocuments(filter) { calls.countFilter = filter; return 12 },
    }
    const router = {
        get(route, handler) { if (route === '/') getAll = handler },
        post() {}, put() {}, delete() {},
    }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../server/routes/assignments.js'), 'utf8'), {
        require: (name) => name === 'express' ? { Router: () => router }
            : name === '../models/RoomAssignment' ? model : {},
        module: { exports: {} }, Date, console,
    })
    return {
        calls,
        async request(query) {
            const response = { statusCode: 200, body: undefined,
                status(code) { this.statusCode = code; return this },
                json(body) { this.body = body; return this },
            }
            await getAll({ query }, response)
            return response
        },
    }
}

test('existing assignment queries retain their filters, pagination, and newest-first order', async () => {
    const { calls, request } = assignmentRoute()
    const response = await request({ status: 'completed', roomId: 'room-1', page: '2', limit: '10' })
    assert.equal(response.statusCode, 200)
    assert.equal(JSON.stringify(calls.filter), JSON.stringify({ roomId: 'room-1', status: 'completed' }))
    assert.equal(JSON.stringify(calls.sort), JSON.stringify({ createdAt: -1 }))
    assert.equal(calls.skip, 10)
    assert.equal(calls.limit, 10)
    assert.equal(response.body.totalPages, 2)
})

test('upcoming query filters all assignments before limiting and orders soonest first', async () => {
    const { calls, request } = assignmentRoute()
    const response = await request(upcomingCheckoutFilters('2026-10-08'))
    assert.equal(response.statusCode, 200)
    assert.equal(calls.filter.status, 'active')
    assert.equal(calls.filter.expectedCheckoutDate.$gte.toISOString(), '2026-10-08T00:00:00.000Z')
    assert.equal(calls.filter.expectedCheckoutDate.$lte.toISOString(), '2026-10-10T23:59:59.999Z')
    assert.equal(JSON.stringify(calls.sort), JSON.stringify({ expectedCheckoutDate: 1, _id: 1 }))
    assert.equal(calls.limit, 6)
    assert.equal(calls.countFilter, calls.filter)
})

test('invalid or reversed checkout date filters fail without querying the database', async () => {
    for (const query of [
        { expectedCheckoutFrom: 'not-a-date' },
        { expectedCheckoutFrom: ['2026-10-08'] },
        { expectedCheckoutFrom: '2026-10-10', expectedCheckoutTo: '2026-10-08' },
    ]) {
        const { calls, request } = assignmentRoute()
        const response = await request(query)
        assert.equal(response.statusCode, 400)
        assert.equal(calls.filter, undefined)
    }
})
