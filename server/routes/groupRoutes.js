// routes/groupRoutes.js
const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload         = require('../middleware/multerConfig');

// const validateObjectId = require('../middleware/validateObjectId'); // אם יש לך

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
  removeMember,
  deleteGroup
} = require('../controllers/groupController');

// 🔍 Search groups
router.get('/search', authMiddleware, searchGroups);

// 📂 Get my groups
router.get('/mine', authMiddleware, getMyGroups);

// 📋 Get all groups
router.get('/', authMiddleware, getGroups);

// ➕ Create group  (שדה קובץ: 'image')
router.post(
  '/create',
  authMiddleware,
  upload.single('image'),
  createGroup
);

// ✅ Join group
router.post('/join', authMiddleware, joinGroup);

// ❌ Leave group
router.post('/leave', authMiddleware, leaveGroup);

// 📄 Get group by ID
// router.get('/:id', authMiddleware, validateObjectId('id'), getGroupById);
router.get('/:id', authMiddleware, getGroupById);

// 📥 Get all posts in the group
// router.get('/:id/posts', authMiddleware, validateObjectId('id'), getGroupPosts);
router.get('/:id/posts', authMiddleware, getGroupPosts);

// 🛠️ Update group details (admin only)  (שדה קובץ: 'image')
router.patch(
  '/:id',
  authMiddleware,
  // validateObjectId('id'),
  upload.single('image'),
  updateGroup
);

// ✅ Approve join request (admin only)
// router.post('/:id/approve', authMiddleware, validateObjectId('id'), approveJoinRequest);
router.post('/:id/approve', authMiddleware, approveJoinRequest);

// 🗑️ Delete a post in group (admin or author)
// router.delete('/:id/posts/:postId', authMiddleware, validateObjectId('id'), validateObjectId('postId'), deleteGroupPost);
router.delete('/:id/posts/:postId', authMiddleware, deleteGroupPost);

// 🗑️ Delete group (admin only)
// router.delete('/:id', authMiddleware, validateObjectId('id'), deleteGroup);
router.delete('/:id', authMiddleware, deleteGroup);

// 👤 Remove member (admin only)
// router.patch('/:id/remove-member', authMiddleware, validateObjectId('id'), removeMember);
router.patch('/:id/remove-member', authMiddleware, removeMember);

/* === Image upload/remove endpoints ===
   שים לב: משתמשים בשמות השדות 'image' לתמונת פרופיל קבוצה
   ו-'cover' לתמונת קאבר, כדי להיות עקביים.
*/

// Profile image (field: 'image')
router.post(
  '/:id/profile-upload',
  authMiddleware,
  // validateObjectId('id'),
  upload.single('image'),
  uploadProfileImage
);
router.delete(
  '/:id/profile-remove',
  authMiddleware,
  // validateObjectId('id'),
  removeProfileImage
);

// Cover image (field: 'cover')
router.post(
  '/:id/cover-upload',
  authMiddleware,
  // validateObjectId('id'),
  upload.single('cover'),
  uploadCoverImage
);
router.delete(
  '/:id/cover-remove',
  authMiddleware,
  // validateObjectId('id'),
  removeCoverImage
);

module.exports = router;
