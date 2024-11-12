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
const { isAuth } = require('../config/isAuth');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    credentials: true,
}));



const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT'],
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
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ fileUrl });
});

// Serve static files in the uploads directory
app.use('/uploads', express.static('uploads'));


// Socket.io connection
io.on('connection', async (socket) => {

    console.log('New client connected:', socket.id);

    // Listen for new messages
    socket.on('sendMessage', async (data) => {
        try {
            const { senderId, content } = data;
            console.log("Received data:", data);
            console.log(data);
            // Create and save the message
            const message = new Message({
                sender: senderId,
                content: content,
            });

            const savedMessage = await message.save();
            console.log("Message saved:", savedMessage);

            // Emit the saved message to all clients
            io.emit('receiveMessage', savedMessage);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    });

    // Handle file transfer (image, video, PDF, etc.)
    socket.on('sendFile', async (fileData) => {
        // Send the file metadata and URL to all connected clients
        try {
            const message = new Message({
                sender: fileData.senderId,
                content: {
                    fileName: fileData.fileName,
                    fileUrl: fileData.fileUrl
                },
            });

            const savedMessage = await message.save();
            console.log("Message saved:", savedMessage);
            io.emit('receiveFile', {
                senderId: fileData.senderId,
                fileName: fileData.fileName,
                fileUrl: fileData.fileUrl
            });
        } catch (error) {
            console.log(error);
        }

    });

    // Handle voice and video call requests
    socket.on('callUser', (data) => {
        io.to(data.userToCall).emit('callUser', {
            signal: data.signalData,
            from: data.from,
            name: data.name,
        });
    });

    socket.on('answerCall', (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
    });

    // Handle call disconnection
    socket.on('disconnectCall', (data) => {
        const { senderId } = data;
        console.log(`User ${senderId} disconnected the call`);
        // Notify the other user about call disconnection
        socket.broadcast.emit('callDisconnected');
    });

    // Disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

app.get('/chat', async (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
