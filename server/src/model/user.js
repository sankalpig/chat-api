const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    Number: { type: Number },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    lastMessage: { type: String, },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    isArchive: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
