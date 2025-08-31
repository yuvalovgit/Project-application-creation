const Post  = require('../models/post');
const User  = require('../models/user');
const Group = require('../models/Group');
const mongoose = require('mongoose');

/* יצירת פוסט חדש (פרופיל אישי או קבוצה) */
const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const rawGroup = req.body.group;
    const group = rawGroup && rawGroup !== 'null' && rawGroup !== 'undefined' ? rawGroup : null;

    let image = null;
    let video = null;

    // קובץ מצורף (תמונה/וידאו) -> שמירת נתיב ציבורי
    if (req.file) {
      const filename = req.file.filename; // multer שם את שם הקובץ
      const filePath = `/uploads/posts/${filename}`;
      if (req.file.mimetype?.startsWith('image/')) image = filePath;
      else if (req.file.mimetype?.startsWith('video/')) video = filePath;
      else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
    }

    // אם נשלחה קבוצה - בדיקת קיום וחברות
    if (group) {
      const groupObj = await Group.findById(group);
      if (!groupObj) return res.status(404).json({ error: 'Group not found' });

      const isMember = groupObj.members.some(m => m.toString() === req.user.id);
      if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const newPost = await Post.create({
      author: req.user.id,
      content: content || '',
      image,
      video,
      group: group || null
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    return res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Error creating post:', err);
    return res.status(400).json({ error: err.message });
  }
};

/* פיד – פוסטים של מי שאני עוקב אחריו + שלי, וגם מקבוצות שאני חבר בהן */
const getFeed = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const user = await User.findById(currentUserId).select('following');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // כל הקבוצות שבהן המשתמש חבר
    const groups = await Group.find({ members: user._id }, '_id');
    const groupIds = groups.map(g => g._id);

    // רשימת מחברים: מי שאני עוקב אחריו + אני
    const authorIds = [
      ...user.following.map(f => f.toString()),
      currentUserId.toString()
    ].map(id => new mongoose.Types.ObjectId(id));

    const feedPosts = await Post.find({
      $or: [
        { author: { $in: authorIds } },
        { group: { $in: groupIds } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    return res.json(feedPosts);
  } catch (err) {
    console.error('Error fetching feed:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* פוסטים של משתמש מסוים (לפרופיל) */
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params; // ודא שהנתיב תואם ל-route שלך
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    return res.json(posts);
  } catch (err) {
    console.error('Error fetching user posts:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* פוסט בודד לפי ID */
const getSinglePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    if (!post) return res.status(404).json({ message: 'Post not found' });
    return res.json(post);
  } catch (err) {
    console.error('Error fetching single post:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* לייק / ביטול לייק */
const likePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const idx = post.likes.findIndex(id => id.toString() === userId);
    if (idx === -1) post.likes.push(userId);
    else post.likes.splice(idx, 1);

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    return res.json(updatedPost);
  } catch (err) {
    console.error('Error in likePost:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* הוספת תגובה */
const addComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ author: userId, text: text.trim() });
    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    return res.json(updatedPost);
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json({ message: err.message });
  }
};

/* מחיקת פוסט (רק של עצמי) */
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
    return res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,     // הוסף את זה ל-routes אם טרם מופה
  getSinglePost,
  likePost,
  addComment,
  deletePost
};
