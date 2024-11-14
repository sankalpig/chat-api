
const bcrypt = require('bcrypt');
const User = require('../model/user');
const jwt = require('jsonwebtoken');

const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(201).json({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(201).json({
                message: "Invalid password"
            });
        }

        const token = jwt.sign(
            { user: user },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            message: "Login successful",
            token
        });
    } catch (error) {
        console.error("Internal Error:", error);
        res.status(500).json({
            message: "Internal error",
            error: error.message
        });
    }
};

const userRegister = async (req, res) => {
    try {
        const { fullName, Number, username, email, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(201).json({
                message: "Email or username already exists"
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            fullName: fullName,
            Number: Number,
            username: username,
            email: email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({
            message: "User registered successfully",
            user: { id: newUser._id, fullName: newUser.fullName, username: newUser.username, email: newUser.email }
        });
    } catch (error) {
        res.send({
            massege: "internal Error",
            erorr: error
        });
    }
};


const getAllusers = async (req, res) => {
    try {
        const userData = await User.find();
        res.send({
            message: "successs",
            userData: userData
        });
    } catch (error) {
        res.send({
            message: "internal error",
            error: error
        });
    }
};
const deleteUsersById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(200).json({
            message: 'User deleted successfully',
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
};
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(200).json({
            message: 'User fetched successfully',
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

const archiveChat = async (req, res) => {
    try {
        const { id } = req.params;

        const chat = await User.findById(id);

        if (!chat) {
            return res.status(404).json({
                message: 'Chat not found'
            });
        }

        chat.isArchive = true;
        await chat.save();

        res.status(200).json({
            message: 'Chat archived successfully',
            chat: chat
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};




module.exports = {
    userLogin,
    userRegister,
    getAllusers,
    getAllusers,
    deleteUsersById,
    getUserById,
    archiveChat
};