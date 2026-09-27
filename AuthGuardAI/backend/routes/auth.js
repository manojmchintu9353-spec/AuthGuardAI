const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const SecurityEvent = require("../models/SecurityEvent");
const { calculateRisk } = require("../services/riskEngine");
const { sendSecurityAlert } = require("../services/emailService");

const router = express.Router();


// =========================
// REGISTER
// =========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    await SecurityEvent.create({
      userId: user._id,
      email: user.email,
      event: "ACCOUNT_CREATED",
      message: "New account created"
    });

    res.status(201).json({
      message: "Registration successful"
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
});


// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.toLowerCase();

    const userAgent = req.headers["user-agent"] || "unknown-device";
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-ip";

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {

      await SecurityEvent.create({
        email: normalizedEmail,
        event: "UNKNOWN_LOGIN",
        riskScore: 40,
        message: "Login attempt for unknown account"
      });

      return res.status(401).json({
        message: "Invalid email or password"
      });
    }


    if (
      user.lockedUntil &&
      user.lockedUntil > new Date()
    ) {

      return res.status(423).json({
        message: "Account temporarily protected",
        failedAttempts: user.failedLoginAttempts
      });
    }


    const passwordCorrect = await bcrypt.compare(
      password,
      user.passwordHash
    );


    // =========================
    // ANOMALY DETECTION SIGNALS
    // =========================
    const knownDevices = user.knownDevices || [];
    const knownIPs = user.knownIPs || [];

    const isNewDevice = !knownDevices.includes(userAgent);
    const isNewIP = !knownIPs.includes(ipAddress);

    const rapidAttempts =
      user.lastFailedLogin &&
      (Date.now() - new Date(user.lastFailedLogin).getTime()) < 10000;


    if (!passwordCorrect) {

      user.failedLoginAttempts += 1;
      user.lastFailedLogin = new Date();

      const risk = calculateRisk({
        failedAttempts: user.failedLoginAttempts,
        isNewDevice,
        isNewIP,
        rapidAttempts
      });

      let anomalyNote = "";
      if (isNewDevice) anomalyNote += " New device detected.";
      if (isNewIP) anomalyNote += " New IP address detected.";
      if (rapidAttempts) anomalyNote += " Rapid repeated attempts detected.";

      await SecurityEvent.create({
        userId: user._id,
        email: user.email,
        event: "FAILED_LOGIN",
        riskScore: risk.score,
        message: "Failed login attempt " + user.failedLoginAttempts + "." + anomalyNote
      });


      if (user.failedLoginAttempts >= 3) {

        user.lockedUntil = new Date(
          Date.now() + 10 * 60 * 1000
        );

        await SecurityEvent.create({
          userId: user._id,
          email: user.email,
          event: "ACCOUNT_PROTECTED",
          riskScore: 100,
          message: "Three unauthorized login attempts detected."
        });

        await user.save();

        sendSecurityAlert({
          toEmail: user.email,
          subject: "AuthGuardAI: Account Locked",
          heading: "Your account was temporarily locked",
          message: "We detected 3 failed login attempts on your account and locked it for 10 minutes to keep you safe.",
          riskScore: 100
        });

        return res.status(423).json({
          message: "SECURITY ALERT: 3 unauthorized login attempts detected!",
          riskScore: 100,
          failedAttempts: user.failedLoginAttempts,
          protection: "Account locked for 10 minutes"
        });
      }


      await user.save();

      return res.status(401).json({
        message: "Invalid email or password",
        failedAttempts: user.failedLoginAttempts,
        riskScore: risk.score
      });
    }


    // =========================
    // SUCCESSFUL LOGIN
    // =========================

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastFailedLogin = null;
    user.lastLogin = new Date();

    if (isNewDevice) {
      knownDevices.push(userAgent);
      user.knownDevices = knownDevices.slice(-5);
    }

    if (isNewIP) {
      knownIPs.push(ipAddress);
      user.knownIPs = knownIPs.slice(-5);
    }

    await user.save();


    const successRisk = calculateRisk({
      failedAttempts: 0,
      isNewDevice,
      isNewIP,
      rapidAttempts: false
    });

    let successNote = "Successful login.";
    if (isNewDevice) successNote += " First login from this device.";
    if (isNewIP) successNote += " First login from this IP.";

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );


    await SecurityEvent.create({
      userId: user._id,
      email: user.email,
      event: "SUCCESSFUL_LOGIN",
      riskScore: successRisk.score,
      message: successNote
    });


    if (isNewDevice || isNewIP) {
      sendSecurityAlert({
        toEmail: user.email,
        subject: "AuthGuardAI: New Login Detected",
        heading: "New login to your account",
        message: successNote + " If this was you, no action is needed.",
        riskScore: successRisk.score
      });
    }


    res.json({
      message: "Login successful",
      token,
      riskScore: successRisk.score,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
});


// =========================
// GET SECURITY EVENTS (recent activity)
// =========================
router.get("/security-events", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const events = await SecurityEvent.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ events });

  } catch (error) {
    console.error("SECURITY EVENTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// =========================
// REPORT INTRUDER (webcam capture on lockout)
// =========================
router.post("/report-intruder", async (req, res) => {
  try {
    const { email, imageBase64 } = req.body;

    if (!email || !imageBase64) {
      return res.status(400).json({ message: "Email and image are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendSecurityAlert({
      toEmail: user.email,
      subject: "AuthGuardAI: Intruder Snapshot Captured",
      heading: "A photo was captured during a locked-out login attempt",
      message: "Your account was locked after 3 failed attempts. A snapshot was taken at the moment of the attempt for your review.",
      riskScore: 100,
      imageBase64: imageBase64
    });

    res.json({ message: "Snapshot sent" });

  } catch (error) {
    console.error("INTRUDER REPORT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;