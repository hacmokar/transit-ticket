const db = require('../config/db');

const Ticket = {
  create: async (userId, tripId, seatIds, totalPrice, passengerName, passengerPhone) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [seatsCheck] = await connection.query(
        'SELECT id, is_booked FROM seats WHERE id IN (?) FOR UPDATE',
        [seatIds]
      );
      const takenSeats = seatsCheck.filter(seat => seat.is_booked === 1);
      if (takenSeats.length > 0) {
        const takenIds = takenSeats.map(s => s.id).join(', ');
        throw new Error(`Ghế (ID: ${takenIds}) đã có người đặt.`);
      }


      const [transResult] = await connection.query(
        'INSERT INTO transactions (user_id, amount, status, payment_method) VALUES (?, ?, ?, ?)',
        [userId, totalPrice, 'paid', 'card']
      );
      const transactionId = transResult.insertId;

      for (const seatId of seatIds) {
        await connection.query(
          'INSERT INTO tickets (transaction_id, user_id, trip_id, seat_id, status) VALUES (?, ?, ?, ?, ?)',
          [transactionId, userId, tripId, seatId, 'booked']
        );
        await connection.query('UPDATE seats SET is_booked = 1 WHERE id = ?', [seatId]);
      }

      await connection.commit();
      return { transactionId, message: "Booking successful" };
    } catch (err) {
      await connection.rollback();
      throw err; 
    } finally {
      connection.release();
    }
  },


  getAll: async () => {
    try {
      const query = `
        SELECT tk.id, tk.status, u.email, r.name as route, v.identifier as bus_plate, l.seat_code
        FROM tickets tk
        JOIN users u ON tk.user_id = u.id
        JOIN trips t ON tk.trip_id = t.id
        JOIN routes r ON t.route_id = r.id
        JOIN vehicles v ON t.vehicle_id = v.id
        JOIN seats s ON tk.seat_id = s.id
        JOIN vehicle_seat_layout l ON s.layout_id = l.id
        ORDER BY tk.created_at DESC
      `;
      const [rows] = await db.query(query);
      return rows;
    } catch (err) { throw err; }
  },

  getByUserId: async (userId) => {
    try {
      // THÊM: tr.price (để lấy giá vé lẻ)
      const query = `
        SELECT 
          tk.id AS ticket_id, tk.status, tk.qr_code,
          tr.travel_date, tr.start_time, tr.price, 
          r.name AS route_name, r.start_location, r.end_location,
          v.brand, l.seat_code, trans.amount
        FROM tickets tk
        JOIN trips tr ON tk.trip_id = tr.id
        JOIN routes r ON tr.route_id = r.id
        JOIN transactions trans ON tk.transaction_id = trans.id
        JOIN seats s ON tk.seat_id = s.id
        JOIN vehicle_seat_layout l ON s.layout_id = l.id
        JOIN vehicles v ON tr.vehicle_id = v.id
        WHERE tk.user_id = ?
        ORDER BY tk.created_at DESC
      `;
      const [rows] = await db.query(query, [userId]);
      return rows;
    } catch (err) { throw err; }
  },

  getById: async (id) => {
    try {
      const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [id]);
      return rows[0];
    } catch (err) { throw err; }
  },

  updateStatus: async (id, status) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);

      if (['canceled', 'refunded', 'expired'].includes(status)) {
        const [rows] = await connection.query('SELECT seat_id FROM tickets WHERE id = ?', [id]);
        if (rows.length > 0) {
          const seatId = rows[0].seat_id;
          await connection.query('UPDATE seats SET is_booked = 0 WHERE id = ?', [seatId]);
        }
      }

      await connection.commit();
      return { id, status, message: "Status updated" };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  delete: async (id) => {
    try {
      await db.query('DELETE FROM tickets WHERE id = ?', [id]);
      return { message: "Ticket deleted" };
    } catch (err) { throw err; }
  },
  getInvoiceDetail: async (id) => {
    try {
      const query = `
        SELECT 
          tk.id, tk.passenger_name, tk.passenger_phone, tk.status, tr.price,
          l.seat_code,  
          r.name as route_name, r.start_location, r.end_location,
          tr.travel_date, tr.start_time,
          v.brand as vehicle_brand
        FROM tickets tk
        JOIN seats s ON tk.seat_id = s.id
        JOIN vehicle_seat_layout l ON s.layout_id = l.id
        JOIN trips tr ON tk.trip_id = tr.id
        JOIN routes r ON tr.route_id = r.id
        JOIN vehicles v ON tr.vehicle_id = v.id
        WHERE tk.id = ?
      `;
      const [rows] = await db.query(query, [id]);
      return rows[0];
    } catch (err) { throw err; }
  },
};

module.exports = Ticket;