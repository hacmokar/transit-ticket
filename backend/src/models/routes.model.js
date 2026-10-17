const db = require('../config/db');

const Route = {
  getAll: async () => {
    try {
      const [rows] = await db.query('SELECT * FROM routes ORDER BY id DESC');
      return rows;
    } catch (err) { throw err; }
  },

  getById: async (id) => {
    try {
      const [rows] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);
      return rows[0];
    } catch (err) { throw err; }
  },

  search: async (startLocation, endLocation, travelDate, type) => {
    try {
      // --- CẬP NHẬT QUERY: Thêm JOIN partners và lấy company_name ---
      let query = `
        SELECT 
          t.id AS trip_id,
          t.travel_date,
          t.start_time,
          t.price,
          r.name AS route_name,
          r.start_location,
          r.end_location,
          r.distance,
          v.vehicle_type,
          v.identifier,
          v.brand,
          v.model,
          p.company_name AS partner_name  -- <--- Lấy tên nhà xe
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN vehicles v ON t.vehicle_id = v.id
        LEFT JOIN partners p ON v.partner_id = p.id  -- <--- JOIN với bảng partners
        WHERE 1 = 1
      `;
  
      const params = [];
  
      if (startLocation) {
        query += ` AND r.start_location LIKE ?`;
        params.push(`%${startLocation}%`);
      }
  
      if (endLocation) {
        query += ` AND r.end_location LIKE ?`;
        params.push(`%${endLocation}%`);
      }
  
      if (travelDate) {
        query += ` AND t.travel_date = ?`;
        params.push(travelDate);
      }
  
      if (type) {
        query += ` AND v.vehicle_type = ?`;
        params.push(type);
      }
  
      const [rows] = await db.query(query, params);
      return rows;
    } catch (err) {
      throw err;
    }
  },

  getTripSeats: async (tripId) => {
    try {
      const query = `
        SELECT s.id AS seat_id, s.is_booked, l.seat_code, st.type_name, st.description
        FROM seats s
        JOIN vehicle_seat_layout l ON s.layout_id = l.id
        JOIN seat_types st ON l.seat_type_id = st.id
        WHERE s.trip_id = ? ORDER BY l.seat_code ASC
      `;
      const [rows] = await db.query(query, [tripId]);
      return rows;
    } catch (err) { throw err; }
  },

  create: async (data) => {
    try {
      const { name, start_location, end_location, distance } = data;
      const [result] = await db.query(
        'INSERT INTO routes (name, start_location, end_location, distance) VALUES (?, ?, ?, ?)',
        [name, start_location, end_location, distance]
      );
      return { id: result.insertId, ...data };
    } catch (err) { throw err; }
  },

  update: async (id, data) => {
    try {
      const { name, start_location, end_location, distance } = data;
      await db.query(
        'UPDATE routes SET name = ?, start_location = ?, end_location = ?, distance = ? WHERE id = ?',
        [name, start_location, end_location, distance, id]
      );
      return { id, ...data };
    } catch (err) { throw err; }
  },

  delete: async (id) => {
    try {
      await db.query('DELETE FROM routes WHERE id = ?', [id]);
      return { message: "Route deleted successfully" };
    } catch (err) { throw err; }
  }
};

module.exports = Route;