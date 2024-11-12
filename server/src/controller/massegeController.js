const Message = require("../model/massege");
const { findById } = require("../model/user");

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
        const sender = req.params.msgId;

        // Ensure senderId is provided
        if (!sender) {
            return res.status(400).json({ message: 'Sender ID is required' });
        }

        // Query to find messages by senderId
        const userMsg = await Message.find({ sender })
            .populate("sender", "fullName email")
            .exec();

        if (userMsg.length === 0) {
            return res.status(404).json({ message: 'No messages found for this sender' });
        }

        // Return the messages
        return res.status(200).json({ messages: userMsg });
    } catch (error) {
        console.error(error);
        // Handle errors by returning a 500 status code
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
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
    getMsgBysenderId
};