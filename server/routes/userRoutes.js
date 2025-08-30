const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const User = require('../models/user');

// 🌐 ייבוא כל הפונקציות מה־controller
const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts,
  getAllUsers,
  deleteMyAccount,
  getSuggestedUsers   // ✅ הוספנו
} = require('../controllers/userController');


// 🔍 חיפוש משתמשים לפי פרמטרים
router.get('/search', authMiddleware, async (req, res) => {
  const { username, group, date } = req.query;
  const query = {};

  if (username) {
    query.username = { $regex: username, $options: 'i' }; // חיפוש חלקי בלי תלות באותיות קטנות/גדולות
  }

  if (group) {
    query.groups = group;
  }

  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed)) query.createdAt = { $gte: parsed };
  }

  try {
    const users = await User.find(query).select('username avatar email createdAt groups');
    res.json(users);
  } catch (err) {
    console.error('User search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});


// 🆕 הצעות משתמשים רנדומליות (5)
router.get('/suggestions/random', authMiddleware, getSuggestedUsers);


// 🆕 העלאת תמונת פרופיל (avatar)
router.post('/:userId/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});


// --- CRUD למשתמשים ---
router.get('/', authMiddleware, getAllUsers);
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);
router.post('/:userId/follow', authMiddleware, followUser);
router.get('/:userId/posts', authMiddleware, getUserPosts);
router.get('/:userId', authMiddleware, getUserProfile); // ✅ אחרון כדי לא לבלוע ראוטים אחרים
router.get('/suggestions/random', authMiddleware, getSuggestedUsers);


// 🗑️ מחיקת החשבון העצמי
router.delete('/me', authMiddleware, deleteMyAccount);

module.exports = router;
