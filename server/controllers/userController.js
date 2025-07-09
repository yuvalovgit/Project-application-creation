const User = require('../models/user');
const Post = require('../models/post');

// קבלת פרופיל משתמש
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const postsCount = await Post.countDocuments({ author: user._id });

    res.json({ 
      ...user.toObject(),
      postsCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// finds all userse
exports.getAllUsers = async (req,res)=>{
try{
  const users = await User.find().select('-password'); // מביא משתשמשים ללא סיסמאות
  res.json(users);
} catch (err) {
  res.status(500).json({ error: err.message });
}
}

// עדכון פרופיל משתמש כולל תמונת פרופיל שמגיעה ב-req.file
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const updateData = { ...req.body };

    if (req.body.isAdmin !== undefined) {
  updateData.isAdmin = req.body.isAdmin;
}

    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    } else if (updateData.avatar === null) {
      updateData.avatar = null;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// מעקב/ביטול מעקב אחרי משתמש
exports.followUser = async (req, res) => {
  try {
    const userIdToFollow = req.params.userId;
    const currentUserId = req.user.id;

    if (userIdToFollow === currentUserId) return res.status(400).json({ message: 'Cannot follow yourself' });

    const userToFollow = await User.findById(userIdToFollow);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) return res.status(404).json({ message: 'User not found' });

    const isFollowing = currentUser.following.includes(userIdToFollow);

    if (isFollowing) {
      currentUser.following.pull(userIdToFollow);
      userToFollow.followers.pull(currentUserId);
    } else {
      currentUser.following.push(userIdToFollow);
      userToFollow.followers.push(currentUserId);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({ message: isFollowing ? 'Unfollowed' : 'Followed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// קבלת כל הפוסטים של משתמש בפרופיל
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId;
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
