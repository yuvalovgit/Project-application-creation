const Post = require('../models/post');

exports.createPost = async (req, res) => {
  try {
    const { content, image, video, group } = req.body;

    const newPost = await Post.create({
      content,
      image,
      video,
      group,
      author: req.user.id
    });

    const populatedPost = await Post.findById(newPost._id).populate('author', 'username');
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
