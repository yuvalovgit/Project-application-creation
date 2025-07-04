const express = require('express');
const router = express.Router();

const {
  getUserProfile,
  updateUserProfile,
  followUser,
  getUserPosts  // הוספתי את הפונקציה הזו
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// נתיב לקבלת פרופיל משתמש לפי מזהה (userId)
router.get('/:userId', authMiddleware, getUserProfile);

// נתיב לקבלת כל הפוסטים של משתמש לפי מזהה (userId)
router.get('/:userId/posts', authMiddleware, getUserPosts);

// נתיב לעדכון פרופיל משתמש (כולל תמונת פרופיל בשם השדה 'avatar')
router.put('/:userId', authMiddleware, upload.single('avatar'), updateUserProfile);

// נתיב למעקב אחרי משתמש או ביטול מעקב
router.post('/:userId/follow', authMiddleware, followUser);

module.exports = router;
