const express = require('express');
const router = express.Router();
const controller = require('../controllers/tickets.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/book', verifyToken, controller.bookTicket);
router.get('/', controller.getAllTickets);    
router.delete('/:id', controller.deleteTicket); 

router.get('/detail/:id', controller.getTicketById);
router.get('/:id', controller.getTicketById);
router.get('/user/:userId', controller.getUserTickets);

router.put('/:id/status', controller.updateTicketStatus);

module.exports = router;