const Post = require('../models/post');
const User = require('../models/user');

// יצירת פוסט חדש (תמונה / וידאו)
exports.createPost = async (req, res) => {
  try {
    const { content, group } = req.body;
    let image = null;
    let video = null;

    if (req.file) {
      const filePath = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) image = filePath;
      else if (req.file.mimetype.startsWith('video/')) video = filePath;
    }

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

// פיד חכם
exports.getFeed = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const feedPosts = await Post.find({
      author: { $in: [...user.following, currentUserId] }
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(feedPosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// פוסט בודד לפי ID
exports.getSinglePost = async (req, res) => {
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
exports.likePost = async (req, res) => {
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
exports.addComment = async (req, res) => {
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

// מחיקת פוסט
exports.deletePost = async (req, res) => {
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
