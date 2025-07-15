const Group = require('../models/Group');

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existing = await Group.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Group already exists' });

    const group = await Group.create({ name, description, members: [req.user.id] });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already a member' });
    }

    group.members.push(req.user.id);
    await group.save();
    res.json({ message: 'Joined group successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGroups = async (req, res) => {
  const groups = await Group.find().select('name description members').lean();
  const output = groups.map(g => ({ ...g, memberCount: g.members.length }));
  res.json(output);
};
// שליפת קבוצות של המשתמש המחובר
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).select('name');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
