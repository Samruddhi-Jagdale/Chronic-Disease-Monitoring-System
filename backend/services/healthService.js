/**
 * Health analysis service — evaluates readings, calculates risk,
 * detects emergencies, and parses watsonx.ai response text.
 */

const { HEALTH_THRESHOLDS, RISK_LEVELS } = require('../config/constants');

// ── Emergency detection ───────────────────────────────────────
function detectEmergencies(data) {
  const alerts = [];

  if (data.bloodSugar > 250) {
    alerts.push({
      type:    'Critical Blood Sugar',
      value:   `${data.bloodSugar} mg/dL`,
      message: 'Blood sugar is critically high (>250 mg/dL). Seek immediate medical attention.',
      severity: 'critical'
    });
  } else if (data.bloodSugar < 70) {
    alerts.push({
      type:    'Low Blood Sugar',
      value:   `${data.bloodSugar} mg/dL`,
      message: 'Blood sugar is dangerously low (<70 mg/dL). Consume fast-acting sugar and seek help.',
      severity: 'critical'
    });
  }

  if (data.systolicBP > 180 || data.diastolicBP > 120) {
    alerts.push({
      type:    'Hypertensive Crisis',
      value:   `${data.systolicBP}/${data.diastolicBP} mmHg`,
      message: 'Blood pressure is at crisis level (>180/120). Seek emergency medical care immediately.',
      severity: 'critical'
    });
  }

  if (data.heartRate > 120) {
    alerts.push({
      type:    'Tachycardia',
      value:   `${data.heartRate} bpm`,
      message: 'Heart rate is critically elevated (>120 bpm). Seek immediate medical attention.',
      severity: 'critical'
    });
  } else if (data.heartRate < 40) {
    alerts.push({
      type:    'Bradycardia',
      value:   `${data.heartRate} bpm`,
      message: 'Heart rate is dangerously low (<40 bpm). Seek immediate medical attention.',
      severity: 'critical'
    });
  }

  if (data.oxygenLevel < 90) {
    alerts.push({
      type:    'Critical Low Oxygen',
      value:   `${data.oxygenLevel}%`,
      message: 'Oxygen saturation is critically low (<90%). Seek emergency medical care.',
      severity: 'critical'
    });
  }

  if (data.temperature > 39.0) {
    alerts.push({
      type:    'High Fever',
      value:   `${data.temperature}°C`,
      message: 'High fever detected (>39°C). Seek medical attention.',
      severity: 'high'
    });
  }

  return alerts;
}

// ── Simple rule-based risk calculation ───────────────────────
function calculateRiskScore(data) {
  let score = 0;

  // Blood sugar
  if (data.bloodSugar > 250 || data.bloodSugar < 70)  score += 4;
  else if (data.bloodSugar > 200)                      score += 3;
  else if (data.bloodSugar > 140)                      score += 1;

  // Blood pressure (systolic)
  if (data.systolicBP > 180)   score += 4;
  else if (data.systolicBP > 160) score += 3;
  else if (data.systolicBP > 140) score += 2;
  else if (data.systolicBP > 120) score += 1;

  // Heart rate
  if (data.heartRate > 120 || data.heartRate < 40) score += 3;
  else if (data.heartRate > 100)                   score += 1;

  // Oxygen level
  if (data.oxygenLevel < 90)      score += 4;
  else if (data.oxygenLevel < 95) score += 2;

  // Cholesterol
  if (data.cholesterol > 240)      score += 2;
  else if (data.cholesterol > 200) score += 1;

  // Lifestyle
  if (data.sleepHours < 5 || data.sleepHours > 10) score += 1;
  if (data.exercise < 10)  score += 1;
  if (data.waterIntake < 1.5) score += 1;

  // BMI
  if (data.bmi > 35 || data.bmi < 16) score += 2;
  else if (data.bmi > 30 || data.bmi < 18.5) score += 1;

  return score;
}

function riskLevelFromScore(score) {
  if (score >= 8)  return RISK_LEVELS.CRITICAL;
  if (score >= 5)  return RISK_LEVELS.HIGH;
  if (score >= 2)  return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
}

// ── Health score (0–100 for dashboard) ───────────────────────
function calculateHealthScore(data) {
  const score = calculateRiskScore(data);
  // Invert: higher risk → lower health score
  return Math.max(0, Math.min(100, 100 - score * 7));
}

// ── Parse raw watsonx text response ──────────────────────────
function parseAIResponse(rawText) {
  const extract = (label) => {
    const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i');
    const match = rawText.match(regex);
    return match ? match[1].trim() : null;
  };

  return {
    riskLevel:       extract('RISK_LEVEL')       || 'Medium',
    concerns:        extract('HEALTH_CONCERNS')  || 'Unable to parse concerns.',
    analysis:        extract('ANALYSIS')         || rawText,
    dietPlan:        extract('DIET_PLAN')        || '',
    exercisePlan:    extract('EXERCISE_PLAN')    || '',
    lifestyleTips:   extract('LIFESTYLE_TIPS')   || '',
    medicationsNote: extract('MEDICATIONS_NOTE') || '',
    emergencyAction: extract('EMERGENCY_ACTION') || ''
  };
}

module.exports = {
  detectEmergencies,
  calculateRiskScore,
  riskLevelFromScore,
  calculateHealthScore,
  parseAIResponse
};
