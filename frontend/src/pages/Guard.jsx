import { useState, useEffect } from "react";
import API from "../api";
import "../App.css";

export default function Guard() {
  const [form, setForm] = useState({
    name: "",
    phone_no: "",
    flat_no: "",
    vehicle_no: "",
    vehicle_type: "None",
    entry_date: new Date().toISOString().split("T")[0],
    entry_time: new Date().toTimeString().split(" ")[0].slice(0, 5)
  });
  
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = async () => {
    try {
      const { data } = await API.get("/visits/global");
      setVisits(data);
    } catch (err) {
      console.error("Fetch visits error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
    const interval = setInterval(fetchVisits, 10000);
    return () => clearInterval(interval);
  }, []);

  const user = JSON.parse(window.localStorage.getItem("currentUser") || "null");

  const expectedVisits = visits.filter(v => v.status === "expected");
  const activeVisits = visits.filter(v => v.status !== "expected");

  const stats = {
    pending: activeVisits.filter(v => v.status === "pending").length,
    approved: activeVisits.filter(v => v.status === "approved").length,
    rejected: activeVisits.filter(v => v.status === "rejected").length
  };

  const submit = async () => {
    if (!form.name || !form.phone_no || !form.flat_no) {
      alert("Please fill all required fields");
      return;
    }
    
    try {
      await API.post("/visit", {
         name: form.name,
         phone_no: form.phone_no,
         flat_no: form.flat_no,
         vehicle_no: form.vehicle_no,
         vehicle_type: form.vehicle_type,
         entry_date: form.entry_date,
         entry_time: form.entry_time
      });
      setForm({ 
        name: "", phone_no: "", flat_no: "", vehicle_no: "", vehicle_type: "None",
        entry_date: new Date().toISOString().split("T")[0],
        entry_time: new Date().toTimeString().split(" ")[0].slice(0, 5)
      });
      fetchVisits();
      alert("Visitor Added Successfully!");
    } catch (err) {
      alert("Failed to add visitor: " + (err.response?.data?.error || err.message));
    }
  };

  const handleMarkArrived = async (expected_id) => {
    try {
       await API.put(`/visit/${expected_id}/arrive`);
       fetchVisits();
       alert("Marked as Arrived and Approved!");
    } catch (err) {
       alert("Failed to mark arrived: " + (err.response?.data?.error || err.message));
    }
  };

  const logout = () => {
    window.localStorage.clear();
    window.location = "/login";
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="portal-title">
          <h1>🛡️ Guard Portal</h1>
        </div>
        <div className="portal-user-info">
          <span>{user?.email}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="portal-content">
        <div className="portal-row">
          <div className="portal-col-6">
            <div className="page-box">
              <h2>Today's Dashboard</h2>
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="stats-card">
                  <div className="stat-number" style={{ color: "#fbbf24" }}>{stats.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
                <div className="stats-card">
                  <div className="stat-number" style={{ color: "#10b981" }}>{stats.approved}</div>
                  <div className="stat-label">Approved</div>
                </div>
                <div className="stats-card">
                  <div className="stat-number" style={{ color: "#ef4444" }}>{stats.rejected}</div>
                  <div className="stat-label">Rejected</div>
                </div>
              </div>
            </div>

            <div className="page-box" style={{ marginTop: "1.5rem", borderLeft: "4px solid #8b5cf6" }}>
              <h2>📋 Expected Visitors (Pre-Approved)</h2>
              <div className="visits-list">
                {loading ? <p style={{ textAlign: "center", color: "#9ca3af" }}>Loading network data...</p> : 
                  (expectedVisits.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#9ca3af" }}>No expected visitors right now.</p>
                  ) : (
                    expectedVisits.map(v => (
                      <div key={v.visit_id} className="visit-card" style={{ background: "rgba(139, 92, 246, 0.05)" }}>
                        <div className="visit-header">
                          <div>
                            <strong>{v.visitor_name}</strong>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Flat {v.flat_no} • {v.purpose}</p>
                          </div>
                          <span className="status-badge" style={{ background: "#ede9fe", color: "#8b5cf6", border: "1px solid #ddd6fe" }}>EXPECTED</span>
                        </div>
                        <p style={{ margin: "10px 0 0", fontSize: "0.85rem", color: "var(--text-main)", fontWeight: "600" }}>⏱ Expected at: {new Date(v.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <button 
                          onClick={() => handleMarkArrived(v.visit_id)}
                          className="btn-signin"
                          style={{ marginTop: "1rem", background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" }}>
                          ✅ Mark Arrived (Approved)
                        </button>
                      </div>
                    ))
                  ))
                }
              </div>
            </div>
            
            <div className="page-box" style={{ marginTop: "1.5rem" }}>
              <h2>Today's Visitor List</h2>
              <div className="visits-list">
                {activeVisits.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#9ca3af" }}>No visitors recorded yet</p>
                ) : (
                  activeVisits.map(v => (
                    <div key={v.visit_id} className="visit-card">
                      <div className="visit-header">
                        <div>
                           <strong>{v.visitor_name}</strong>
                           <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Flat {v.flat_no} • {v.purpose}</p>
                        </div>
                        <span className={`status-badge status-${v.status}`}>{v.status.toUpperCase()}</span>
                      </div>
                      <p style={{ margin: "10px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(v.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="portal-col-6">
            <div className="page-box">
              <h2>New Visitor Entry</h2>
              <form onSubmit={e => { e.preventDefault(); submit(); }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 1rem" }}>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone No *</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={form.phone_no}
                      onChange={e => setForm({ ...form, phone_no: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Flat No *</label>
                    <input
                      type="text"
                      placeholder="101"
                      value={form.flat_no}
                      onChange={e => setForm({ ...form, flat_no: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle No</label>
                    <input
                      type="text"
                      placeholder="MH 01 AB 1234"
                      value={form.vehicle_no}
                      onChange={e => setForm({ ...form, vehicle_no: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <select value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}>
                      <option value="None">None</option>
                      <option value="2-Wheeler">2-Wheeler</option>
                      <option value="4-Wheeler">4-Wheeler</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Entry Date</label>
                    <input
                      type="date"
                      value={form.entry_date}
                      onChange={e => setForm({ ...form, entry_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label>Entry Time</label>
                    <input
                      type="time"
                      value={form.entry_time}
                      onChange={e => setForm({ ...form, entry_time: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-signin" disabled={loading} style={{ marginTop: "0.5rem" }}>
                  {loading ? 'Connecting...' : 'Add Visitor'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}