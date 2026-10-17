const express = require('express');
const router = express.Router();
const controller = require('../controllers/trips.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', controller.getAllTrips);
router.get('/:id', controller.getTripById); 
router.get("/:tripId/seats", controller.getSeatsByTrip);

router.post('/', verifyToken, controller.createTrip);
router.delete('/:id', verifyToken, controller.deleteTrip);

module.exports = router;
