const express = require('express');
const router = express.Router();
const controller = require('../controllers/routes.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/search', controller.searchRoutes); 
router.get('/trips/:tripId/seats', controller.getSeatsByTrip);

router.get('/', controller.getAllRoutes);
router.get('/:id', controller.getRouteById);

router.post('/', verifyToken, controller.createRoute);
router.put('/:id', verifyToken, controller.updateRoute);
router.delete('/:id', verifyToken, controller.deleteRoute);



module.exports = router;