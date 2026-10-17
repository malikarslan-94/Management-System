const path = require('path')
// Local secrets stay outside the tracked configuration; deployment environment variables take precedence.
require('dotenv').config({ path: path.join(__dirname, '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '.env') })
const mongoose = require('mongoose')
const { createApp } = require('./app')
async function start() {
    const app = createApp()
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME })
    const port = process.env.PORT || 3001
    return app.listen(port, () => console.log(`CampWise API listening on port ${port}`))
}
if (require.main === module) start().catch(error => { console.error('API startup failed:', error.message); process.exitCode = 1 })
module.exports = { start }
