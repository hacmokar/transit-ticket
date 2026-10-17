const db = require('../config/db');

const Fleet = {
  // SỬA: Chỉ lấy xe của partner đang đăng nhập
  getAllVehiclesByPartner: async (partnerId) => { // Đổi tên hàm cho rõ nghĩa
    try {
      const [rows] = await db.query(
        'SELECT * FROM vehicles WHERE partner_id = ? ORDER BY id DESC', 
        [partnerId]
      );
      return rows;
    } catch (err) { throw err; }
  },

  // SỬA: Thêm tham số partnerId vào hàm và câu lệnh INSERT
  createVehicle: async (partnerId, data) => {
    try {
      // Lấy status từ data truyền vào (nếu không có thì mặc định là 'pending')
      const { vehicle_type, identifier, brand, model, capacity, status = 'pending' } = data;
      
      const [result] = await db.query(
        `INSERT INTO vehicles 
         (partner_id, vehicle_type, identifier, brand, model, capacity, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [partnerId, vehicle_type, identifier, brand, model, capacity, status]
      );
      return { id: result.insertId, ...data, status };
    } catch (err) { throw err; }
  },

  // SỬA: Thêm điều kiện AND partner_id = ? để đảm bảo không sửa nhầm xe người khác
  updateVehicle: async (id, partnerId, data) => {
    try {
      const { vehicle_type, identifier, brand, model, capacity } = data;
      const [result] = await db.query(
        'UPDATE vehicles SET vehicle_type = ?, identifier = ?, brand = ?, model = ?, capacity = ? WHERE id = ? AND partner_id = ?',
        [vehicle_type, identifier, brand, model, capacity, id, partnerId]
      );
      if (result.affectedRows === 0) return null; // Không tìm thấy xe hoặc không phải chủ xe
      return { id, ...data };
    } catch (err) { throw err; }
  },

  // SỬA: Thêm điều kiện AND partner_id = ?
  deleteVehicle: async (id, partnerId) => {
    try {
      const [result] = await db.query('DELETE FROM vehicles WHERE id = ? AND partner_id = ?', [id, partnerId]);
      if (result.affectedRows === 0) throw new Error("Vehicle not found or unauthorized");
      return { message: "Vehicle deleted" };
    } catch (err) { throw err; }
  },

  getSeatTypes: async () => {
    try {
      const [rows] = await db.query('SELECT * FROM seat_types');
      return rows;
    } catch (err) { throw err; }
  },

  createLayout: async (vehicleId, seats) => {
    const connection = await db.getConnection();
  
    try {
      await connection.beginTransaction();
  
      // 1️⃣ XÓA layout cũ (RẤT QUAN TRỌNG)
      await connection.query(
        'DELETE FROM vehicle_seat_layout WHERE vehicle_id = ?',
        [vehicleId]
      );
  
      // 2️⃣ CHUẨN HÓA DỮ LIỆU INSERT
      const values = seats.map(seat => {
        if (!seat.seat_code || !seat.seat_type_id) {
          throw new Error("seat_code hoặc seat_type_id bị thiếu");
        }
        return [
          vehicleId,
          seat.seat_code,
          seat.seat_type_id
        ];
      });
  
      // 3️⃣ INSERT BATCH
      await connection.query(
        `INSERT INTO vehicle_seat_layout 
         (vehicle_id, seat_code, seat_type_id)
         VALUES ?`,
        [values]
      );
  
      await connection.commit();
  
      return {
        message: "Layout setup successfully",
        count: values.length
      };
  
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
  
  
  getVehicleById: async (id) => {
    const [rows] = await db.query(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );
    return rows[0];
  },
  getLayoutByVehicleId: async (vehicleId) => {
    const [rows] = await db.query(`
      SELECT 
        vsl.id,
        vsl.seat_code,
        st.type_name,
        vsl.seat_type_id
      FROM vehicle_seat_layout vsl
      JOIN seat_types st ON vsl.seat_type_id = st.id
      WHERE vsl.vehicle_id = ?
      ORDER BY vsl.id
    `, [vehicleId]);
  
    return rows;
  },
  
};

module.exports = Fleet;