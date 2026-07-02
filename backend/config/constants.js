/**
 * Application-wide constants and health thresholds.
 */

// ── Health alert thresholds ───────────────────────────────────
const HEALTH_THRESHOLDS = {
  bloodSugar: {
    low:       { min: 0,   max: 70  },
    normal:    { min: 70,  max: 140 },
    high:      { min: 140, max: 250 },
    emergency: { min: 250, max: Infinity }
  },
  systolicBP: {
    low:       { min: 0,   max: 90  },
    normal:    { min: 90,  max: 120 },
    elevated:  { min: 120, max: 140 },
    high:      { min: 140, max: 180 },
    emergency: { min: 180, max: Infinity }
  },
  diastolicBP: {
    normal:    { min: 0,   max: 80  },
    high:      { min: 80,  max: 120 },
    emergency: { min: 120, max: Infinity }
  },
  heartRate: {
    low:       { min: 0,   max: 60  },
    normal:    { min: 60,  max: 100 },
    high:      { min: 100, max: 120 },
    emergency: { min: 120, max: Infinity }
  },
  oxygenLevel: {
    normal:    { min: 95,  max: 100 },
    low:       { min: 90,  max: 95  },
    emergency: { min: 0,   max: 90  }
  },
  temperature: {
    low:       { min: 0,   max: 36.0 },
    normal:    { min: 36.0, max: 37.5 },
    fever:     { min: 37.5, max: 39.0 },
    emergency: { min: 39.0, max: Infinity }
  },
  cholesterol: {
    normal:    { min: 0,   max: 200 },
    elevated:  { min: 200, max: 240 },
    high:      { min: 240, max: Infinity }
  }
};

// ── Disease types ─────────────────────────────────────────────
const DISEASE_TYPES = [
  'Diabetes Type 1',
  'Diabetes Type 2',
  'Hypertension',
  'Heart Disease',
  'Asthma',
  'COPD',
  'Obesity',
  'Arthritis',
  'Other'
];

// ── Risk levels ───────────────────────────────────────────────
const RISK_LEVELS = {
  LOW:    'Low',
  MEDIUM: 'Medium',
  HIGH:   'High',
  CRITICAL: 'Critical'
};

module.exports = { HEALTH_THRESHOLDS, DISEASE_TYPES, RISK_LEVELS };
