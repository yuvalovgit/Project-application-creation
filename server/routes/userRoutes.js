const express = require('express');
const router = express.Router();


const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts,
  getAllUsers,
  deleteUser,
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const { get } = require('mongoose');

//  /api/users/ and then the rest of the path

router.get('/',authMiddleware, getAllUsers); // Route to get all users for monitoring or admin purposes
router.get('/:userId', authMiddleware, getUserProfile);
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);
router.post('/:userId/follow', authMiddleware, followUser);
router.get('/:userId/posts', authMiddleware, getUserPosts);
router.delete('/:userId',deleteUser); //deleting a user by ID

module.exports = router;
