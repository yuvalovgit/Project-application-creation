const multer = require('multer');
const path = require('path');
const fs = require('fs');

// נתיב תיקיית ההעלאות
const uploadDir = path.join(__dirname, '..', 'uploads');

// יצירת תיקיית uploads אם לא קיימת
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// הגדרת אחסון multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// סינון סוגי קבצים - תמונות בלבד
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

// יצירת middleware multer
const upload = multer({ storage, fileFilter });

module.exports = upload;
