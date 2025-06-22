const express = require('express');
const router = express.Router();
const { createPost } = require('../controllers/postcontroller');

router.post('/', createPost);

module.exports = router;
