console.log("🚀 Server file loaded...");

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// הגדרת תיקיית uploads כסטטית כדי לחשוף את התמונות
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log("🌐 Connecting to MongoDB...");
mongoose.connect(process.env.MONGO_URI, {
  // אפשר להסיר את useNewUrlParser ו-useUnifiedTopology כי הם deprecated בגרסאות חדשות של mongoose
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
