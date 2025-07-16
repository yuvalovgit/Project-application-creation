const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const User = require('../models/user');

// NEW: Search Users route (partial match by username, filter by group/date)
router.get('/search', authMiddleware, async (req, res) => {
  const { username, group, date } = req.query;
  const query = {};

  if (username) {
    query.username = { $regex: username, $options: 'i' }; // Partial, case-insensitive match
  }

  if (group) {
    query.groups = group;
  }

  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed)) query.createdAt = { $gte: parsed };
  }

  try {
    const users = await User.find(query).select('username email createdAt groups');
    res.json(users);
  } catch (err) {
    console.error('User search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// EXISTING ROUTES
const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts,
  getAllUsers
} = require('../controllers/userController');

router.get('/', authMiddleware, getAllUsers); // all users
router.get('/:userId', authMiddleware, getUserProfile);
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);
router.post('/:userId/follow', authMiddleware, followUser);
router.get('/:userId/posts', authMiddleware, getUserPosts);

module.exports = router;
