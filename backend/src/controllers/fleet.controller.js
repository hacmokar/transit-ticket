const Fleet = require('../models/fleet.model');
const db = require('../config/db');

// Helper: Lấy Partner ID từ User ID (Trả về null nếu không tìm thấy thay vì báo lỗi)
const getPartnerId = async (userId) => {
    const [rows] = await db.query('SELECT id FROM partners WHERE user_id = ?', [userId]);
    if (rows.length === 0) return null; 
    return rows[0].id;
};

// 1. LẤY DANH SÁCH XE (Fix cho Admin xem được tất cả)
exports.getVehicles = async (req, res) => {
  try {
    let vehicles;
    
    if (req.user.role === 'admin') {
        // [ADMIN]
        const [rows] = await db.query(`
            SELECT v.*, p.company_name as partner_name 
            FROM vehicles v 
            LEFT JOIN partners p ON v.partner_id = p.id 
            ORDER BY v.id DESC
        `);
        vehicles = rows;
    } else {
        // [PARTNER] - Lấy thêm rejection_reason
        const partnerId = await getPartnerId(req.user.id);
        if (!partnerId) return res.status(403).json({ error: "Bạn chưa đăng ký đối tác" });
        
        // Gọi thẳng query thay vì qua model cũ để đảm bảo lấy đủ cột
        const [rows] = await db.query(
            'SELECT * FROM vehicles WHERE partner_id = ? ORDER BY id DESC', 
            [partnerId]
        );
        vehicles = rows;
    }

    res.json(vehicles);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. THÊM XE
exports.addVehicle = async (req, res) => {
  try {
    let partnerId;
    let status = 'pending'; // Mặc định là chờ duyệt

    if (req.user.role === 'admin') {
       // --- LOGIC CHO ADMIN ---
       status = 'active'; // Admin thêm thì Active luôn

       // 1. Nếu chọn nhà xe từ dropdown
       if (req.body.partner_id) {
           partnerId = req.body.partner_id;
       } 
       // 2. Nếu tự thêm cho mình (Xe hệ thống)
       else {
           partnerId = await getPartnerId(req.user.id);
           if (!partnerId) {
               return res.status(400).json({ 
                   error: "Tài khoản Admin chưa có hồ sơ Nhà xe (Partner Profile). Vui lòng tạo hồ sơ trước." 
               });
           }
       }
    } else {
       // --- LOGIC CHO PARTNER ---
       partnerId = await getPartnerId(req.user.id);
       if (!partnerId) return res.status(403).json({ error: "Bạn chưa đăng ký đối tác" });
    }

    // Chuẩn bị dữ liệu gửi sang Model
    const vehicleData = {
        ...req.body,
        status: status // Truyền status vào đây
    };

    const result = await Fleet.createVehicle(partnerId, vehicleData);
    res.status(201).json(result);

  } catch (err) { 
      res.status(500).json({ error: err.message }); 
  }
};

// 3. CẬP NHẬT XE (Fix cho Admin sửa được xe của người khác)
exports.updateVehicle = async (req, res) => {
  try {
    let result;
    
    if (req.user.role === 'admin') {
        // Admin force update trực tiếp vào DB
        await db.query(
            'UPDATE vehicles SET vehicle_type = ?, identifier = ?, brand = ?, model = ?, capacity = ?, partner_id = ? WHERE id = ?',
            [req.body.vehicle_type, req.body.identifier, req.body.brand, req.body.model, req.body.capacity, req.body.partner_id, req.params.id]
        );
        result = { message: "Admin updated successfully" };
    } else {
        const partnerId = await getPartnerId(req.user.id);
        result = await Fleet.updateVehicle(req.params.id, partnerId, req.body);
    }

    if (!result && req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized or Vehicle not found" });
    res.json(result || { message: "Updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. XÓA XE (Fix cho Admin)
exports.deleteVehicle = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
        await db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    } else {
        const partnerId = await getPartnerId(req.user.id);
        await Fleet.deleteVehicle(req.params.id, partnerId);
    }
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) { 
    if(err.message === "Vehicle not found or unauthorized") {
        return res.status(403).json({ error: "Bạn không có quyền xóa xe này" });
    }
    res.status(500).json({ error: err.message }); 
  }
};

// --- CÁC HÀM KHÁC GIỮ NGUYÊN ---
exports.getSeatTypes = async (req, res) => {
  try {
    const types = await Fleet.getSeatTypes();
    res.json(types);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.setupLayout = async (req, res) => {
  // console.log("SETUP LAYOUT BODY =", JSON.stringify(req.body, null, 2));
  
  const { vehicleId } = req.params;
  const { seats } = req.body;

  if (!seats || seats.length === 0) {
    return res.status(400).json({ error: "Danh sách ghế không được trống" });
  }

  try {
    const result = await Fleet.createLayout(vehicleId, seats);
    res.status(201).json(result);
  } catch (err) {
    console.error("SETUP LAYOUT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Fleet.getVehicleById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Không tìm thấy xe" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSeatLayout = async (req, res) => {
    // Hàm này có thể bỏ nếu dùng getLayoutByVehicleId
    try {
        const { vehicleId } = req.params;
        const layout = await Fleet.getLayoutByVehicleId(vehicleId);
        res.json(layout);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getLayoutByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const layout = await Fleet.getLayoutByVehicleId(vehicleId);
    res.json(layout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};