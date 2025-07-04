const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Auth header:', authHeader); // לוג של הכותרת לקבלת מידע

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token, access denied' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, 'secret123');
    console.log('Decoded token:', decoded); // לוג של הטוקן אחרי פענוח
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    res.status(401).json({ error: 'Token is not valid' });
  }
};
