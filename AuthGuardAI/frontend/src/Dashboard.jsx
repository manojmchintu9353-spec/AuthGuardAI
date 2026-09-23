import { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000/api/auth";

function getRiskColor(score) {
  if (score >= 70) return "#ef4444";
  if (score >= 30) return "#f59e0b";
  return "#4ade80";
}

function formatEventLabel(event) {
  const labels = {
    SUCCESSFUL_LOGIN: "Successful Login",
    FAILED_LOGIN: "Failed Login Attempt",
    ACCOUNT_PROTECTED: "Account Locked",
    ACCOUNT_CREATED: "Account Created",
    UNKNOWN_LOGIN: "Unknown Account Login Attempt",
  };
  return labels[event] || event;
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function Dashboard({ user, onLogout }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(API_BASE + "/security-events", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setEvents(data.events || []);
        } else {
          setError(data.message || "Could not load security activity");
        }
      } catch (err) {
        setError("Could not reach server");
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080b16",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        flexDirection: "column",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <h1>AuthGuardAI</h1>
          <p style={{ color: "#9ca3af" }}>Secure Authentication System</p>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "30px 40px",
            borderRadius: "16px",
            background: "#11162a",
            border: "1px solid #1f2a44",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 8px 0" }}>Welcome, {user?.name}!</h2>
          <p style={{ color: "#9ca3af", margin: 0 }}>{user?.email}</p>

          <div
            style={{
              marginTop: "20px",
              padding: "10px 16px",
              borderRadius: "20px",
              border: "1px solid #4ade80",
              background: "#4ade801a",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#4ade80",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#4ade80", fontWeight: 600, fontSize: "13px" }}>
              LOW RISK - Session Secure
            </span>
          </div>

          <button
            onClick={onLogout}
            style={{
              display: "block",
              marginTop: "25px",
              padding: "12px 30px",
              background: "transparent",
              color: "#ff6b6b",
              border: "1px solid #ff6b6b",
              borderRadius: "10px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Logout
          </button>
        </div>

        <div
          style={{
            marginTop: "25px",
            padding: "25px 30px",
            borderRadius: "16px",
            background: "#11162a",
            border: "1px solid #1f2a44",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0" }}>Recent Security Activity</h3>

          {loadingEvents && <p style={{ color: "#9ca3af" }}>Loading activity...</p>}

          {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

          {!loadingEvents && !error && events.length === 0 && (
            <p style={{ color: "#9ca3af" }}>No recent activity found.</p>
          )}

          {!loadingEvents &&
            events.map(function (evt) {
              return (
                <div
                  key={evt._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #1f2a44",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{formatEventLabel(evt.event)}</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>
                      {formatTime(evt.createdAt)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      border: "1px solid " + getRiskColor(evt.riskScore || 0),
                      color: getRiskColor(evt.riskScore || 0),
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Risk: {evt.riskScore || 0}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;