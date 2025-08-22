const express = require('express');
const { register, login, getMe, logout, forgotPassword, resetPassword, updateProfile, deleteAccount } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);
router.get('/logout', protect, logout);

module.exports = router;
// work done is complete