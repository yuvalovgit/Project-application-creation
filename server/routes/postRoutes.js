const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');
const {
  createPost,
  getFeed,
  likePost,
  addComment,
  deletePost
} = require('../controllers/postcontroller');

router.post('/', authMiddleware, upload.single('image'), createPost);
router.get('/feed', authMiddleware, getFeed);
router.post('/:postId/like', authMiddleware, likePost);
router.post('/:postId/comments', authMiddleware, addComment);
router.delete('/:postId', authMiddleware, deletePost);

module.exports = router;
