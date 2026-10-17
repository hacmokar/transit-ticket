const pool = require('../config/db'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function register(req, res) {
  try {
    // 1. Nhận thêm adminCode từ Frontend gửi lên
    const { name, email, password, adminCode } = req.body;
    
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    // 2. Kiểm tra Email đã tồn tại chưa
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(409).json({ message: 'Email này đã được sử dụng' });

    // 3. XỬ LÝ LOGIC ROLE (QUAN TRỌNG)
    let role = 'user'; // Mặc định là user thường
    
    // Nếu có mã code và mã code khớp với .env
    if (adminCode && process.env.ADMIN_REGISTRATION_CODE && adminCode === process.env.ADMIN_REGISTRATION_CODE) {
      role = 'admin';
    }

    // 4. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 5. Lưu vào DB (Cần thêm cột role vào câu lệnh INSERT)
    // Lưu ý: Cột role trong DB của bạn phải cho phép nhận giá trị 'admin'
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
      [name || null, email, hashedPassword, role]
    );

    const userId = result.insertId;
    
    // 6. Tạo token với role đúng (không hardcode 'user' nữa)
    const token = jwt.sign({ id: userId, email, role: role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
        message: role === 'admin' ? "Đăng ký Admin thành công" : "Đăng ký thành công",
        token,
        user: { id: userId, email, name, role: role }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const [rows] = await pool.query('SELECT id, password, name, role FROM users WHERE email = ?', [email]);
    
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
        message: "Login success",
        token, 
        user: { 
            id: user.id, 
            email, 
            name: user.name, 
            role: user.role 
        } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function me(req, res) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { register, login, me };