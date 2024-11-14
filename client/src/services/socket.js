import { io } from "socket.io-client";

// Initialize socket connection
const socket = io("http://localhost:5000");
const token = localStorage.getItem('token');
export const setupSocket = ({ senderId, receiverId }) => {
    socket.emit("joinRoom", { token, senderId, receiverId });

    socket.on("message", (message) => {
        console.log("New message:", message);
    });

    socket.on("receiveFile", (fileData) => {
        console.log("Received file:", fileData);
    });

    socket.on("callUser", (data) => {
        console.log("Incoming Call:", data);
    });

    socket.on("callAccepted", (signal) => {
        console.log("Call Accepted:", signal);
    });
};

export const sendMessage = ({ senderId, receiverId, content }) => {
    socket.emit("sendMessage", { senderId, receiverId, content });
};

export const sendFile = ({ senderId, receiverId, fileName, fileUrl, fileType }) => {
    socket.emit("sendFile", { senderId, receiverId, fileName, fileUrl, fileType });
};


// Export socket instance to be used directly
export { socket };
