const Ticket = require('../models/tickets.model.js');

exports.bookTicket = async (req, res) => {
  const userId = req.user.id; 
  const { tripId, seatIds, totalPrice } = req.body;
  
  if (!seatIds || seatIds.length === 0) {
    return res.status(400).json({ error: "No seats selected" });
  }

  try {
    const result = await Ticket.create(userId, tripId, seatIds, totalPrice);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Booking failed. Seats might be taken or system error." });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.getAll();
    res.json(tickets);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.getByUserId(req.params.userId);
    res.json(tickets);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.getInvoiceDetail(req.params.id); 
    
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  } catch (err) { 
    console.error("Lỗi lấy chi tiết vé:", err); 
    res.status(500).json({ error: err.message }); 
  }
};

exports.updateTicketStatus = async (req, res) => {
  const { status } = req.body; // Ví dụ: 'canceled'
  try {
    const result = await Ticket.updateStatus(req.params.id, status);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteTicket = async (req, res) => {
  try {
    await Ticket.delete(req.params.id);
    res.json({ message: "Ticket deleted permanently" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
