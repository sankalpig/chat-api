import { io } from "socket.io-client";

// Initialize socket connection
const socket = io("http://localhost:5000");

export const setupSocket = (userId) => {
    socket.emit("joinRoom", userId);

    socket.on("receiveMessage", (message) => {
        console.log(message);
    });

    socket.on("receiveFile", (fileData) => {
        console.log(fileData);
    });

    socket.on("callUser", (data) => {
        console.log("Incoming Call:", data);
    });

    socket.on("callAccepted", (signal) => {
        console.log("Call Accepted:", signal);
    });

    socket.on("callDisconnected", () => {
        console.log("Call Disconnected");
    });
};

export const sendMessage = (message) => {
    socket.emit("sendMessage", message);
};

export const sendFile = (fileData) => {
    socket.emit("sendFile", fileData);
};

// Export socket instance to be used directly
export { socket };
