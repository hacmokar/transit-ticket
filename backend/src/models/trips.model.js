const db = require('../config/db');

const Trip = {
  getAll: async () => {
    try {
      const query = `
        SELECT 
          t.id, t.travel_date, t.start_time, t.price,
          r.name as route_name, 
          v.identifier as vehicle_plate, v.vehicle_type
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN vehicles v ON t.vehicle_id = v.id
        ORDER BY t.travel_date DESC, t.start_time ASC
      `;
      const [rows] = await db.query(query);
      return rows;
    } catch (err) { throw err; }
  },

  create: async (data) => {
    const { route_id, vehicle_id, travel_date, start_time, price } = data;
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const [tripRes] = await connection.query(
        'INSERT INTO trips (route_id, vehicle_id, travel_date, start_time, price) VALUES (?, ?, ?, ?, ?)',
        [route_id, vehicle_id, travel_date, start_time, price]
      );
      const newTripId = tripRes.insertId;

      const [layoutSeats] = await connection.query(
        `SELECT id FROM vehicle_seat_layout WHERE vehicle_id = ?`,
        [vehicle_id]
      );
      
      if (layoutSeats.length === 0) {
        throw new Error("Xe này chưa được cấu hình sơ đồ ghế");
      }
      
      const seatValues = layoutSeats.map(seat => [
        newTripId,
        seat.id,
        0
      ]);
      
      await connection.query(
        `INSERT INTO seats (trip_id, layout_id, is_booked) VALUES ?`,
        [seatValues]
      );

      await connection.commit();
      return { id: newTripId, message: "Trip created & Seats generated successfully" };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  delete: async (id) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('DELETE FROM seats WHERE trip_id = ?', [id]);
      
      await connection.query('DELETE FROM trips WHERE id = ?', [id]);

      await connection.commit();
      return { message: "Trip deleted successfully" };
    } catch (err) {
      await connection.rollback();
      if(err.code === 'ER_ROW_IS_REFERENCED_2') {
         throw new Error("Không thể xóa chuyến đi này vì đã có vé được bán.");
      }
      throw err;
    } finally {
      connection.release();
    }
  },
  getById: async (id) => {
    try {
      const query = `
        SELECT 
          t.id,
          t.travel_date,
          t.start_time,
          t.price,
          r.start_location,
          r.end_location,
          v.vehicle_type,
          v.brand,
          v.model
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.id = ?
        LIMIT 1
      `;
  
      const [rows] = await db.query(query, [id]);
  
      if (rows.length === 0) return null;
  
      const trip = rows[0];
  
      // FORMAT ĐÚNG CHO FRONTEND
      return {
        id: trip.id,
        travel_date: trip.travel_date,
        start_time: trip.start_time,
        price: trip.price,
        route: {
          start_location: trip.start_location,
          end_location: trip.end_location,
        },
        vehicle: {
          type: trip.vehicle_type,
          brand: trip.brand,
          model: trip.model,
        },
      };
    } catch (err) {
      throw err;
    }
  },
  getSeatsByTrip: async (tripId) => {
    const query = `
      SELECT 
        s.id AS seat_id,
        s.is_booked,
        vsl.seat_code,
        st.type_name
      FROM seats s
      JOIN vehicle_seat_layout vsl ON s.layout_id = vsl.id
      JOIN seat_types st ON vsl.seat_type_id = st.id
      WHERE s.trip_id = ?
      ORDER BY vsl.seat_code ASC
    `;
  
    const [rows] = await db.query(query, [tripId]);
    return rows;
  },
  
  
};



module.exports = Trip;