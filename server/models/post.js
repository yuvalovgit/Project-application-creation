const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  content: String,
  image: String,
  video: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
