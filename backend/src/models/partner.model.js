const db = require('../config/db');

const Partner = {
  // Tìm thông tin Partner dựa trên user_id
  findByUserId: async (userId) => {
    try {
      const [rows] = await db.query('SELECT * FROM partners WHERE user_id = ?', [userId]);
      return rows[0] || null;
    } catch (err) { throw err; }
  },

  // Đăng ký Partner mới
  create: async (userId, data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { 
        company_name, company_address, pic_name, pic_phone, pic_email, 
        legal_entity_name, business_license_number, operating_routes_desc, estimated_fleet_size 
      } = data;

      const [result] = await connection.query(
        `INSERT INTO partners 
        (user_id, company_name, company_address, pic_name, pic_phone, pic_email, 
         legal_entity_name, business_license_number, operating_routes_desc, estimated_fleet_size, 
         status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NOW())`, 
        [
          userId, 
          company_name, 
          company_address, 
          pic_name, 
          pic_phone, 
          pic_email,
          legal_entity_name, 
          business_license_number, 
          operating_routes_desc, 
          estimated_fleet_size
        ]
      );

      // Cập nhật luôn Role cho user
      await connection.query('UPDATE users SET role = ? WHERE id = ?', ['partner', userId]);

      await connection.commit();
      return { id: result.insertId, ...data, status: 'approved' };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Cập nhật thông tin
  update: async (userId, data) => {
    try {
      const { company_name, company_address, pic_name, pic_phone, pic_email } = data;
      await db.query(
        `UPDATE partners 
         SET company_name = ?, company_address = ?, pic_name = ?, pic_phone = ?, pic_email = ? 
         WHERE user_id = ?`,
        [company_name, company_address, pic_name, pic_phone, pic_email, userId]
      );
      return { message: "Update success" };
    } catch (err) { throw err; }
  },

  // --- CÁC HÀM ADMIN (Đã xóa phần code lặp thừa ở cuối file) ---
  
  getAllRequests: async () => {
    try {
      const [rows] = await db.query('SELECT * FROM partners ORDER BY created_at DESC');
      return rows;
    } catch (err) { throw err; }
  },

  approveAndCreateVehicle: async (partnerId, vehicleData) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Duyệt Partner
      await connection.query('UPDATE partners SET status = ? WHERE id = ?', ['approved', partnerId]);

      // 2. Tạo xe (Dùng identifier và capacity)
      if (vehicleData && vehicleData.license_plate) {
         // Check trùng
         const [exist] = await connection.query('SELECT id FROM vehicles WHERE identifier = ?', [vehicleData.license_plate]);
         
         if (exist.length === 0) {
            await connection.query(
              `INSERT INTO vehicles 
               (partner_id, identifier, vehicle_type, brand, model, capacity, status, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
              [
                partnerId,
                vehicleData.license_plate, // Insert vào identifier
                vehicleData.vehicle_type || 'bus',
                vehicleData.brand,
                vehicleData.model,
                vehicleData.seat_capacity || 40 // Insert vào capacity
              ]
            );
         }
      }

      await connection.commit();
      return { message: "Approved successfully" };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  reject: async (partnerId) => {
    try {
      await db.query('UPDATE partners SET status = ? WHERE id = ?', ['rejected', partnerId]);
      return { message: "Rejected" };
    } catch (err) { throw err; }
  }
};

module.exports = Partner;