// models/Post.js
const mongoose = require('mongoose');

// Subdocument: comment
const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Post with likes & comments
const PostSchema = new mongoose.Schema({
  content: String,
  image:   String,
  video:   String,
  group:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:[commentSchema],
  createdAt:{ type: Date, default: Date.now }
});

// Avoid OverwriteModelError during dev/hot reload
module.exports = mongoose.models.Post || mongoose.model('Post', PostSchema);
