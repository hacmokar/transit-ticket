const Refund = require('../models/refunds.model');

exports.requestRefund = async (req, res) => {
  const { ticketId, reason } = req.body;
  const userId = req.user.id;
  try {
    const result = await Refund.createRequest(ticketId, userId, reason);
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPendingRefunds = async (req, res) => {
  try {
    const list = await Refund.getAllPending();
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.approveRefund = async (req, res) => {
  try {
    // req.params.id là ID lấy từ URL: /refunds/:id/approve
    const result = await Refund.approveRefund(req.params.id, req.user.id);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- SỬA LẠI HÀM NÀY ---
exports.rejectRefund = async (req, res) => {
    try {
        // Frontend gọi: api.put(`/refunds/${id}/reject`, ...)
        // Nên ID nằm ở req.params.id, KHÔNG PHẢI req.body.refundId
        const refundId = req.params.id; 
        const adminId = req.user.id;

        // Gọi sang Model xử lý (Logic DB nằm bên Model là đúng rồi)
        const result = await Refund.rejectRefund(refundId, adminId);
        
        res.json({ message: "Đã từ chối hoàn tiền thành công", ...result });

    } catch (error) {
        console.log("Lỗi reject:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getRefundHistory = async (req, res) => {
    try {
      const history = await Refund.getAllHistory();
      return res.status(200).json(history);
    } catch (error) {
      console.error("Lỗi getRefundHistory:", error);
      return res.status(500).json({ error: error.message });
    }
  };
  