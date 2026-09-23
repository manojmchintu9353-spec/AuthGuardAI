require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json());


// Authentication routes
app.use("/api/auth", authRoutes);


// Test route
app.get("/", (req, res) => {
  res.json({
    message: "AuthGuard AI Backend is running"
  });
});


const PORT = process.env.PORT || 5000;


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {

    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });

  })
  .catch((error) => {

    console.error(
      "MongoDB connection error:",
      error.message
    );

  });