import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user payload (must include UID as id)
    req.user = decoded;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;