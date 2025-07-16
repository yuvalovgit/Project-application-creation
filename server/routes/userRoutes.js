const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const User = require('../models/user');

<<<<<<< HEAD

=======
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
>>>>>>> f4bb1eda68c4b13ee82a6c6099e750f1e401390c
const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts,
  getAllUsers,
  deleteUser,
} = require('../controllers/userController');

<<<<<<< HEAD
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const { get } = require('mongoose');

//  /api/users/ and then the rest of the path

router.get('/',authMiddleware, getAllUsers); // Route to get all users for monitoring or admin purposes
=======
router.get('/', authMiddleware, getAllUsers); // all users
>>>>>>> f4bb1eda68c4b13ee82a6c6099e750f1e401390c
router.get('/:userId', authMiddleware, getUserProfile);
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);
router.post('/:userId/follow', authMiddleware, followUser);
router.get('/:userId/posts', authMiddleware, getUserPosts);
router.delete('/:userId',deleteUser); //deleting a user by ID

module.exports = router;
