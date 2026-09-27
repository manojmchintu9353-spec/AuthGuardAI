function calculateRisk({
  failedAttempts,
  isNewDevice,
  isNewIP,
  rapidAttempts,
  isUnusualTime
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

  if (isUnusualTime) {
    score += 15;
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

function detectUnusualLoginTime(loginHours, currentHour) {
  if (!loginHours || loginHours.length < 3) {
    return false;
  }

  const mean = loginHours.reduce(function (a, b) { return a + b; }, 0) / loginHours.length;

  const variance = loginHours.reduce(function (sum, h) {
    return sum + Math.pow(h - mean, 2);
  }, 0) / loginHours.length;

  const stdDev = Math.sqrt(variance);

  let diff = Math.abs(currentHour - mean);
  if (diff > 12) diff = 24 - diff;

  const threshold = Math.max(stdDev * 2, 3);

  return diff > threshold;
}

module.exports = {
  calculateRisk,
  detectUnusualLoginTime
};