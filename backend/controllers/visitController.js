const pool = require("../config/db");

// Create Visit (Guard)
exports.createVisit = async (req, res) => {
  try {
    const { name, phone_no, flat_no, vehicle_no, entry_date, entry_time } = req.body;
    const guard_id = req.user.user_id;

    const flatRes = await pool.query("SELECT flat_id FROM flats WHERE flat_number=$1 LIMIT 1", [String(flat_no)]);
    if (!flatRes.rows.length) return res.status(400).json({ error: "Invalid flat number" });
    const flat_id = flatRes.rows[0].flat_id;

    let vId = null;
    const visitorRow = await pool.query("SELECT visitor_id FROM visitors WHERE phone=$1", [phone_no]);
    if (visitorRow.rows.length) {
      vId = visitorRow.rows[0].visitor_id;
    } else {
      const newVisitor = await pool.query("INSERT INTO visitors (name,phone) VALUES ($1,$2) RETURNING visitor_id", [name, phone_no]);
      vId = newVisitor.rows[0].visitor_id;
    }

    const checkIn = new Date(`${entry_date}T${entry_time}:00`);
    const purpose = vehicle_no ? `Vehicle: ${vehicle_no}` : "No Vehicle";

    const result = await pool.query(
      `INSERT INTO visits (visitor_id, flat_id, guard_id, visitor_type, purpose, check_in_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [vId, flat_id, guard_id, 'guest', purpose, checkIn]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get Visits for Resident and filtering
exports.getVisitsByFlat = async (req, res) => {
  const { flat_id } = req.params;
  const { status, from, to } = req.query;

  let q = `SELECT v.*, vis.name as visitor_name
    FROM visits v
    JOIN visitors vis ON v.visitor_id = vis.visitor_id
    WHERE v.flat_id=$1`;

  const values = [flat_id];
  if (status) {
    values.push(status);
    q += ` AND status=$${values.length}`;
  }
  if (from) {
    values.push(from);
    q += ` AND v.check_in_time >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    q += ` AND v.check_in_time <= $${values.length}`;
  }

  const result = await pool.query(q, values);
  res.json(result.rows);
};

exports.getVisitById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`SELECT * FROM visits WHERE visit_id=$1`, [id]);
  res.json(result.rows[0]);
};

// Get Visits for Resident and filtering
exports.approveVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { flat_id, user_id } = req.user;

    const visitCheck = await pool.query(
      "SELECT * FROM visits WHERE visit_id = $1 AND flat_id = $2",
      [id, flat_id]
    );

    if (!visitCheck.rows.length) {
      return res.status(403).json({ error: "You cannot approve this visit" });
    }

    await pool.query(`UPDATE visits SET status='approved' WHERE visit_id=$1`, [id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [user_id, "APPROVED_VISIT", "visits", id]
    );

    res.json({ message: "Approved" });
  } catch (err) {
    console.error("approveVisit error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.rejectVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { flat_id, user_id } = req.user;

    const visitCheck = await pool.query(
      "SELECT * FROM visits WHERE visit_id = $1 AND flat_id = $2",
      [id, flat_id]
    );

    if (!visitCheck.rows.length) {
      return res.status(403).json({ error: "You cannot reject this visit" });
    }

    await pool.query(`UPDATE visits SET status='rejected' WHERE visit_id=$1`, [id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id)
       VALUES ($1, $2, $3, $4)`,
      [user_id, "REJECTED_VISIT", "visits", id]
    );

    res.json({ message: "Rejected" });
  } catch (err) {
    console.error("rejectVisit error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminStats = async (req, res) => {
  const pending = await pool.query("SELECT COUNT(*) FROM visits WHERE status='pending'");
  const approved = await pool.query("SELECT COUNT(*) FROM visits WHERE status='approved'");
  const rejected = await pool.query("SELECT COUNT(*) FROM visits WHERE status='rejected'");

  const perWing = await pool.query(`
    SELECT w.wing_name, COUNT(*) as count
    FROM visits v
    JOIN flats f ON v.flat_id=f.flat_id
    JOIN wings w ON f.wing_id=w.wing_id
    GROUP BY w.wing_name
    ORDER BY w.wing_name
  `);

  res.json({
    pending: Number(pending.rows[0].count),
    approved: Number(approved.rows[0].count),
    rejected: Number(rejected.rows[0].count),
    per_wing: perWing.rows
  });
};

exports.getGuardDashboard = async (req, res) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const counts = await pool.query(
    `SELECT status, COUNT(*) FROM visits WHERE check_in_time >= $1 AND check_in_time < $2 GROUP BY status`,
    [start, end]
  );
  const map = { pending: 0, approved: 0, rejected: 0 };
  counts.rows.forEach(r => { map[r.status] = Number(r.count); });

  res.json(map);
};

exports.getNotifications = async (req, res) => {
  const { user_id } = req.user;
  const notif = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
    [user_id]
  );
  res.json(notif.rows);
};

exports.getAdminVisits = async (req, res) => {
  const { wing, from, to, status } = req.query;

  let q = `SELECT v.*, vis.name as visitor_name, f.flat_number, w.wing_name
    FROM visits v
    JOIN visitors vis ON v.visitor_id=vis.visitor_id
    JOIN flats f ON v.flat_id=f.flat_id
    JOIN wings w ON f.wing_id=w.wing_id
    WHERE 1=1`;
  const values = [];

  if (wing) {
    values.push(wing);
    q += ` AND w.wing_name=$${values.length}`;
  }
  if (status) {
    values.push(status);
    q += ` AND v.status=$${values.length}`;
  }
  if (from) {
    values.push(from);
    q += ` AND v.check_in_time >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    q += ` AND v.check_in_time <= $${values.length}`;
  }

  q += " ORDER BY v.check_in_time DESC LIMIT 200";

  const result = await pool.query(q, values);
  res.json(result.rows);
};

exports.createExpectedVisit = async (req, res) => {
  try {
    const { name, date, time, purpose } = req.body;
    const { flat_id } = req.user;

    if (!flat_id) return res.status(403).json({ error: "No flat assigned to this resident" });

    let vId = null;
    const phone = `EXP${Math.floor(Math.random() * 1000000000)}`;
    const newVisitor = await pool.query("INSERT INTO visitors (name,phone) VALUES ($1,$2) RETURNING visitor_id", [name, phone]);
    vId = newVisitor.rows[0].visitor_id;

    const checkIn = new Date(`${date}T${time}:00`);

    const result = await pool.query(
      `INSERT INTO visits (visitor_id, flat_id, visitor_type, purpose, status, check_in_time)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [vId, flat_id, 'pre-approved', purpose || 'Expected Guest', 'expected', checkIn]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.guardArriveVisit = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE visits SET status='approved', check_in_time=NOW() WHERE visit_id=$1`, [id]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1,$2,$3,$4)`,
      [req.user.user_id, 'GUARD_ARRIVED_EXPECTED', 'visits', id]
    );
    res.json({ message: "Arrived" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getGlobalVisits = async (req, res) => {
  try {
    const q = `SELECT v.*, vis.name as visitor_name, f.flat_number as flat_no
      FROM visits v
      JOIN visitors vis ON v.visitor_id = vis.visitor_id
      LEFT JOIN flats f ON v.flat_id = f.flat_id
      ORDER BY v.check_in_time DESC LIMIT 200`;
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
