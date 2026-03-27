const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const exists = await pool.query("SELECT 1 FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    
    let flatIdVal = null;
    if (role === 'resident') {
      if (req.body.flat_no) {
        let flatRes = await pool.query("SELECT flat_id FROM flats WHERE flat_number=$1", [req.body.flat_no]);
        if (flatRes.rows.length) {
          flatIdVal = flatRes.rows[0].flat_id;
        } else {
          // Initialize dummy building/wing if they don't exist yet
          let bldgRes = await pool.query("SELECT building_id FROM buildings LIMIT 1");
          if (!bldgRes.rows.length) {
            bldgRes = await pool.query("INSERT INTO buildings (building_name, address) VALUES ('Main Building', 'HQ') RETURNING building_id");
          }
          const bldgId = bldgRes.rows[0].building_id;

          let wingRes = await pool.query("SELECT wing_id FROM wings WHERE building_id=$1 LIMIT 1", [bldgId]);
          if (!wingRes.rows.length) {
            wingRes = await pool.query("INSERT INTO wings (building_id, wing_name) VALUES ($1, 'A') RETURNING wing_id", [bldgId]);
          }
          const wingId = wingRes.rows[0].wing_id;

          // Auto-create flat
          flatRes = await pool.query("INSERT INTO flats (wing_id, flat_number, floor) VALUES ($1, $2, 1) RETURNING flat_id", [wingId, req.body.flat_no]);
          flatIdVal = flatRes.rows[0].flat_id;
        }
      } else {
        flatIdVal = 1; // Fallback
      }
    }

    const result = await pool.query(
      `INSERT INTO users (name,email,phone,password,role,flat_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING user_id,name,email,role,flat_id`,
      [name, email, phone, hashed, role, flatIdVal]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed. " + err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await pool.query(`
    SELECT u.*, f.flat_number 
    FROM users u 
    LEFT JOIN flats f ON u.flat_id = f.flat_id 
    WHERE u.email=$1
  `, [email]);
  if (!user.rows.length) return res.status(400).json({ error: "Invalid credentials" });

  const record = user.rows[0];
  const match = await bcrypt.compare(password, record.password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const payload = {
    user_id: record.user_id,
    name: record.name,
    role: record.role,
    flat_id: record.flat_id,
    flat_no: record.flat_number || null
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, user: payload });
};

exports.getProfile = async (req, res) => {
  const { user_id } = req.user;
  const user = await pool.query("SELECT user_id,name,email,role,flat_id FROM users WHERE user_id=$1", [user_id]);
  if (!user.rows.length) return res.status(404).json({ error: "User not found" });
  res.json(user.rows[0]);
};