const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const {
  createPost,
  getFeed,
  getSinglePost,
  likePost,
  addComment,
  deletePost
} = require('../controllers/postcontroller');

// יצירת פוסט עם קובץ (תמונה / וידאו)
router.post('/', authMiddleware, upload.single('file'), createPost);

// פעולות על הפיד והפוסטים
router.get('/feed', authMiddleware, getFeed);
router.get('/:postId', authMiddleware, getSinglePost);
router.post('/:postId/like', authMiddleware, likePost);
router.post('/:postId/comments', authMiddleware, addComment);
router.delete('/:postId', authMiddleware, deletePost);

module.exports = router;
