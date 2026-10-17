const Partner = require('../models/partner.model');
const db = require('../config/db');

// --- USER CONTROLLERS ---
exports.register = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Kiểm tra trùng
    const existingPartner = await Partner.findByUserId(userId);
    if (existingPartner) {
      return res.status(400).json({ error: "Bạn đã là đối tác của hệ thống rồi." });
    }

    const newPartner = await Partner.create(userId, req.body);
    
    // --- SỬA THÔNG BÁO ---
    res.status(201).json({ 
      message: "Đăng ký thành công! Bạn đã chính thức trở thành đối tác.", 
      partner: newPartner 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi Server: " + err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const partner = await Partner.findByUserId(userId);
    if (!partner) return res.status(404).json({ error: "Chưa tìm thấy thông tin." });
    res.json(partner);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    await Partner.update(userId, req.body);
    res.json({ message: "Cập nhật thành công" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getMyVehicles = async (req, res) => {
  try {
      const userId = req.user.id;
      const partner = await Partner.findByUserId(userId);
      if (!partner) return res.status(404).json({ message: "Chưa là đối tác" });
      const [vehicles] = await db.query('SELECT * FROM vehicles WHERE partner_id = ?', [partner.id]);
      res.json(vehicles);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const partner = await Partner.findByUserId(userId);
    if (!partner) return res.status(403).json({ message: "Bạn không phải là đối tác" });

    // Frontend gửi lên: license_plate (hoặc identifier), seat_capacity
    // Ta map nó vào đúng cột của Database: identifier, capacity
    const { license_plate, identifier, vehicle_type, brand, model, seat_capacity, capacity } = req.body;

    const finalIdentifier = license_plate || identifier; // Lấy biển số
    const finalCapacity = seat_capacity || capacity || 40; // Lấy số ghế

    // Kiểm tra trùng biển số
    const [exist] = await db.query('SELECT id FROM vehicles WHERE identifier = ?', [finalIdentifier]);
    if (exist.length > 0) {
        return res.status(400).json({ message: "Biển số xe này đã tồn tại." });
    }

    // INSERT dùng đúng tên cột: identifier, capacity
    await db.query(
      `INSERT INTO vehicles (partner_id, identifier, vehicle_type, brand, model, capacity, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        partner.id, 
        finalIdentifier, 
        vehicle_type || 'bus', 
        brand, 
        model, 
        finalCapacity
      ]
    );

    res.status(201).json({ message: "Yêu cầu thêm xe đã được gửi. Vui lòng chờ duyệt." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// --- ADMIN CONTROLLERS ---

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await Partner.getAllRequests();
    res.json(requests);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// FIX LỖI 500 Ở ĐÂY
exports.approveRequest = async (req, res) => {
  try {
    const partnerId = req.params.id;
    const { vehicleIdentifier, vehicleType, brand, model, seat } = req.body;

    // Logic mới: Kiểm tra biển số
    let finalLicensePlate = vehicleIdentifier;
    // Nếu biển số rỗng hoặc là biển mặc định gây trùng lặp
    if (!finalLicensePlate || finalLicensePlate === "59B-99999") {
        // Tạo biển tạm: TEMP-ID-TIMESTAMP (Ví dụ: TEMP-15-8392)
        finalLicensePlate = `TEMP-${partnerId}-${Date.now().toString().slice(-4)}`;
    }

    const vehicleData = {
      license_plate: finalLicensePlate,
      vehicle_type: vehicleType,
      brand: brand,
      model: model,
      seat_capacity: seat
    };

    await Partner.approveAndCreateVehicle(partnerId, vehicleData);
    res.json({ message: "Đã duyệt đối tác thành công!" });

  } catch (err) {
    console.error("Approve Error:", err);
    res.status(500).json({ error: "Lỗi Server: " + err.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    await Partner.reject(req.params.id);
    res.json({ message: "Đã từ chối hồ sơ." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPendingVehicles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.*, p.company_name, p.pic_name, p.pic_phone
      FROM vehicles v JOIN partners p ON v.partner_id = p.id
      WHERE v.status = 'pending' ORDER BY v.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.reviewVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "Invalid action" });
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    const rejectionReason = action === 'reject' ? reason : null;
    await db.query('UPDATE vehicles SET status = ?, rejection_reason = ? WHERE id = ?', [newStatus, rejectionReason, id]);
    res.json({ message: `Success` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};