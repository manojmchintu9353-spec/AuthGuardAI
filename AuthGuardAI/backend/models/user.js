const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    failedLoginAttempts: {
      type: Number,
      default: 0
    },

    lockedUntil: {
      type: Date,
      default: null
    },

    knownDevices: {
      type: [String],
      default: []
    },

    knownIPs: {
      type: [String],
      default: []
    },

    loginHours: {
      type: [Number],
      default: []
    },

    lastLogin: {
      type: Date,
      default: null
    },

    lastFailedLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);