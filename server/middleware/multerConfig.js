const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📁 התיקייה הראשית להעלאות
const uploadDir = path.join(__dirname, '..', 'uploads');
// יצירת התיקייה (כולל תתי-תיקיות) אם לא קיימת
fs.mkdirSync(uploadDir, { recursive: true });

// ⚙️ הגדרת אחסון עם חלוקה לפי שדה
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'posts'; // ברירת מחדל – פוסטים

    if (file.fieldname === 'groupImage') subfolder = 'groups';     // 👈 קבוצות
    else if (file.fieldname === 'groupCover') subfolder = 'covers'; // 👈 קאברים
    else if (file.fieldname === 'avatar') subfolder = 'avatars';   // 👈 משתמשים

    const dest = path.join(uploadDir, subfolder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// 🔒 סינון — רק תמונות וסרטונים
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'), false);
  }
};

// ⏱️ הגבלת גודל: עד 10MB לקובץ
const limits = {
  fileSize: 10 * 1024 * 1024
};

// 🎯 יצירת המידלוור
const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;
