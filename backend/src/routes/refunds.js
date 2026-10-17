const express = require('express');
const router = express.Router();
const controller = require('../controllers/refunds.controller');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// --- NHÓM 1: CÁC ROUTE CỤ THỂ (Đặt lên đầu) ---

// User gửi yêu cầu
router.post('/request', verifyToken, controller.requestRefund);

// Admin lấy danh sách (pending/history là từ khóa cụ thể -> Đặt trên cùng)
router.get('/pending', verifyToken, verifyAdmin, controller.getPendingRefunds);
router.get('/history', verifyToken, verifyAdmin, controller.getRefundHistory); 

// --- NHÓM 2: CÁC ROUTE CÓ THAM SỐ :id (Đặt xuống cuối cùng) ---

router.put('/:id/approve', verifyToken, verifyAdmin, controller.approveRefund);
router.put('/:id/reject', verifyToken, verifyAdmin, controller.rejectRefund);

// ⚠️ QUAN TRỌNG: Nếu bạn có router.get('/:id'...) thì BẮT BUỘC phải đặt ở dòng cuối cùng này.
// router.get('/:id', verifyToken, controller.getRefundById); 

module.exports = router;