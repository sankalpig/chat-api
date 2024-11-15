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
// File type validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'audio/mpeg',
        'video/mp4',
        'video/avi',
        'video/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images, PDFs, MP3s, and videos are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

// Endpoint to handle file uploads from users
app.post('/upload', upload.single('file'), isAuth, (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded or invalid file type');
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ fileUrl });
});

// Error handling middleware for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only images, PDFs, MP3s, and videos are allowed') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});


app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }

    // Get the file extension to determine if it's a media file
    const fileExtension = path.extname(filename).toLowerCase();
    const mediaTypes = ['.mp4', '.webm', '.mp3', '.wav']; // Video and audio formats

    if (mediaTypes.includes(fileExtension)) {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Handle range requests for streaming
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const fileStream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': getContentType(fileExtension),
            });
            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': getContentType(fileExtension),
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } else {
        // For non-media files, serve as a regular download
        res.sendFile(filePath);
    }
});

// Helper function to determine Content-Type based on file extension
function getContentType(extension) {
    switch (extension) {
        case '.mp4':
            return 'video/mp4';
        case '.webm':
            return 'video/webm';
        case '.mp3':
            return 'audio/mpeg';
        case '.wav':
            return 'audio/wav';
        default:
            return 'application/octet-stream';
    }
}

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
