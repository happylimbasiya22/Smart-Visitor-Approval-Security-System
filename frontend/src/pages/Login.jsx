import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    setLoading(true);

    try {
      const response = await API.post("/login", { email, password });
      const { token, user } = response.data;

      window.localStorage.setItem("token", token);
      window.localStorage.setItem("currentUser", JSON.stringify(user));
      window.localStorage.setItem("role", user.role);

      // Redirect based on user role
      if (user.role === "guard") navigate("/");
      else if (user.role === "resident") navigate("/resident");
      else if (user.role === "admin") navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="brand-header">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shield-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <span className="brand-name">VisitorGuard</span>
          </div>
          <h1>Smart Visitor System</h1>
          <p>Secure and efficient visitor management platform for modern residential communities.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <h2 className="auth-title">Sign in</h2>
          <p className="auth-subtitle">Enter your credentials to continue</p>

          <form onSubmit={submit}>
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
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-signin" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <a href="#" onClick={e => { e.preventDefault(); navigate("/register"); }}>Create account</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
