// routes/groupRoutes.js

const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload         = require('../middleware/multerConfig');
const {
  createGroup,
  joinGroup,
  getGroups,
  getMyGroups,
  leaveGroup,
  getGroupById,
  searchGroups,
  updateGroup,
  approveJoinRequest,
  deleteGroupPost,
  getGroupPosts,
  uploadProfileImage,
  removeProfileImage,
  uploadCoverImage,
  removeCoverImage,
  removeMember 
} = require('../controllers/groupController');


// 🔍 Search groups
router.get('/search', authMiddleware, searchGroups);

// ➕ Create group (with optional image upload)
router.post('/create', authMiddleware, upload.single('image'), createGroup);

// ✅ Join group
router.post('/join', authMiddleware, joinGroup);

// ❌ Leave group
router.post('/leave', authMiddleware, leaveGroup);

// 📋 Get all groups
router.get('/', authMiddleware, getGroups);

// 📂 Get my groups
router.get('/mine', authMiddleware, getMyGroups);

// 📄 Get group by ID
router.get('/:id', authMiddleware, getGroupById);

// 📥 Get all posts in the group
router.get('/:id/posts', authMiddleware, getGroupPosts);

// 🛠️ Update group details (admin only, can upload new image)
router.patch('/:id', authMiddleware, upload.single('image'), updateGroup);

// ✅ Approve join request (admin only)
router.post('/:id/approve', authMiddleware, approveJoinRequest);

// 🗑️ Delete a post in group (admin or author)
router.delete('/:id/posts/:postId', authMiddleware, deleteGroupPost);

router.patch('/:id/remove-member', authMiddleware, removeMember);

// === Image upload/remove endpoints ===

// Profile image
router.post(
  '/:id/profile-upload',
  authMiddleware,
  upload.single('groupImage'),
  uploadProfileImage
);
router.delete(
  '/:id/profile-remove',
  authMiddleware,
  removeProfileImage
);

// Cover image
router.post(
  '/:id/cover-upload',
  authMiddleware,
  upload.single('groupCover'),
  uploadCoverImage
);
router.delete(
  '/:id/cover-remove',
  authMiddleware,
  removeCoverImage
);

module.exports = router;
