const { HttpError } = require('./http')
function dateKey(value, timezone = 'Asia/Riyadh') {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(value))
}
function dayBounds(value, timezone = 'Asia/Riyadh') {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value
    )
        throw new HttpError(400, 'Choose a valid calendar date.')
    // Resolve local midnight with timezone offsets (including DST); never use the host timezone.
    function midnight(key) {
        const target = Date.parse(key + 'T00:00:00Z')
        let result = target
        for (let i = 0; i < 3; i++) {
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23',
            }).formatToParts(new Date(result))
            const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
            const represented = Date.UTC(
                +p.year,
                +p.month - 1,
                +p.day,
                +p.hour,
                +p.minute,
                +p.second,
            )
            result += target - represented
        }
        return new Date(result)
    }
    const tomorrow = new Date(Date.parse(value) + 86400000)
        .toISOString()
        .slice(0, 10)
    return { start: midnight(value), end: midnight(tomorrow) }
}
function formatDate(value, format = 'DD MMM YYYY', timezone = 'UTC') {
    if (!value) return '—'
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        day: '2-digit',
        month: format === 'DD MMM YYYY' ? 'short' : '2-digit',
        year: 'numeric',
    }).formatToParts(new Date(value))
    const p = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    if (format === 'YYYY-MM-DD') return `${p.year}-${p.month}-${p.day}`
    if (format === 'DD/MM/YYYY') return `${p.day}/${p.month}/${p.year}`
    return `${p.day} ${p.month} ${p.year}`
}
module.exports = { dateKey, dayBounds, formatDate }
