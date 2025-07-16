const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  topic: { type: String },
  image: { type: String, default: '/uploads/default-avatar.png' },    // תמונת פרופיל
  cover: { type: String, default: '/uploads/default-cover.jpg' },      // תמונת נושא (Cover)

  // חברים רשומים
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],

  // מי יצר את הקבוצה
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // האם קבוצה פרטית?
  isPrivate: {
    type: Boolean,
    default: false
  },

  // בקשות הצטרפות שממתינות לאישור (אם פרטי)
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true // מוסיף createdAt ו־updatedAt
});

module.exports = mongoose.model('Group', GroupSchema);
