const express = require('express');
const router = express.Router();

const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts,
  getAllUsers
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const { get } = require('mongoose');

router.get('/',authMiddleware, getAllUsers); // Route to get all users for monitoring or admin purposes
router.get('/:userId', authMiddleware, getUserProfile);
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);
router.post('/:userId/follow', authMiddleware, followUser);
router.get('/:userId/posts', authMiddleware, getUserPosts);

module.exports = router;
