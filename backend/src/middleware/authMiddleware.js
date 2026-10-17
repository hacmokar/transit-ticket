const jwt = require('jsonwebtoken');
// Đảm bảo secret key khớp với file .env hoặc dùng key mặc định giống lúc tạo token
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// 1. Middleware xác thực đăng nhập (Giữ nguyên logic của bạn)
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  // Lấy token từ header "Bearer <token>"
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Lưu thông tin user (id, role, ...) vào request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// 2. Middleware kiểm tra quyền Admin (MỚI THÊM)
function verifyAdmin(req, res, next) {
  // Hàm này phải chạy SAU verifyToken nên req.user đã có dữ liệu
  if (req.user && req.user.role === 'admin') {
    next(); // Là admin -> Cho qua
  } else {
    return res.status(403).json({ message: 'Access denied! Admins only.' });
  }
}

// Xuất cả 2 hàm ra để dùng ở nơi khác
module.exports = { verifyToken, verifyAdmin };