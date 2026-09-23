const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    email: {
      type: String,
      required: true
    },

    event: {
      type: String,
      required: true
    },

    riskScore: {
      type: Number,
      default: 0
    },

    ipAddress: {
      type: String,
      default: "unknown"
    },

    userAgent: {
      type: String,
      default: "unknown"
    },

    message: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "SecurityEvent",
  securityEventSchema
);