const db = require('../config/db');

const Refund = {
  // 1. Khách gửi yêu cầu hoàn tiền
  createRequest: async (ticketId, userId, reason) => {
    try {
      // Kiểm tra xem vé này đã có yêu cầu nào đang pending chưa
      const [existing] = await db.query(
        "SELECT id FROM refunds WHERE ticket_id = ? AND status = 'pending'", 
        [ticketId]
      );
      if (existing.length > 0) throw new Error("Vé này đang trong quá trình chờ hoàn tiền.");

      // Tạo yêu cầu hoàn tiền
      await db.query(
        "INSERT INTO refunds (ticket_id, reason, status) VALUES (?, ?, 'pending')",
        [ticketId, reason]
      );
      
      // (Tùy chọn) Cập nhật trạng thái vé tạm thời để user không thao tác khác được
        await db.query("UPDATE tickets SET status = 'pending_refund' WHERE id = ?", [ticketId]);

      return { message: "Gửi yêu cầu hoàn tiền thành công. Vui lòng chờ admin xét duyệt." };
    } catch (err) { throw err; }
  },

  // 2. Admin lấy danh sách chờ duyệt
  getAllPending: async () => {
    try {
      const query = `
        SELECT r.id AS refund_id, r.reason, r.created_at,
               t.id AS ticket_id, t.passenger_name, t.seat_id,
               u.email, tr.price, tr.start_time, tr.travel_date
        FROM refunds r
        JOIN tickets t ON r.ticket_id = t.id
        JOIN users u ON t.user_id = u.id
        JOIN trips tr ON t.trip_id = tr.id
        WHERE r.status = 'pending'
      `;
      const [rows] = await db.query(query);
      return rows;
    } catch (err) { throw err; }
  },

  // 3. Admin DUYỆT hoàn tiền
  approveRefund: async (refundId, adminId) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy thông tin vé & giá tiền từ bảng trips (để tính tiền hoàn)
      // Cần JOIN với trips để lấy giá gốc (price)
      const queryInfo = `
        SELECT r.ticket_id, t.user_id, tr.price 
        FROM refunds r
        JOIN tickets t ON r.ticket_id = t.id
        JOIN trips tr ON t.trip_id = tr.id
        WHERE r.id = ?
      `;
      const [info] = await connection.query(queryInfo, [refundId]);
      
      if (info.length === 0) throw new Error("Yêu cầu không tồn tại");
      
      const { ticket_id, user_id, price } = info[0];
      const refundAmount = price * 0.9; // Hoàn 90% giá trị

      // B1: Cập nhật bảng refunds -> approved
      await connection.query("UPDATE refunds SET status = 'approved' WHERE id = ?", [refundId]);

      // B2: Cập nhật bảng tickets -> refunded
      await connection.query("UPDATE tickets SET status = 'refunded' WHERE id = ?", [ticket_id]);

      // B3: Nhả ghế (is_booked = 0)
      const [ticketSeat] = await connection.query("SELECT seat_id FROM tickets WHERE id = ?", [ticket_id]);
      if (ticketSeat.length > 0) {
        await connection.query("UPDATE seats SET is_booked = 0 WHERE id = ?", [ticketSeat[0].seat_id]);
      }

      // B4: TẠO GIAO DỊCH HOÀN TIỀN (MỚI THÊM)
      // Lưu ý: amount có thể lưu số âm (-180000) hoặc số dương tùy quy ước của bạn. 
      // Ở đây mình lưu số dương và dùng status 'refund' để phân biệt.
      await connection.query(
        `INSERT INTO transactions 
        (user_id, amount, status, payment_method, note, created_at) 
        VALUES (?, ?, 'refund', 'system', ?, NOW())`,
        [
            user_id, 
            refundAmount, 
            `Hoàn tiền cho vé #${ticket_id} (Phí 10%)`
        ]
      );

      await connection.commit();
      return { message: "Đã duyệt hoàn tiền và ghi nhận giao dịch thành công!" };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // 4. Từ chối hoàn tiền
  rejectRefund: async (refundId, adminId) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Lấy ticket_id trước khi update
        const [rows] = await connection.query("SELECT ticket_id FROM refunds WHERE id = ?", [refundId]);
        if (rows.length === 0) throw new Error("Yêu cầu không tồn tại");
        const ticketId = rows[0].ticket_id;

        // 2. Cập nhật bảng refunds -> rejected
        await connection.query("UPDATE refunds SET status = 'rejected' WHERE id = ?", [refundId]);

        // 3. QUAN TRỌNG: Trả trạng thái vé về 'paid' (hoặc 'active') để khách tiếp tục dùng vé
        // Nếu thiếu dòng này, vé sẽ kẹt mãi ở trạng thái 'đang chờ hoàn'
        await connection.query("UPDATE tickets SET status = 'refund_rejected' WHERE id = ?", [ticketId]);

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
},
getAllHistory: async () => {
    try {
      const query = `
        SELECT r.id AS refund_id,
               r.reason,
               r.status,
               r.created_at,
               t.id AS ticket_id,
               t.passenger_name,
               u.email,
               tr.price,
               tr.travel_date,
               tr.start_time
        FROM refunds r
        JOIN tickets t ON r.ticket_id = t.id
        JOIN users u ON t.user_id = u.id
        JOIN trips tr ON t.trip_id = tr.id
        WHERE r.status IN ('approved', 'rejected')
        ORDER BY r.created_at DESC
      `;
      const [rows] = await db.query(query);
      return rows;
    } catch (err) {
      throw err;
    }
  },
};

module.exports = Refund;