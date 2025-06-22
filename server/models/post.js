const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  content: String,
  image: String,
  video: String,
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
