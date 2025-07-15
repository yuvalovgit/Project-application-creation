const Post = require('../models/post');
const User = require('../models/user');
const Group = require('../models/Group');

// יצירת פוסט חדש (רק למשתמשים בקבוצה)
const createPost = async (req, res) => {
  try {
    const { content, video, group } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

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
    const myGroups = await Group.find({ members: currentUserId }).select('_id');
    const groupIds = myGroups.map(g => g._id);

    const feedPosts = await Post.find({ group: { $in: groupIds } })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(feedPosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
  likePost,
  addComment,
  deletePost
};
