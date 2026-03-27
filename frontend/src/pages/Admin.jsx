import { useState, useEffect } from "react";
import API from "../api";
import "../App.css";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentUser] = useState(() => JSON.parse(window.localStorage.getItem("currentUser") || "null"));

  const [visits, setVisits] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "guard", password: "", flat_no: "" });

  const fetchData = async () => {
    try {
      const [visitRes, userRes] = await Promise.all([
        API.get("/visits/global"),
        API.get("/users")
      ]);
      setVisits(visitRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProvision = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      alert("All fields are required.");
      return;
    }
    
    try {
      await API.post("/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
        ...(form.role === "resident" && { flat_no: form.flat_no })
      });
      setForm({ name: "", email: "", phone: "", role: "guard", password: "", flat_no: "" });
      fetchData();
      alert(`Account for ${form.name} created successfully.`);
    } catch (err) {
      alert("Failed to provision account: " + (err.response?.data?.error || err.message));
    }
  };

  const logout = () => {
    window.localStorage.clear();
    window.location = "/login";
  };

  // Quick stats
  const totalVisits = visits.length;
  const pendingVisits = visits.filter(v => v.status === "pending").length;
  const expectedVisits = visits.filter(v => v.status === "expected").length;

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="portal-title">
          <h1>👑 Admin Dashboard</h1>
        </div>
        <div className="portal-user-info">
          <span>{currentUser?.email}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="portal-content">
        <div className="admin-tabs" style={{ display: "flex", gap: "10px", marginBottom: "2rem" }}>
          <button 
            className={`btn-signin ${activeTab === "dashboard" ? "" : "btn-inactive"}`} 
            style={{ width: "auto", margin: 0, padding: "10px 20px", background: activeTab === "dashboard" ? "" : "#64748b" }}
            onClick={() => setActiveTab("dashboard")}>
            📊 Analytics & Logs
          </button>
          <button 
            className={`btn-signin ${activeTab === "users" ? "" : "btn-inactive"}`} 
            style={{ width: "auto", margin: 0, padding: "10px 20px", background: activeTab === "users" ? "" : "#64748b" }}
            onClick={() => setActiveTab("users")}>
            👥 User Management
          </button>
        </div>

        {activeTab === "dashboard" && (
          <>
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="stats-card">
                <div className="stat-number" style={{ color: "#3b82f6" }}>{totalVisits}</div>
                <div className="stat-label">Total Logs</div>
              </div>
              <div className="stats-card">
                <div className="stat-number" style={{ color: "#10b981" }}>{visits.filter(v=>v.status==='approved').length}</div>
                <div className="stat-label">Granted Entry</div>
              </div>
              <div className="stats-card">
                <div className="stat-number" style={{ color: "#fbbf24" }}>{pendingVisits}</div>
                <div className="stat-label">Awaiting Guard</div>
              </div>
              <div className="stats-card">
                <div className="stat-number" style={{ color: "#8b5cf6" }}>{expectedVisits}</div>
                <div className="stat-label">Pre-Approved</div>
              </div>
            </div>

            <div className="portal-row" style={{ marginTop: "1.5rem" }}>
              <div className="portal-col-8">
                <div className="page-box">
                  <h2>📜 Master Log</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "var(--text-muted)", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "12px", borderRadius: "8px 0 0 0" }}>Time</th>
                          <th style={{ padding: "12px" }}>Visitor</th>
                          <th style={{ padding: "12px" }}>Flat</th>
                          <th style={{ padding: "12px" }}>Purpose</th>
                          <th style={{ padding: "12px", borderRadius: "0 8px 0 0" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && visits.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Loading network data...</td></tr>
                        ) : visits.map(v => (
                          <tr key={v.visit_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "12px", color: "var(--text-muted)" }}>{new Date(v.check_in_time).toLocaleString()}</td>
                            <td style={{ padding: "12px", fontWeight: "600" }}>{v.visitor_name}</td>
                            <td style={{ padding: "12px", color: "#64748b" }}>{v.flat_no || "N/A"}</td>
                            <td style={{ padding: "12px", color: "var(--text-muted)" }}>{v.purpose}</td>
                            <td style={{ padding: "12px" }}>
                              <span className={`status-badge status-${v.status}`} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                                {v.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {visits.length === 0 && !loading && (
                          <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>No master logs available.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="portal-col-4">
                <div className="page-box">
                  <h2>📈 Peak Visitor Hours</h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Automated volume analysis.</p>
                  
                  {/* Pure CSS Bar Chart Mockup (Visual Only based on pure styling logic) */}
                  <div style={{ display: "flex", alignItems: "flex-end", height: "200px", gap: "10%", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ width: "20%", height: "20%", background: "#cbd5e1", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}></div>
                    <div style={{ width: "20%", height: "90%", background: "linear-gradient(to top, #3b82f6, #60a5fa)", borderRadius: "4px 4px 0 0", position: "relative" }}>
                      <span style={{ position: "absolute", top: "-25px", left: "50%", transform: "translateX(-50%)", fontSize: "0.8rem", fontWeight: "bold", color: "#3b82f6" }}>Peak</span>
                    </div>
                    <div style={{ width: "20%", height: "45%", background: "#cbd5e1", borderRadius: "4px 4px 0 0" }}></div>
                    <div style={{ width: "20%", height: "70%", background: "#93c5fd", borderRadius: "4px 4px 0 0" }}></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "10px", padding: "0 10px" }}>
                    <span>8 AM</span>
                    <span>1 PM</span>
                    <span>5 PM</span>
                    <span>8 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "users" && (
          <div className="portal-row">
            <div className="portal-col-8">
              <div className="page-box">
                <h2>System Users</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "var(--text-muted)", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "12px", borderRadius: "8px 0 0 0" }}>Name</th>
                        <th style={{ padding: "12px" }}>Email</th>
                        <th style={{ padding: "12px" }}>Role</th>
                        <th style={{ padding: "12px", borderRadius: "0 8px 0 0" }}>Flat / Wing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && users.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Loading network data...</td></tr>
                      ) : users.map((u, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px", fontWeight: "600" }}>{u.name}</td>
                          <td style={{ padding: "12px", color: "var(--text-muted)" }}>{u.email}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ 
                              background: u.role === "admin" ? "#fef08a" : u.role === "guard" ? "#bfdbfe" : "#bbf7d0",
                              color: u.role === "admin" ? "#854d0e" : u.role === "guard" ? "#1d4ed8" : "#166534",
                              padding: "4px 8px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase"
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px", color: "#64748b" }}>{u.flat_number ? `Flat ${u.flat_number}` : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="portal-col-4">
              <div className="page-box">
                <h2>Create New User</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Provision a new Guard or Resident account.</p>
                <form onSubmit={e => { e.preventDefault(); handleProvision(); }}>
                   <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" placeholder="Jane Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                   </div>
                   <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" placeholder="jane@society.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                   </div>
                   <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                   </div>
                   <div className="form-group">
                      <label>Temporary Password</label>
                      <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                   </div>
                   <div className="form-group">
                      <label>Account Role</label>
                      <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                        <option value="guard">Security Guard</option>
                        <option value="resident">Resident</option>
                        <option value="admin">Administrator</option>
                      </select>
                   </div>
                   {form.role === "resident" && (
                     <div className="form-group">
                        <label>Flat Number</label>
                        <input type="text" placeholder="101" value={form.flat_no} onChange={e => setForm({...form, flat_no: e.target.value})} required />
                     </div>
                   )}
                   <button type="submit" className="btn-signin" disabled={loading} style={{ marginTop: "1rem" }}>
                     {loading ? 'Connecting...' : '+ Provision Account'}
                   </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}