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
 HEAD
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// תומך גם ב-image וגם ב-video תחת השם הכללי 'file'
router.post('/', authMiddleware, upload.single('file'), createPost);


router.get('/feed', authMiddleware, getFeed);
router.get('/:postId', authMiddleware, getSinglePost);
router.post('/:postId/like', authMiddleware, likePost);
router.post('/:postId/comments', authMiddleware, addComment);
router.delete('/:postId', authMiddleware, deletePost);

module.exports = router;
