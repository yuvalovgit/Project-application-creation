const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  fullname: { type: String },
avatar: { type: String, default: '/uploads/default-avatar.png' },
  bio: { type: String },
  location: { type: String },
  isAdmin: { type: Boolean, default: false },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  postsCount: { type: Number, default: 0 },

  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }]
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model('User', UserSchema);
