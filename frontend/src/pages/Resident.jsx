import { useState, useEffect } from "react";
import API from "../api";
import "../App.css";

export default function Resident() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [preForm, setPreForm] = useState({ name: "", date: new Date().toISOString().split("T")[0], time: "", purpose: "" });
  const [historyFilter, setHistoryFilter] = useState("all");

  const user = JSON.parse(window.localStorage.getItem("currentUser") || "null");

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
    // Poll every 10 seconds for real-time vibe
    const interval = setInterval(fetchVisits, 10000);
    return () => clearInterval(interval);
  }, []);

  const myVisits = visits.filter(v => v.flat_no === user?.flat_no);
  
  const pendingVisits = myVisits.filter(v => v.status === "pending");
  const expectedVisits = myVisits.filter(v => v.status === "expected");
  const historyVisits = myVisits.filter(v => v.status === "approved" || v.status === "rejected");
  const filteredHistory = historyFilter === "all" ? historyVisits : historyVisits.filter(v => v.status === historyFilter);

  const stats = {
    total: myVisits.length,
    pending: pendingVisits.length,
    expected: expectedVisits.length
  };

  const approve = async (id) => {
    try {
      await API.put(`/visit/${id}/approve`);
      fetchVisits();
    } catch (err) {
      alert("Error approving visit. " + (err.response?.data?.error || err.message));
    }
  };

  const reject = async (id) => {
    try {
      await API.put(`/visit/${id}/reject`);
      fetchVisits();
    } catch (err) {
      alert("Error rejecting visit. " + (err.response?.data?.error || err.message));
    }
  };

  const submitPreApprove = async () => {
    if (!preForm.name || !preForm.date || !preForm.time) {
      alert("Please fill name, date, and time");
      return;
    }
    try {
      await API.post("/visit/expected", {
        name: preForm.name,
        date: preForm.date,
        time: preForm.time,
        purpose: preForm.purpose
      });
      setPreForm({ name: "", date: new Date().toISOString().split("T")[0], time: "", purpose: "" });
      fetchVisits();
      alert("Guest Pre-Approved Successfully. The guard has been notified.");
    } catch (err) {
      alert("Error generating expected pass: " + (err.response?.data?.error || err.message));
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
          <h1>🏠 Resident Portal</h1>
        </div>
        <div className="portal-user-info">
          <span>{user?.flat_no ? `Flat ${user.flat_no}` : "Flat Not Set"} • {user?.email}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="portal-content">
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stats-card">
            <div className="stat-number" style={{ color: "#3b82f6" }}>{stats.total}</div>
            <div className="stat-label">Total Visits</div>
          </div>
          <div className="stats-card">
            <div className="stat-number" style={{ color: "#fbbf24" }}>{stats.pending}</div>
            <div className="stat-label">Action Required</div>
          </div>
          <div className="stats-card">
            <div className="stat-number" style={{ color: "#8b5cf6" }}>{stats.expected}</div>
            <div className="stat-label">Expected Guests</div>
          </div>
        </div>

        <div className="portal-row">
          <div className="portal-col-6">
            <div className="page-box" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h2>⚠️ Action Required (Pending)</h2>
              <div className="visits-list">
                {loading ? <p style={{ textAlign: "center", color: "#9ca3af" }}>Loading network data...</p> : 
                  (pendingVisits.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#9ca3af", padding: "1rem" }}>No pending approvals right now.</p>
                  ) : (
                    pendingVisits.map(v => (
                      <div key={v.visit_id} className="visit-card" style={{ background: "rgba(251, 191, 36, 0.05)" }}>
                        <div className="visit-header">
                          <div>
                            <strong>{v.visitor_name}</strong>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>{v.purpose}</p>
                          </div>
                          <span className={`status-badge status-${v.status}`}>{v.status.toUpperCase()}</span>
                        </div>
                        <div className="action-buttons">
                          <button onClick={() => approve(v.visit_id)} className="btn-approve">✓ Approve</button>
                          <button onClick={() => reject(v.visit_id)} className="btn-reject">✕ Reject</button>
                        </div>
                      </div>
                    ))
                  ))
                }
              </div>
            </div>

            <div className="page-box" style={{ marginTop: "1.5rem" }}>
              <h2>Pre-Approve a Visitor</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Expecting someone? Pre-approve them so they don't have to wait at the gate.
              </p>
              <form onSubmit={e => { e.preventDefault(); submitPreApprove(); }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label>Guest Name *</label>
                    <input type="text" placeholder="Full Name" value={preForm.name} onChange={e => setPreForm({ ...preForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Expected Date *</label>
                    <input type="date" value={preForm.date} onChange={e => setPreForm({ ...preForm, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Expected Time *</label>
                    <input type="time" value={preForm.time} onChange={e => setPreForm({ ...preForm, time: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label>Purpose / Note</label>
                    <input type="text" placeholder="e.g. Birthday Party, Fixing AC" value={preForm.purpose} onChange={e => setPreForm({ ...preForm, purpose: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-signin" disabled={loading} style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", marginTop: "0.5rem" }}>
                  {loading ? 'Connecting...' : 'Generate Entry Pass'}
                </button>
              </form>
            </div>
          </div>

          <div className="portal-col-6">
            <div className="page-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ margin: 0 }}>Visit History</h2>
                <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} style={{ width: "auto", padding: "0.5rem", marginBottom: 0 }}>
                  <option value="all">All Past Visits</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className="visits-list">
                {expectedVisits.map(v => (
                  <div key={v.visit_id} className="visit-card" style={{ borderLeft: "3px solid #8b5cf6", background: "rgba(139, 92, 246, 0.05)" }}>
                    <div className="visit-header">
                      <div>
                        <strong>{v.visitor_name}</strong>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>{v.purpose}</p>
                      </div>
                      <span className="status-badge" style={{ background: "#ede9fe", color: "#8b5cf6", border: "1px solid #ddd6fe" }}>EXPECTED</span>
                    </div>
                    <p style={{ margin: "10px 0 0", fontSize: "0.85rem", color: "var(--text-main)", fontWeight: "600" }}>⏱ Expected at: {new Date(v.check_in_time).toLocaleString()}</p>
                  </div>
                ))}
                
                {filteredHistory.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>No past visits to display</p>
                ) : (
                  filteredHistory.map(v => (
                    <div key={v.visit_id} className="visit-card">
                      <div className="visit-header">
                        <div>
                          <strong>{v.visitor_name}</strong>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>{v.purpose}</p>
                        </div>
                        <span className={`status-badge status-${v.status}`}>{v.status.toUpperCase()}</span>
                      </div>
                      <p style={{ margin: "10px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(v.check_in_time).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}