const Message = require("../model/massege");
const { findById } = require("../model/user");
const Conversation = require("../model/converstion");
const fs = require('fs');
const path = require('path');
const { moveFile } = require("../lib/kit");

const getTheMassege = async (req, res) => {
    try {
        const messages = await Message.find().populate('sender');
        res.json(messages);
    } catch (error) {
        res.send({
            error: error,
            massege: 'internal error'
        });
    }
};

const getMsgBysenderId = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        // Ensure senderId is provided
        if (!senderId) {
            return res.status(201).json({ message: 'Sender ID is required' });
        }

        // Query to find messages by senderId
        const userMsg = await Message.find({
            $or: [
                { senderId: senderId, receiverId: receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        })
            .populate("senderId", "fullName email")
            .populate("receiverId", "fullName email")
            .exec();

        if (userMsg.length === 0) {
            return res.status(201).json({ message: 'No messages found for this sender' });
        }

        // Return the messages
        return res.status(200).json({ data: userMsg });
    } catch (error) {
        console.error(error);
        // Handle errors by returning a 500 status code
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getConversationsData = async (req, res) => {
    try {
        const { userId, otherUserId } = req.query;
        try {
            let conversations;

            if (userId && otherUserId) {
                // Get conversation between two specific users
                conversations = await conversations.findOne({
                    participants: { $all: [userId, otherUserId] }
                })
                    .populate('participants', 'fullName email')  // Populate participant details
                    .populate('lastMessage');                     // Populate the last message
            } else if (userId) {
                // Get all conversations for a particular user
                conversations = await Conversation.find({
                    participants: userId
                })
                    .populate('participants', 'fullName email')
                    .populate('lastMessage')
                    .sort({ updatedAt: -1 }); // Sort by the latest update
            } else {
                return res.status(400).json({ error: 'userId is required' });
            }

            res.status(200).json({ conversations });
        } catch (error) {
            console.error('Error fetching conversations:', error);
            res.status(500).json({ error: 'Internal server error' });
        }

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};





const deleteMessage = async (req, res) => {
    try {
        const { msgId } = req.params;

        // Find the message by ID
        const message = await Message.findByIdAndDelete(msgId);

        // If the message doesn't exist, return an error
        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            });
        }

        // Check if the message has a fileUrl (it means there's a file associated with it)
        if (message.fileUrl) {
            const filePath = path.join(__dirname, '../app/uploads', message.fileUrl.split('/').pop()); // Assuming 'uploads' folder stores your files
            console.log(filePath);
            // Check if the file exists and delete it
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    // const sourceFilePath = path.join(__dirname, '../app/uploads', message.fileUrl.split('/').pop());
                    // const destinationFilePath = path.join(__dirname, '../app/logsFile', message.fileUrl.split('/').pop());

                    // // Move the file
                    // moveFile(sourceFilePath, destinationFilePath);

                    console.log('File deleted successfully:', filePath);
                }
            });
        }

        // Return success response
        res.status(200).json({
            message: 'Message deleted successfully',
            messageData: message
        });

    } catch (error) {
        res.status(500).json({
            message: 'Internal error',
            error: error.message
        });
    }
};


module.exports = {
    getTheMassege,
    deleteMessage,
    getMsgBysenderId,
    getConversationsData
};