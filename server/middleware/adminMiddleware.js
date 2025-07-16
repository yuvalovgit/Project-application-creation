const User = require('../models/user');

// This middleware checks if the user is an admin before allowing access to admin routes

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = adminMiddleware;