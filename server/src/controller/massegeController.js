const Message = require("../model/massege");
const { findById } = require("../model/user");
const Conversation = require("../model/converstion");

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

        const mesaage = await Message.findByIdAndDelete(msgId);

        if (!mesaage) {
            return res.status(404).json({
                message: 'mesaage not found'
            });
        }

        res.status(200).json({
            message: 'mesaage deleted successfully',
            mesaage: mesaage
        });

    } catch (error) {
        res.send({
            message: 'internal error ',
            error: error
        });
    }
};


module.exports = {
    getTheMassege,
    deleteMessage,
    getMsgBysenderId,
    getConversationsData
};