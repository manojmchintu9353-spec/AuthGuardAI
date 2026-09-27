import { useState, useRef } from "react";

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

function playAlertSiren() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();

    const duration = 1.4;
    const startTime = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sawtooth";
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.15, startTime + 0.05);

    oscillator.frequency.setValueAtTime(600, startTime);
    oscillator.frequency.linearRampToValueAtTime(900, startTime + 0.35);
    oscillator.frequency.linearRampToValueAtTime(600, startTime + 0.7);
    oscillator.frequency.linearRampToValueAtTime(900, startTime + 1.05);
    oscillator.frequency.linearRampToValueAtTime(600, startTime + duration);

    gainNode.gain.setValueAtTime(0.15, startTime + duration - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  } catch (err) {
    console.log("Could not play alert sound:", err);
  }
}

function captureAndReportIntruder(email) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log("Camera not available in this browser");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (stream) {
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = function () {
        setTimeout(function () {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);

          stream.getTracks().forEach(function (track) {
            track.stop();
          });

          fetch(API_BASE + "/report-intruder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, imageBase64: imageBase64 })
          }).catch(function (err) {
            console.log("Could not send intruder snapshot:", err);
          });
        }, 500);
      };
    })
    .catch(function (err) {
      console.log("Camera permission denied or unavailable:", err);
    });
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

        const effectiveRisk = typeof data.riskScore === "number" ? data.riskScore : null;
        if (effectiveRisk !== null) {
          setRiskScore(effectiveRisk);
        }

        if (res.status === 423) {
          playAlertSiren();
          captureAndReportIntruder(email);
        } else if (effectiveRisk !== null && effectiveRisk >= 70) {
          playAlertSiren();
        }

        return;
      }

      if (mode === "login") {
        localStorage.setItem("token", data.token);
        setMessage("Welcome, " + data.user.name + "!");
        setRiskScore(typeof data.riskScore === "number" ? data.riskScore : 0);

        if (typeof data.riskScore === "number" && data.riskScore >= 70) {
          playAlertSiren();
        }

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