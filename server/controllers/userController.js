// server/controllers/userController.js
const mongoose = require('mongoose');
const User = require('../models/user');
const Post = require('../models/post');

/** ▪️ פרופיל משתמש */
async function getUserProfile(req, res) {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const postsCount = await Post.countDocuments({ author: user._id });
    res.json({ ...user.toObject(), postsCount });
  } catch (err) {
    console.error('getUserProfile error:', err);
    res.status(500).json({ message: err.message });
  }
}

/** ▪️ כל המשתמשים (ללא סיסמה) */
async function getAllUsers(req, res) {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** ▪️ עדכון פרופיל (כולל העלאת אוואטר) */
async function updateUserProfile(req, res) {
  try {
    const userId = req.params.userId;
    const updateData = { ...req.body };

    if (req.body.isAdmin !== undefined) {
      updateData.isAdmin = req.body.isAdmin;
    }

    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (updateData.avatar === null) {
      updateData.avatar = null;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true
    }).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json(updatedUser);
  } catch (err) {
    console.error('updateUserProfile error:', err);
    res.status(500).json({ message: err.message });
  }
}

/** ▪️ Follow / Unfollow */
async function followUser(req, res) {
  try {
    const userIdToFollow = req.params.userId;
    const currentUserId = req.user.id;

    if (userIdToFollow === currentUserId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const userToFollow = await User.findById(userIdToFollow);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

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

    res.json({
      message: isFollowing ? 'Unfollowed' : 'Followed',
      followed: !isFollowing,
      followerCount: userToFollow.followers.length
    });
  } catch (err) {
    console.error('followUser error:', err);
    res.status(500).json({ message: err.message });
  }
}

/** ▪️ כל הפוסטים של משתמש */
async function getUserPosts(req, res) {
  try {
    const userId = req.params.userId;
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(posts);
  } catch (err) {
    console.error('getUserPosts error:', err);
    res.status(500).json({ message: err.message });
  }
}

/** ▪️ משתמשים עם מיקום */
async function getUsersWithLocation(req, res) {
  try {
    const users = await User.find({ location: { $exists: true, $ne: '' } })
      .select('username location');
    res.json(users);
  } catch (err) {
    console.error('getUsersWithLocation error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** ▪️ מחיקת החשבון של המשתמש המחובר */
async function deleteMyAccount(req, res) {
  try {
    const userId = req.user.id;
    await Post.deleteMany({ author: userId });
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Your account has been deleted successfully' });
  } catch (err) {
    console.error('deleteMyAccount error:', err);
    res.status(500).json({ message: err.message });
  }
}

/** ▪️ הצעות משתמשים רנדומליות – לא כולל את עצמי ואת מי שכבר עוקב אחריהם */
async function getSuggestedUsers(req, res) {
  try {
    const me = await User.findById(req.user.id).select('following');
    const excludeIds = [
      new mongoose.Types.ObjectId(req.user.id),
      ...me.following.map(id => new mongoose.Types.ObjectId(id))
    ];

    const suggestions = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $sample: { size: 5 } },
      { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } }
    ]);

    res.json(suggestions);
  } catch (err) {
    console.error('getSuggestedUsers error:', err);
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
}

/** ▪️ סטוריז – רשימת המשתמשים שאני עוקב אחריהם */
async function getFollowingStories(req, res) {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username avatar');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.following);
  } catch (err) {
    console.error('getFollowingStories error:', err);
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getUserProfile,
  getAllUsers,
  updateUserProfile,
  followUser,
  getUserPosts,
  getUsersWithLocation,
  deleteMyAccount,
  getSuggestedUsers,
  getFollowingStories
};
