const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createGroup,
  joinGroup,
  getGroups,
  getMyGroups,
  leaveGroup
} = require('../controllers/groupController');

router.post('/create', authMiddleware, createGroup);
router.post('/join', authMiddleware, joinGroup);
router.post('/leave', authMiddleware, leaveGroup);
router.get('/', authMiddleware, getGroups);
router.get('/mine', authMiddleware, getMyGroups);

module.exports = router;
