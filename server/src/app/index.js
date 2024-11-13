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



// Socket.io connection
io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);

    socket.on("joinRoom", (options, callback) => {
        const { userId, room } = options;
        socket.join(room);

        // Welcome the new user
        socket.emit("message", { sender: "user", content: "Welcome!" });

        // Notify others in the room
        socket.broadcast.to(room).emit("message", {
            sender: "Admin",
            content: `${userId} has joined the room!`
        });

        // Send updated room data
        io.to(room).emit("roomData", {
            room: room,
            users: room
        });

    });

    // Listen for new messages

    socket.on('sendMessage', async (data) => {
        try {
            const { senderId, receiverId, content } = data;

            if (!senderId || !receiverId) {
                return res.status(400).json({ message: 'Both sender and receiver IDs are required' });
            }

            const message = new Message({
                senderId: senderId,
                receiverId: receiverId,
                content: content,
            });

            const savedMessage = await message.save();

            // Find or create a conversation between the sender and receiver
            const conversation = await Conversation.findOneAndUpdate(
                { participants: { $all: [senderId, receiverId] } },
                {
                    $set: {
                        lastMessage: savedMessage._id,
                        updatedAt: new Date()
                    }
                },
                {
                    upsert: true,     // Create a new document if no match is found
                    new: true          // Return the updated document
                }
            );
            console.log(conversation);



            // Retrieve the conversation messages
            const userMessages = await Message.find({
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            })
                .populate("senderId", "fullName email")
                .populate("receiverId", "fullName email")
                .exec();

            socket.emit('receiveMessage', { data: userMessages });

            socket.to(receiverId).emit('receiveMessage', { data: userMessages });

        } catch (error) {
            console.error("Error saving message:", error);
        }
    });


    // Handle file transfer (image, video, PDF, etc.)
    socket.on('sendFile', async (fileData) => {
        try {
            const { senderId, receiverId, fileName, fileUrl, fileType } = fileData;
            console.log("Received file data:", fileData);

            // Create and save the file message with sender and receiver IDs
            const fileMessage = new Message({
                senderId: senderId,
                receiverId: receiverId,
                content: fileName,
                fileUrl: fileUrl,
                messageType: fileType,
            });

            const savedFileMessage = await fileMessage.save();
            // console.log("File message saved:", savedFileMessage);
            const userMsg = await Message.find({
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            })
                .populate("senderId", "fullName email")
                .populate("receiverId", "fullName email")
                .exec();
            // socket.to(receiverId).emit('receiveMessage', userMsg);
            socket.emit('receiveFile', { data: userMsg });
            // Emit the file message to the intended receiver only
            // io.to(receiverId).emit('receiveFile', {
            //     senderId,
            //     receiverId,
            //     fileName,
            //     fileUrl,
            // });
        } catch (error) {
            console.log("Error saving file message:", error);
        }
    });

    // Handle voice and video call requests
    socket.on('callUser', (data) => {
        const { userToCall, signalData, from, name } = data;
        console.log("Call request from:", from, "to:", userToCall);

        // Emit call request to the user being called
        io.to(userToCall).emit('callUser', {
            signal: signalData,
            from: from,
            name: name,
        });
    });

    // Handle answer to call request
    socket.on('answerCall', (data) => {
        const { to, signal } = data;
        console.log("Answering call to:", to);

        // Emit call acceptance to the caller
        io.to(to).emit('callAccepted', signal);
    });

    // Handle call disconnection
    socket.on('disconnectCall', (data) => {
        const { senderId, receiverId } = data;
        console.log(`User ${senderId} disconnected the call`);

        // Notify the other user about call disconnection
        io.to(receiverId).emit('callDisconnected', { senderId });
    });

    // Handle disconnect event
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
