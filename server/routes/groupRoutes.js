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
  getAdminGroups,   // ✅ חדש: קבוצות שאני האדמין שלהן
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
  removeMember,
  deleteGroup
} = require('../controllers/groupController');

/* --------- Non-parameterized routes (must appear before "/:id") --------- */

// 🔍 Search groups
router.get('/search', authMiddleware, searchGroups);

// 👑 Groups I created (I'm the admin)
router.get('/admin', authMiddleware, getAdminGroups);

// 📂 Groups I joined (but not admin) — aliases: /my and /mine
router.get('/my',   authMiddleware, getMyGroups);
router.get('/mine', authMiddleware, getMyGroups);

// 📋 Get all groups
router.get('/', authMiddleware, getGroups);

// ➕ Create group  (file field: 'groupImage')
router.post(
  '/create',
  authMiddleware,
  upload.single('groupImage'),
  createGroup
);

// ✅ Join / ❌ Leave
router.post('/join',  authMiddleware, joinGroup);
router.post('/leave', authMiddleware, leaveGroup);

/* -------------------------- Parameterized routes -------------------------- */

// 📄 Get group by ID
router.get('/:id', authMiddleware, getGroupById);

// 📨 Get all posts of a group
router.get('/:id/posts', authMiddleware, getGroupPosts);

// 🛠️ Update group (admin only) (file field: 'groupImage')
router.patch(
  '/:id',
  authMiddleware,
  upload.single('groupImage'),
  updateGroup
);

// ✅ Approve join request (admin only)
router.post('/:id/approve', authMiddleware, approveJoinRequest);

// 🗑️ Delete a post in group (admin or author)
router.delete('/:id/posts/:postId', authMiddleware, deleteGroupPost);

// 🗑️ Delete group (admin only)
router.delete('/:id', authMiddleware, deleteGroup);

// 👤 Remove member (admin only)
router.patch('/:id/remove-member', authMiddleware, removeMember);

/* -------------------------- Image upload/remove --------------------------- */
/* Note: consistent with multerConfig:
   'groupImage' → /uploads/groups
   'groupCover' → /uploads/covers
*/

// Profile image (field: 'groupImage')
router.post(
  '/:id/profile-upload',
  authMiddleware,
  upload.single('groupImage'),
  uploadProfileImage
);
router.delete('/:id/profile-remove', authMiddleware, removeProfileImage);

// Cover image (field: 'groupCover')
router.post(
  '/:id/cover-upload',
  authMiddleware,
  upload.single('groupCover'),
  uploadCoverImage
);
router.delete('/:id/cover-remove', authMiddleware, removeCoverImage);

module.exports = router;
