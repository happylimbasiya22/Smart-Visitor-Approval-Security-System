import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Auth.css";

export default function Register() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("resident");
  const [flatNo, setFlatNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const user = JSON.parse(window.localStorage.getItem("currentUser") || "null");
    if (token && user) {
      navigate("/" + (user.role === "admin" ? "admin" : user.role === "resident" ? "resident" : ""));
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!name || !phone || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (!/^\d+$/.test(phone) || phone.length < 10) {
      setError("Phone must be at least 10 digits");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Call register API
      const payload = {
        name,
        email,
        phone,
        password,
        role,
        ...(role === "resident" && { flat_no: flatNo })
      };
      console.log("Sending registration data:", payload);
      
      const response = await API.post("/register", payload);
      console.log("Registration response:", response.data);

      setSuccess("Account created successfully! Redirecting to login...");
      setError("");

      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Registration error details:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config?.url
      });
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="brand-logo">🛡️</div>
          <h1>Smart Visitor</h1>
          <p>Enterprise-grade visitor management and security monitoring platform</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <p className="auth-header-label">Sign Up</p>
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join our visitor management system</p>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                required
              >
                <option value="resident">Resident</option>
                <option value="guard">Guard</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {role === "resident" && (
              <div className="form-group">
                <label>Flat Number</label>
                <input
                  type="text"
                  placeholder="e.g. 101, A-204"
                  value={flatNo}
                  onChange={e => setFlatNo(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}

            <button type="submit" className="btn-signin" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <a href="#" onClick={e => { e.preventDefault(); navigate("/login"); }}>Sign In</a></p>
          </div>

          <p className="security-note">🔒 Protected by enterprise-grade encryption</p>
        </div>
      </div>
    </div>
  );
}
