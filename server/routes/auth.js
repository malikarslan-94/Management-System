const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Settings = require('../models/OrganizationSettings')
const { handle, HttpError, text } = require('../lib/http')
const { publicUser, authenticate } = require('../lib/access')
const { transaction } = require('../lib/transaction')
const router = express.Router()
function response(req, user) {
    return {
        token: jwt.sign(
            { userId: String(user._id), version: user.tokenVersion || 0 },
            req.app.locals.jwtSecret,
            { expiresIn: '24h' },
        ),
        user: publicUser(user),
    }
}
router.post(
    '/sign-in',
    handle(async (req, res) => {
        const login = text(req.body.user)
        const user = await User.findOne({
            $or: [{ email: login.toLowerCase() }, { name: login }],
        })
        if (
            !user ||
            user.active === false ||
            typeof req.body.password !== 'string' ||
            !(await user.comparePassword(req.body.password))
        )
            throw new HttpError(401, 'Invalid sign-in details.')
        res.json(response(req, user))
    }),
)
// Public registration is bootstrap-only. Subsequent accounts are created by an administrator.
router.post(
    '/sign-up',
    handle(async (req, res) => {
        if (
            !text(req.body.name) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(req.body.email)) ||
            typeof req.body.password !== 'string' ||
            req.body.password.length < 10
        )
            throw new HttpError(
                400,
                'Enter a name, valid email, and a password of at least 10 characters.',
            )
        const user = await transaction(async (session) => {
            await Settings.findOneAndUpdate(
                { _id: 'organization' },
                { $inc: { accessRevision: 1 } },
                { upsert: true, session },
            )
            if (await User.exists({}).session(session))
                throw new HttpError(
                    403,
                    'Registration is closed. Ask your administrator to create an account.',
                )
            const [created] = await User.create(
                [
                    {
                        name: text(req.body.name),
                        email: text(req.body.email).toLowerCase(),
                        password: req.body.password,
                        role: 'admin',
                    },
                ],
                { session },
            )
            return created
        })
        res.status(201).json(response(req, user))
    }),
)
router.get(
    '/me',
    authenticate,
    handle(async (req, res) => {
        const settings = await Settings.findById('organization').lean()
        res.json({
            user: publicUser(req.user),
            settings: settings || {
                name: 'CampWise',
                timezone: 'Asia/Riyadh',
                dateFormat: 'DD MMM YYYY',
                logoUrl: '',
            },
        })
    }),
)
router.post(
    '/change-password',
    authenticate,
    handle(async (req, res) => {
        if (
            typeof req.body.password !== 'string' ||
            req.body.password.length < 10
        )
            throw new HttpError(
                400,
                'Use a password of at least 10 characters.',
            )
        if (req.body.password === req.body.currentPassword)
            throw new HttpError(400, 'Choose a new password.')
        const user = await transaction(async (session) => {
            const current = await User.findById(req.user._id).session(session)
            if (
                !(await current.comparePassword(
                    String(req.body.currentPassword || ''),
                ))
            )
                throw new HttpError(400, 'Current password is incorrect.')
            current.password = req.body.password
            current.mustChangePassword = false
            current.tokenVersion = (current.tokenVersion || 0) + 1
            await current.save({ session })
            return current
        })
        res.json(response(req, user))
    }),
)
router.post(
    '/sign-out',
    authenticate,
    handle(async (req, res) => {
        await User.updateOne(
            { _id: req.user._id },
            { $inc: { tokenVersion: 1 } },
        )
        res.json({ message: 'Signed out.' })
    }),
)
module.exports = router
