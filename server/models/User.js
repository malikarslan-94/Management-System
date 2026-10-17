const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'camp_manager', 'reception', 'viewer'],
            default: 'viewer',
        },
        assignedCamps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Camp' }],
        active: { type: Boolean, default: true },
        mustChangePassword: { type: Boolean, default: false },
        tokenVersion: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
)

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()

    try {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
        next()
    } catch (error) {
        next(error)
    }
})

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', userSchema)
