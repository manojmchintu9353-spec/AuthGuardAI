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