const Trip = require('../models/trips.model');

exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.getAll();
    res.json(trips);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createTrip = async (req, res) => {
  try {
    const result = await Trip.create(req.body);
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteTrip = async (req, res) => {
  try {
    await Trip.delete(req.params.id);
    res.json({ message: "Trip deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.getById(id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getSeatsByTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const seats = await Trip.getSeatsByTrip(tripId);
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

