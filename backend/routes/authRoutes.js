const express = require('express');
const { registerUser, loginUser, logoutUser, refreshToken, forgotPassword, googleAuth } = require('../controllers/authController');

const router = express.Router();
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/google', googleAuth);

module.exports = router;
