require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// routes
const routeRoutes = require('./src/routes/routes');
const ticketRoutes = require('./src/routes/tickets');
const tripRoutes = require('./src/routes/trips');
const fleetRoutes = require('./src/routes/fleet');
const refundRoutes = require('./src/routes/refunds');
const adminRoutes = require('./src/routes/admin');
const partnerRoutes = require('./src/routes/partner');
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/refunds', refundRoutes);
app.use("/api/trips", require("./src/routes/trips"));
app.use("/api/routes", require("./src/routes/routes"));
app.use('/api/admin', adminRoutes);
app.use('/api/partners', partnerRoutes);



app.get('/', (req, res) => res.send('Transit Ticket API is running'));

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
