const express = require('express');
const router = express.Router();
const controller = require('../controllers/fleet.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// --- CÁC ROUTE XE (VEHICLE) ---
router.get('/vehicles', controller.getVehicles);
router.get('/vehicles/:id', controller.getVehicleById);
router.post('/vehicles', controller.addVehicle);
router.put('/vehicles/:id', controller.updateVehicle);
router.delete('/vehicles/:id', controller.deleteVehicle);

// --- CÁC ROUTE CẤU HÌNH GHẾ (LAYOUT) ---
router.get('/seat-types', controller.getSeatTypes);

router.get('/layout/:vehicleId', controller.getLayoutByVehicleId); 
router.post('/layout/:vehicleId', controller.setupLayout);        

module.exports = router;