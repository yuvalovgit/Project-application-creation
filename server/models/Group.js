const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  topic: { type: String, default: 'general' },

  // 👇 ברירת מחדל יותר מתאימה לקבוצה
  image: { type: String, default: '/uploads/default-group.png' },
  cover: { type: String, default: '/uploads/default-cover.jpg' },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],

  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },

  isPrivate: { type: Boolean, default: false },
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.models.Group || mongoose.model('Group', GroupSchema);
