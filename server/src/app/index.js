require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const chatRoutes = require('../routes/chatRoutes');
const Message = require('../model/massege');
const { connectToDatabase } = require('../config/dbConfig');
const Conversation = require("../model/converstion");
const User = require("../model/user");
const { isAuth } = require('../config/isAuth');
const webPush = require('web-push');


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));



const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

app.use(express.json());
app.use('/api', chatRoutes);

connectToDatabase();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Endpoint to handle file uploads from users
app.post('/upload', upload.single('file'), isAuth, (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }


    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ fileUrl });
});

app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Check if the file exists before sending it
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ message: 'File not found' });
        }
    });
});

// Serve static files in the uploads directory
app.use('/uploads', express.static('uploads'));

var onlineUsers = [];
var offlineUsers = [];
io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);
    socket.on("joinRoom", async ({ token, senderId, receiverId }) => {
        try {
            const roomId = [senderId, receiverId].sort().join('-');
            socket.join(roomId);
            onlineUsers.push(senderId);
            offlineUsers[socket.id] = senderId;
            // console.log(offlineUsers);
            await User.findOneAndUpdate({ _id: senderId }, { isActive: true }, { new: true });
            socket.emit("message", { sender: "System", content: "private chat! ", soketId: roomId });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    });

    socket.on('sendMessage', async ({ senderId, receiverId, content }) => {
        try {
            const roomId = [senderId, receiverId].sort().join('-');
            const message = new Message({ senderId, receiverId, content });
            await message.save();

            const userMsg = await Message.find({
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            })
                .populate("senderId", "fullName email")
                .populate("receiverId", "fullName email")
                .exec();

            const checkuser = onlineUsers.some((el) => el === receiverId);
            if (!checkuser) {
                // Update the receiver's information in the database if they are online
                io.to(roomId).emit('receiveMessage', { data: userMsg });
                await User.findOneAndUpdate({ _id: receiverId }, { lastMessage: content }, { new: true });

            } else {
                // Emit the message to the room if the receiver is not online
                io.to(roomId).emit('receiveMessage', { data: userMsg });
            }

        } catch (error) {
            console.error("Error sending message:", error);
        }
    });

    socket.on('sendFile', async ({ senderId, receiverId, fileName, fileUrl, fileType }) => {
        try {
            const roomId = [senderId, receiverId].sort().join('-');
            const fileMessage = new Message({
                senderId: senderId,
                receiverId: receiverId,
                content: fileName,
                fileUrl: fileUrl,
                messageType: fileType,
            });
            await fileMessage.save();

            const userMsg = await Message.find({
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            })
                .populate("senderId", "fullName email")
                .populate("receiverId", "fullName email")
                .exec();

            const checkuser = onlineUsers.some((el) => el === receiverId);
            if (!checkuser) {
                // Update the receiver's information in the database if they are online
                io.to(roomId).emit('receiveFile', { data: userMsg });
                await User.findOneAndUpdate({ _id: receiverId }, { lastMessage: fileName }, { new: true });

            } else {
                // Emit the message to the room if the receiver is not online
                io.to(roomId).emit('receiveFile', { data: userMsg });
            }


        } catch (error) {
            console.error("Error sending file:", error);
        }
    });

    socket.on('callUser', ({ roomId, userToCall, signalData, from }) => {
        io.to(roomId).emit('callUser', { signal: signalData, from });
    });

    socket.on('answerCall', ({ to, signal }) => {
        io.to(to).emit('callAccepted', signal);
    });

    socket.on('disconnectCall', ({ senderId, receiverId }) => {
        const roomId = [senderId, receiverId].sort().join('-');
        io.to(roomId).emit('callDisconnected', { senderId });
    });

    socket.on('disconnect', async () => {
        await User.findOneAndUpdate({ _id: offlineUsers[socket.id] }, { isActive: false }, { new: true });
        io.emit("disconnect-user", socket.id);
        console.log('Client-disconnected', socket.id);
    });
});



const PORT = process.env.PORT || 5000;

app.get('/chat', async (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
