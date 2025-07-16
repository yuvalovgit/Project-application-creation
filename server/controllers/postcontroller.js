const Post = require('../models/post');
const User = require('../models/user');
const Group = require('../models/Group');

// יצירת פוסט חדש (תמונה / וידאו)
const createPost = async (req, res) => {
  try {
    const { content, group } = req.body;
    let image = null;
    let video = null;

    if (req.file) {
      const filePath = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) image = filePath;
      else if (req.file.mimetype.startsWith('video/')) video = filePath;
    }

    // בדוק אם הקבוצה קיימת
    const groupObj = await Group.findById(group);
    if (!groupObj) return res.status(404).json({ error: 'Group not found' });

    // בדוק אם המשתמש חבר בקבוצה
    const isMember = groupObj.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });

    const newPost = await Post.create({
      content,
      image,
      video,
      group,
      author: req.user.id
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'username avatar');
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getFeed = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const feedPosts = await Post.find({
      $or: [
        { author: { $in: [...user.following, currentUserId] } },
        { group: { $in: user.groups } }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username avatar')
    .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(feedPosts);
  } catch (err) {
    console.error('Error fetching feed:', err);
    res.status(500).json({ message: err.message });
  }
};

// פוסט בודד לפי ID
const getSinglePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error('Error fetching single post:', err);
    res.status(500).json({ message: err.message });
  }
};

// לייק / ביטול לייק
const likePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const likedIndex = post.likes.indexOf(userId);
    if (likedIndex === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(likedIndex, 1);
    }

    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(populatedPost);
  } catch (err) {
    console.error('Error in likePost:', err);
    res.status(500).json({ message: err.message });
  }
};

// הוספת תגובה
const addComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ author: userId, text });
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(populatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createPost,
  getFeed,
  getSinglePost,
  likePost,
  addComment,
  deletePost
};