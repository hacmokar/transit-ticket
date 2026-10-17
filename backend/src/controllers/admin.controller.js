const db = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    // 1. Tổng doanh thu tháng này
    const [[revenue]] = await db.query(`
      SELECT IFNULL(SUM(amount), 0) AS total
      FROM transactions
      WHERE status = 'paid'
        AND MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);

    // 2. Vé đã bán (30 ngày)
    const [[tickets]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM tickets
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status IN ('paid', 'booked')
    `);

    // 3. Khách hàng mới (30 ngày)
    const [[users]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // 4. Giao dịch gần đây
    const [transactions] = await db.query(`
      SELECT tr.amount, tr.created_at, u.email
      FROM transactions tr
      JOIN users u ON tr.user_id = u.id
      ORDER BY tr.created_at DESC
      LIMIT 5
    `);

    res.json({
      revenue: revenue.total,
      tickets: tickets.total,
      users: users.total,
      transactions
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.getAllPartners = async (req, res) => {
  try {
    // Chỉ lấy id và tên công ty để hiển thị trong dropdown cho nhẹ
    const [rows] = await db.query('SELECT id, company_name FROM partners ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error("Get Partners error:", err);
    res.status(500).json({ error: err.message });
  }
};
