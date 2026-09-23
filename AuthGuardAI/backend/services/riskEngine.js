function calculateRisk({
  failedAttempts,
  isNewDevice,
  isNewIP,
  rapidAttempts
}) {
  let score = 0;

  score += failedAttempts * 15;

  if (isNewDevice) {
    score += 20;
  }

  if (isNewIP) {
    score += 15;
  }

  if (rapidAttempts) {
    score += 20;
  }

  if (score > 100) {
    score = 100;
  }

  let level = "LOW";

  if (score >= 70) {
    level = "HIGH";
  } else if (score >= 40) {
    level = "MEDIUM";
  }

  return {
    score,
    level
  };
}

module.exports = {
  calculateRisk
};