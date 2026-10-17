const router = require('express').Router()
const User = require('../models/User')
const Camp = require('../models/Camp')
const Settings = require('../models/OrganizationSettings')
const { handle, HttpError, text, idOf } = require('../lib/http')
const {
    requirePermission,
    publicUser,
    ROLES,
    roleOf,
} = require('../lib/access')
const { transaction, audit } = require('../lib/transaction')
router.use(requirePermission('users'))
router.get(
    '/',
    handle(async (req, res) =>
        res.json((await User.find().sort({ name: 1 })).map(publicUser)),
    ),
)
router.get('/roles', (req, res) =>
    res.json(Object.entries(ROLES).map(([key, value]) => ({ key, ...value }))),
)
async function fields(input) {
    const name = text(input.name),
        email = text(input.email).toLowerCase(),
        role = input.role
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES[role])
        throw new HttpError(400, 'Enter a name, valid email and role.')
    if (!Array.isArray(input.assignedCamps))
        throw new HttpError(400, 'Choose the camps this user can access.')
    const assignedCamps = [...new Set(input.assignedCamps.map(String))]
    if (
        (await Camp.countDocuments({ _id: { $in: assignedCamps } })) !==
        assignedCamps.length
    )
        throw new HttpError(400, 'An assigned camp no longer exists.')
    if (typeof input.active !== 'boolean')
        throw new HttpError(400, 'Choose an account status.')
    return {
        name,
        email,
        role,
        assignedCamps: role === 'admin' ? [] : assignedCamps,
        active: input.active,
    }
}
router.post(
    '/',
    handle(async (req, res) => {
        const data = await fields(req.body)
        if (
            typeof req.body.temporaryPassword !== 'string' ||
            req.body.temporaryPassword.length < 10
        )
            throw new HttpError(
                400,
                'Temporary password must contain at least 10 characters.',
            )
        const created = await transaction(async (session) => {
            await Settings.findOneAndUpdate(
                { _id: 'organization' },
                { $inc: { accessRevision: 1 } },
                { upsert: true, session },
            )
            const [user] = await User.create(
                [
                    {
                        ...data,
                        password: req.body.temporaryPassword,
                        mustChangePassword: true,
                    },
                ],
                { session },
            )
            await audit(
                req,
                'create-user',
                'user',
                user,
                {
                    role: user.role,
                    assignedCamps: user.assignedCamps,
                    active: user.active,
                },
                session,
            )
            return user
        })
        res.status(201).json(publicUser(created))
    }),
)
router.patch(
    '/:id',
    handle(async (req, res) => {
        const data = await fields(req.body)
        const updated = await transaction(async (session) => {
            // Serializes administrator membership changes, including concurrent last-admin removal.
            await Settings.findOneAndUpdate(
                { _id: 'organization' },
                { $inc: { accessRevision: 1 } },
                { upsert: true, session },
            )
            const user = await User.findById(req.params.id).session(session)
            if (!user) throw new HttpError(404, 'User not found.')
            if (
                roleOf(user) === 'admin' &&
                user.active !== false &&
                (data.role !== 'admin' || !data.active)
            ) {
                if (
                    (await User.countDocuments({
                        role: 'admin',
                        active: { $ne: false },
                    }).session(session)) <= 1
                )
                    throw new HttpError(
                        409,
                        'Keep at least one active administrator.',
                    )
            }
            const before = publicUser(user)
            Object.assign(user, data)
            const accessChanged =
                before.role !== data.role ||
                before.active !== data.active ||
                JSON.stringify(before.assignedCamps.map(String).sort()) !==
                    JSON.stringify(data.assignedCamps.map(String).sort())
            if (accessChanged) user.tokenVersion = (user.tokenVersion || 0) + 1
            await user.save({ session })
            await audit(
                req,
                'update-access',
                'user',
                user,
                {
                    before: {
                        role: before.role,
                        active: before.active,
                        assignedCamps: before.assignedCamps,
                    },
                    after: data,
                },
                session,
            )
            return user
        })
        res.json(publicUser(updated))
    }),
)
router.post(
    '/:id/reset-password',
    handle(async (req, res) => {
        if (
            typeof req.body.temporaryPassword !== 'string' ||
            req.body.temporaryPassword.length < 10
        )
            throw new HttpError(
                400,
                'Use a temporary password of at least 10 characters.',
            )
        if (idOf(req.user) === req.params.id)
            throw new HttpError(
                400,
                'Use Change password for your own account.',
            )
        const user = await transaction(async (session) => {
            const target = await User.findById(req.params.id).session(session)
            if (!target) throw new HttpError(404, 'User not found.')
            target.password = req.body.temporaryPassword
            target.mustChangePassword = true
            target.tokenVersion = (target.tokenVersion || 0) + 1
            await target.save({ session })
            await audit(req, 'reset-password', 'user', target, {}, session)
            return target
        })
        res.json(publicUser(user))
    }),
)
module.exports = router
