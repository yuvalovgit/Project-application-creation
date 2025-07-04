const Post = require('../models/post');
const User = require('../models/user');

// יצירת פוסט חדש עם תמונה (או בלי תמונה)
exports.createPost = async (req, res) => {
  try {
    const { content, video, group } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const newPost = await Post.create({
      content,
      image,
      video,
      group,
      author: req.user.id
    });

    const populatedPost = await Post.findById(newPost._id).populate('author', 'username avatar');
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// פיד חכם - מחזיר פוסטים של משתמשים שהמשתמש הנוכחי עוקב אחריהם
exports.getFeed = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // מוצא את המשתמש כדי לקבל את רשימת העוקבים שלו
    const user = await User.findById(currentUserId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // מחפש פוסטים של כל מי שהמשתמש עוקב אחריהם + הפוסטים של המשתמש עצמו
    const feedPosts = await Post.find({
      author: { $in: [...user.following, currentUserId] }
    })
      .sort({ createdAt: -1 }) // מהחדש לישן
      .populate('author', 'username avatar')
      .populate({
        path: 'comments.author',
        select: 'username avatar'
      });

    res.json(feedPosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// פונקציה ללייק / ביטול לייק על פוסט
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

    res.json({ message: 'Like status updated', likesCount: post.likes.length, liked: likedIndex === -1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// הוספת תגובה לפוסט
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = {
      author: userId,
      text
    };

    post.comments.push(comment);
    await post.save();

    // מחזיר את הפוסטים עם תגובות מעודכנות כולל פרטי המחברים
    const populatedPost = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate({
        path: 'comments.author',
        select: 'username avatar'
      });

    res.json(populatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
