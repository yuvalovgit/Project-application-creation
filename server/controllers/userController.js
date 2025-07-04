const User = require('../models/user');
const Post = require('../models/post');

// מחזיר פרופיל משתמש עם נתונים (ללא סיסמה)
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// מחזיר את כל הפוסטים של משתמש לפי מזהה (עם פרטים מלאים)
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId;

    // מחפש פוסטים של המשתמש, ממיין לפי תאריך מהחדש לישן, כולל פרטי מחבר, תגובות ולייקים
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({
        path: 'comments.author',
        select: 'username avatar'
      });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// עדכון פרופיל משתמש (כולל טיפול בתמונת פרופיל שנבחרה)
exports.updateUserProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // אם התקבל קובץ תמונה (avatar), מעדכנים את הנתיב בתמונת הפרופיל
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true })
      .select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// לוגיקה למעקב/הסרת מעקב בין משתמשים
exports.followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToFollow._id.equals(currentUser._id)) {
      return res.status(400).json({ message: "Can't follow yourself" });
    }

    const isFollowing = currentUser.following.some(followingId => followingId.equals(userToFollow._id));

    if (isFollowing) {
      // ביטול מעקב
      currentUser.following = currentUser.following.filter(followingId => !followingId.equals(userToFollow._id));
      userToFollow.followers = userToFollow.followers.filter(followerId => !followerId.equals(currentUser._id));
    } else {
      // התחלת מעקב
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({ message: 'Follow status updated', followed: !isFollowing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
