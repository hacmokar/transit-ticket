const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// 1. Route Dashboard (Cũ)
router.get(
  '/dashboard',
  verifyToken,
  verifyAdmin,
  adminController.getDashboard
);

// 2. Route lấy danh sách Partners (MỚI - Dành cho Dropdown chọn nhà xe)
router.get(
  '/partners',
  verifyToken,
  verifyAdmin,
  adminController.getAllPartners
);

module.exports = router;