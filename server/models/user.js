const mongoose = require('mongoose');

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  password: { type: String, required: true },

  // אם תרצה מייל ייחודי: unique:true + sparse:true כדי לאפשר null/ריק
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },

  // נשמר בשם 'fullname' בבסיס הנתונים, ויש וירטואל fullName למטה
  fullname: { type: String, trim: true },

  avatar: { type: String, default: '/uploads/default-avatar.png' },

  bio: { type: String, trim: true },
  location: { type: String, trim: true },

  isAdmin: { type: Boolean, default: false },

  followers: [{ type: ObjectId, ref: 'User', default: [] }],
  following: [{ type: ObjectId, ref: 'User', default: [] }],

  postsCount: { type: Number, default: 0 },

  groups: [{ type: ObjectId, ref: 'Group', default: [] }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

/* Virtual: fullName ↔ fullname
   מאפשר להשתמש ב-fullName בפרונט, תוך שמירה בבסיס הנתונים בשדה fullname. */
UserSchema.virtual('fullName')
  .get(function () { return this.fullname; })
  .set(function (v) { this.fullname = v; });

module.exports = mongoose.model('User', UserSchema);
