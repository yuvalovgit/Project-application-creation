// controllers/groupController.js

const Group = require('../models/Group');
const Post  = require('../models/post');

// יצירת קבוצה חדשה
exports.createGroup = async (req, res) => {
  try {
    const { name, description, topic, isPrivate = false } = req.body;
    const existing = await Group.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Group already exists' });

    const group = await Group.create({
      name,
      description,
      topic,
      image: req.file ? `/uploads/${req.file.filename}` : '',
      cover: '',             // אפשר להרחיב ל-cover בזמן יצירה אם תרצה
      members: [req.user.id],
      admin: req.user.id,
      isPrivate,
      pendingRequests: []
    });

    console.log("✅ Group created:", group);
    res.status(201).json(group);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// הצטרפות לקבוצה (תיקון includes למבנה עם ObjectId)
exports.joinGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const alreadyMember = group.members.some(m => m.toString() === req.user.id);
    if (alreadyMember) {
      return res.status(400).json({ error: 'Already a member' });
    }

    if (group.isPrivate) {
      const alreadyRequested = group.pendingRequests.some(id => id.toString() === req.user.id);
      if (alreadyRequested) {
        return res.status(400).json({ error: 'Already requested to join' });
      }
      group.pendingRequests.push(req.user.id);
      await group.save();
      return res.status(202).json({ message: 'Join request sent (waiting for approval)' });
    }

    group.members.push(req.user.id);
    await group.save();

    const updatedGroup = await Group.findById(groupId);
    console.log("✅ Joined group:", updatedGroup);
    res.json(updatedGroup);

  } catch (err) {
    console.error("Join group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// עזיבת קבוצה (מניעת עזיבת אדמין)
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.admin.toString() === req.user.id) {
      return res.status(400).json({ error: 'Admin cannot leave the group. Transfer ownership or delete the group.' });
    }

    group.members = group.members.filter(m => m.toString() !== req.user.id);
    await group.save();

    const updatedGroup = await Group.findById(groupId);
    console.log("🚪 Left group:", updatedGroup);
    res.json(updatedGroup);

  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// שליפת כל הקבוצות
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .select('name description topic image cover members')
      .lean();
    console.log("📦 All groups fetched:", groups.length);
    res.json(groups);
  } catch (err) {
    console.error("Get groups error:", err);
    res.status(500).json({ error: err.message });
  }
};

// שליפת קבוצות של המשתמש
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .select('name description topic image cover members')
      .lean();
    res.json(groups);
  } catch (err) {
    console.error("Get my groups error:", err);
    res.status(500).json({ error: err.message });
  }
};

// שליפת קבוצה לפי מזהה (עם populate של members ו־admin)
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username avatar')
      .populate('admin',   'username avatar')
      .lean();

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (err) {
    console.error("Get group by ID error:", err);
    res.status(500).json({ error: err.message });
  }
};

// חיפוש קבוצות לפי שם
exports.searchGroups = async (req, res) => {
  try {
    const name = req.query.name || '';
    const regex = new RegExp(name, 'i');
    const groups = await Group.find({ name: regex })
      .select('name description topic image cover members')
      .lean();
    res.json(groups);
  } catch (err) {
    console.error("Search group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// אישור בקשת הצטרפות ע"י האדמין (בדיקות כפילות והשוואות תקינות)
exports.approveJoinRequest = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the admin can approve requests' });
    }

    const requested = group.pendingRequests.some(id => id.toString() === userId);
    if (!requested) {
      return res.status(400).json({ error: 'User has not requested to join' });
    }

    const alreadyMember = group.members.some(m => m.toString() === userId);
    if (alreadyMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== userId);
    group.members.push(userId);
    await group.save();

    res.json({ message: 'User approved and added to group', group });
  } catch (err) {
    console.error("Approve join request error:", err);
    res.status(500).json({ error: err.message });
  }
};

// עדכון פרטי קבוצה ע"י האדמין בלבד (עם whitelist)
exports.updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group   = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the admin can update the group' });
    }

    // שדות שמותר לעדכן
    const allowed = ['name', 'description', 'topic', 'isPrivate'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) group[key] = req.body[key];
    }

    // תמונה חדשה?
    if (req.file) {
      // הערה: אם ה־multer שלך שומר קבוצות בתיקיית 'profiles' עבור fieldname='groupImage'
      // אז מומלץ לוודא שגם ה-route משתמש בשם השדה הזה, אחרת זה ילך ל'posts' כברירת מחדל.
      group.image = `/uploads/${req.file.filename}`;
    }

    await group.save();
    res.json({ message: 'Group updated successfully', group });
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// מחיקת פוסט מקבוצה (אדמין או יוצר הפוסט)
exports.deleteGroupPost = async (req, res) => {
  try {
    const { id: groupId, postId } = req.params;
    const post  = await Post.findById(postId);
    const group = await Group.findById(groupId);
    if (!post)  return res.status(404).json({ error: 'Post not found' });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = group.admin.toString() === req.user.id;
    const isOwner = post.author.toString() === req.user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error("Delete group post error:", err);
    res.status(500).json({ error: err.message });
  }
};

// קבלת כל הפוסטים של קבוצה
exports.getGroupPosts = async (req, res) => {
  try {
    const groupId = req.params.id;
    const posts = await Post.find({ group: groupId })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });
    res.json(posts);
  } catch (err) {
    console.error("Get group posts error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ======== Image upload/remove controllers ======== */

// העלאת תמונת פרופיל
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    const url = `/uploads/profiles/${req.file.filename}`;
    const group = await Group.findByIdAndUpdate(req.params.id, { image: url }, { new: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ url });
  } catch (err) {
    console.error("Upload profile image error:", err);
    res.status(500).json({ error: err.message });
  }
};

// מחיקת תמונת פרופיל
exports.removeProfileImage = async (req, res) => {
  try {
    const defaultUrl = '/uploads/default-avatar.png';
    const group = await Group.findByIdAndUpdate(req.params.id, { image: defaultUrl }, { new: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ url: defaultUrl });
  } catch (err) {
    console.error("Remove profile image error:", err);
    res.status(500).json({ error: err.message });
  }
};

// העלאת תמונת נושא (Cover)
exports.uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    const url = `/uploads/covers/${req.file.filename}`;
    const group = await Group.findByIdAndUpdate(req.params.id, { cover: url }, { new: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ url });
  } catch (err) {
    console.error("Upload cover image error:", err);
    res.status(500).json({ error: err.message });
  }
};

// מחיקת תמונת נושא (Cover)
exports.removeCoverImage = async (req, res) => {
  try {
    const defaultUrl = '/uploads/default-cover.jpg';
    const group = await Group.findByIdAndUpdate(req.params.id, { cover: defaultUrl }, { new: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ url: defaultUrl });
  } catch (err) {
    console.error("Remove cover image error:", err);
    res.status(500).json({ error: err.message });
  }
};
// עדכון תוכן פוסט (רק היוצר, אפשר להרחיב גם לאדמין קבוצה)
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // רק היוצר יכול לערוך (אם תרצה שגם אדמין קבוצה – ראה הערה למטה)
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (typeof content !== 'undefined') {
      post.content = content;
    }

    await post.save();

    const updated = await Post.findById(postId)
      .populate('author', 'username avatar')
      .populate({ path: 'comments.author', select: 'username avatar' });

    res.json(updated);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ message: err.message });
  }
};

// הסרת חבר מהקבוצה (admin only)
exports.removeMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { memberId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the admin can remove members' });
    }

    if (memberId === group.admin.toString()) {
      return res.status(400).json({ error: 'Cannot remove the admin' });
    }

    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    res.json({ message: 'Member removed', group });
  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ error: err.message });
  }
};

// מחיקת קבוצה (admin only) + מחיקת פוסטים של הקבוצה
exports.deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group   = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // רק האדמין יכול למחוק
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the admin can delete this group' });
    }

    // מחיקת כל הפוסטים של הקבוצה
    await Post.deleteMany({ group: groupId });

    // מחיקת הקבוצה
    await group.deleteOne();

    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error("Delete group error:", err);
    res.status(500).json({ error: err.message });
  }
};
