const express = require('express');
const router = express.Router();

const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

router.get('/:userId', authMiddleware, getUserProfile);
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);
router.post('/:userId/follow', authMiddleware, followUser);
router.get('/:userId/posts', authMiddleware, getUserPosts);

module.exports = router;
