const { isolated, fixture } = require('./isolated.cjs')
async function startPreview(port = 0) {
    const env = await isolated()
    let vite
    try {
        const data = await fixture(env)
        await env.mongoose.model('CampFacility').create({ campId: data.camps[0]._id, name: 'Main Dining Hall', kind: 'mess', capacity: 120, openingHours: '06:00–22:00', description: 'Meals for residents and visiting staff.' })
        process.env.VITE_API_BASE_URL = env.base
        process.env.VITE_ENABLE_MOCK = 'false'
        const { createServer } = await import('vite')
        vite = await createServer({ server: { host: '127.0.0.1', port, strictPort: true } })
        await vite.listen()
        return { base: env.base, url: `http://127.0.0.1:${vite.httpServer.address().port}`, campId: String(data.camps[0]._id), stop: async () => { await vite.close(); await env.stop() } }
    } catch (error) { if (vite) await vite.close(); await env.stop(); throw error }
}
module.exports = { startPreview }
if (require.main === module) {
    startPreview(5181).then(preview => {
        console.log('Isolated browser preview ready at', preview.url)
        const stop = async () => { await preview.stop(); process.exit(0) }
        process.on('SIGINT', stop); process.on('SIGTERM', stop)
    }).catch(e => { console.error(e); process.exit(1) })
}
