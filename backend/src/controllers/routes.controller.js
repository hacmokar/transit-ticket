// routes.controller.js
const Route = require('../models/routes.model.js');

// --- READ operations ---
exports.getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.getAll();
    res.json(routes);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getRouteById = async (req, res) => {
  try {
    const route = await Route.getById(req.params.id);
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.searchRoutes = async (req, res) => {
  const { start, end, date, type } = req.query; 

  try {
    const trips = await Route.search(start, end, date, type);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getSeatsByTrip = async (req, res) => {
  try {
    const seats = await Route.getTripSeats(req.params.tripId);
    res.json(seats);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- CREATE ---
exports.createRoute = async (req, res) => {
  try {
    const newRoute = await Route.create(req.body);
    res.status(201).json(newRoute);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- UPDATE ---
exports.updateRoute = async (req, res) => {
  try {
    const updatedRoute = await Route.update(req.params.id, req.body);
    res.json(updatedRoute);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- DELETE ---
exports.deleteRoute = async (req, res) => {
  try {
    await Route.delete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    // Bắt lỗi MySQL nếu xóa route đang có chuyến đi (Foreign Key Constraint)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "Cannot delete route because it contains trips." });
    }
    res.status(500).json({ error: err.message });
  }
};