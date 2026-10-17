const express = require('express');
const router = express.Router();
const controller = require('../controllers/partner.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// ==========================================
// 1. CÁC ROUTE CÔNG KHAI / ADMIN (Không cần User Token của Partner)
// ==========================================

// Các route Admin lấy danh sách
router.get('/admin/requests', controller.getAllRequests); 
router.get('/admin/vehicles/pending', controller.getPendingVehicles);

router.post('/admin/:id/approve', controller.approveRequest);
router.post('/admin/:id/reject', controller.rejectRequest);
router.post('/admin/vehicles/:id/review', controller.reviewVehicle);



router.use(verifyToken); 


// ==========================================
// 3. CÁC ROUTE CẦN ĐĂNG NHẬP (PARTNER)
// ==========================================

// User đăng ký, xem profile, sửa profile
router.post('/register', controller.register);
router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);

// --- ĐƯA 2 DÒNG NÀY XUỐNG ĐÂY ---
// Vì code trong controller dùng 'req.user.id', nên bắt buộc phải nằm sau verifyToken
router.get('/my-vehicles', controller.getMyVehicles);
router.post('/add-vehicle', controller.addVehicle); 

module.exports = router;