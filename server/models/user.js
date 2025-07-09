const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  fullname: { type: String },
  avatar: { type: String },
  bio: { type: String },
  location: { type: String },
  isAdmin:{type:Boolean, default:false},//admin user for dashboard
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // רשימת עוקבים
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // עוקב אחרי
  postsCount: { type: Number, default: 0 }, // כמות פוסטים

  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }]
});

module.exports = mongoose.model('User', UserSchema);
