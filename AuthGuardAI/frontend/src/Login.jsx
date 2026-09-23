import { useState } from "react";

const API_BASE = "http://localhost:5000/api/auth";

function getRiskColor(score) {
  if (score >= 70) return "#ef4444";
  if (score >= 30) return "#f59e0b";
  return "#4ade80";
}

function getRiskLabel(score) {
  if (score >= 70) return "HIGH RISK";
  if (score >= 30) return "MEDIUM RISK";
  return "LOW RISK";
}

function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [riskScore, setRiskScore] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    setRiskScore(null);

    const endpoint = mode === "login" ? "/login" : "/register";
    const body =
      mode === "login" ? { email, password } : { name, email, password };

    try {
      const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data.message || "Something went wrong");
        if (typeof data.riskScore === "number") {
          setRiskScore(data.riskScore);
        }
        return;
      }

      if (mode === "login") {
        localStorage.setItem("token", data.token);
        setMessage("Welcome, " + data.user.name + "!");
        setRiskScore(0);
        setTimeout(function () {
          onLoginSuccess(data.user);
        }, 600);
      } else {
        setMessage("Registered! You can now log in.");
        setMode("login");
      }
    } catch (err) {
      setIsError(true);
      setMessage("Could not reach server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080b16",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <h1>AuthGuardAI</h1>
      <p>Secure Authentication System</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {mode === "register" && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={function (e) { setName(e.target.value); }}
            required
            style={{ padding: "15px", margin: "10px", width: "300px" }}
          />
        )}

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={function (e) { setEmail(e.target.value); }}
          required
          style={{ padding: "15px", margin: "10px", width: "300px" }}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={function (e) { setPassword(e.target.value); }}
          required
          style={{ padding: "15px", margin: "10px", width: "300px" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "15px 40px",
            marginTop: "10px",
            background: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Authenticate" : "Register"}
        </button>
      </form>

      {message && (
        <p style={{ color: isError ? "#ff6b6b" : "#4ade80", marginTop: "10px", marginBottom: 0 }}>
          {message}
        </p>
      )}

      {riskScore !== null && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 18px",
            borderRadius: "20px",
            border: "1px solid " + getRiskColor(riskScore),
            background: getRiskColor(riskScore) + "1a",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: getRiskColor(riskScore),
              display: "inline-block",
            }}
          />
          <span style={{ color: getRiskColor(riskScore), fontWeight: 600, fontSize: "13px", letterSpacing: "0.5px" }}>
            {getRiskLabel(riskScore)} - Score: {riskScore}
          </span>
        </div>
      )}

      <p
        onClick={function () {
          setMode(mode === "login" ? "register" : "login");
          setMessage("");
          setRiskScore(null);
        }}
        style={{ marginTop: "15px", cursor: "pointer", textDecoration: "underline", color: "#a5b4fc" }}
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </p>
    </div>
  );
}

export default Login;