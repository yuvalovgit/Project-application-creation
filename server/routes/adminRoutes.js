const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/user');
const Post = require('../models/post');
const userController = require('../controllers/userController');

// routes for monitorin as admin

//checks how many users are registered
router.get('/stats/users', authMiddleware, adminMiddleware, async (req, res) => {
  const count = await User.countDocuments();
  res.json({ totalUsers: count });
});//get total numbers of users

router.get('/stats/posts-per-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('username');
    const posts = await Post.aggregate([
      { $group: { _id: '$author', count: { $sum: 1 } } }
    ]);
    // Map user IDs to post counts
    const postCountMap = {};
    posts.forEach(p => postCountMap[p._id] = p.count);

    // Build result: username and postCount for every user
    const result = users.map(u => ({
      username: u.username,
      postCount: postCountMap[u._id] || 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//users with locations
router.get('/stats/users-with-location', authMiddleware, adminMiddleware, userController.getUsersWithLocation);

// get posts per user
router.get('/stats/posts-per-day', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});// get posts per day


module.exports = router;