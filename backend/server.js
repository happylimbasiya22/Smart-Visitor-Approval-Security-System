require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const visitRoutes = require("./routes/visitRoutes");
const userRoutes = require("./routes/userRoutes");

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", visitRoutes);
app.use("/api", userRoutes);

const PORT = process.env.PORT || 3000;

// Home route
app.get("/", (req, res) => {
  res.send("Backend is running 😌");
});

// Test DB route
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      time: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});