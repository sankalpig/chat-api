const express = require('express');
const router = express.Router();
const { userLogin, userRegister, getAllusers, deleteUsersById, getUserById, archiveChat } = require('../controller/userController');
const { getTheMassege, deleteMessage, getMsgBysenderId, getConversationsData } = require('../controller/massegeController');
const { isAuth } = require('../config/isAuth');

// Register a new user
router.post('/users/login', userLogin);
router.post('/users/register', userRegister);
router.get('/users/get-all-users', isAuth, getAllusers);
router.delete('/users/delete', isAuth, deleteUsersById);
router.get('/users/:id', isAuth, getUserById);
router.get('/users/:id', isAuth, archiveChat);

// Get all messages
router.get('/messages', isAuth, getTheMassege);
router.delete('/messages/delete/:msgId', isAuth, deleteMessage);
router.post('/messages/msg', isAuth, getMsgBysenderId);
router.post('/conversations', isAuth, getConversationsData);

module.exports = router;
