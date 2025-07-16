const Group = require('../models/Group');

// צור קבוצה חדשה
exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existing = await Group.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Group already exists' });

    const group = await Group.create({ name, description, members: [req.user.id] });
    console.log("✅ Group created:", group);
    res.status(201).json(group);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// הצטרפות לקבוצה
exports.joinGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!Array.isArray(group.members)) group.members = [];

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already a member' });
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

// עזיבת קבוצה
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    group.members = group.members.filter(memberId => memberId.toString() !== req.user.id);
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
    const groups = await Group.find().select('name description members').lean();
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
    const groups = await Group.find({ members: req.user.id }).select('name');
    res.json(groups);
  } catch (err) {
    console.error("Get my groups error:", err);
    res.status(500).json({ error: err.message });
  }
};
