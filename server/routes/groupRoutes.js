const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createGroup, joinGroup, getGroups } = require('../controllers/groupController');

router.post('/create', authMiddleware, createGroup);
router.post('/join', authMiddleware, joinGroup);
router.get('/', authMiddleware, getGroups);

module.exports = router;
