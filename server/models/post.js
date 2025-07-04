const mongoose = require('mongoose');

// מודל תגובה משני
const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// מודל פוסט כולל תגובות ולייקים
const PostSchema = new mongoose.Schema({
  content: String,
  image: String,
  video: String,
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // שדה לייקים
  comments: [commentSchema],                                       // שדה תגובות
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
