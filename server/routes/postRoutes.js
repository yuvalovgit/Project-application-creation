const express = require('express');
const router = express.Router();
const {
  createPost,
  getFeed,
  likePost,
  addComment,  // הוספת פונקציית התגובות
} = require('../controllers/postcontroller');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// יצירת פוסט עם תמונה
router.post('/', authMiddleware, upload.single('image'), createPost);

// נתיב GET לפיד החכם (פוסטים של עוקבים)
router.get('/feed', authMiddleware, getFeed);

// נתיב POST ללייק/ביטול לייק על פוסט
router.post('/:postId/like', authMiddleware, likePost);

// נתיב POST להוספת תגובה לפוסט
router.post('/:postId/comments', authMiddleware, addComment);

module.exports = router;
