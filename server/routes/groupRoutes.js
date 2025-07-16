const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createGroup,
  joinGroup,
  getGroups,
  getMyGroups
} = require('../controllers/groupController');

router.post('/create', authMiddleware, createGroup);
router.post('/join', authMiddleware, joinGroup);
router.get('/', authMiddleware, getGroups);
router.get('/mine', authMiddleware, getMyGroups); // ✅ this supports group select dropdown in frontend

module.exports = router;
