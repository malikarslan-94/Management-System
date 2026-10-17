class HttpError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
    }
}
const handle = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)
const idOf = (value) => String(value?._id || value || '')
const text = (value, max = 200) =>
    typeof value === 'string' ? value.trim().slice(0, max) : ''
const escapeRegex = (value) =>
    text(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function pagination(query) {
    const page = Number(query.page || 1),
        limit = Number(query.limit || 20)
    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 500
    )
        throw new HttpError(400, 'Invalid pagination (limit must be 1–500).')
    return { page, limit, skip: (page - 1) * limit }
}
function date(value, label) {
    if (
        typeof value !== 'string' ||
        !value ||
        !Number.isFinite(Date.parse(value))
    )
        throw new HttpError(400, `Invalid ${label}.`)
    return new Date(value)
}
module.exports = {
    HttpError,
    handle,
    idOf,
    text,
    escapeRegex,
    pagination,
    date,
}
