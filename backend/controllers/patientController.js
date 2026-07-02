/**
 * Patient Controller
 * Create / retrieve patient profile.
 */

const { PatientModel } = require('../models/store');

// ── Save patient profile ──────────────────────────────────────
function savePatient(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const { name, age, gender, height, weight, diseaseType, phone, email } = req.body;

    // Basic validation
    if (!name || !age || !gender || !diseaseType) {
      return res.status(400).json({ success: false, message: 'Name, age, gender, and disease type are required.' });
    }

    // Calculate BMI
    const heightM = parseFloat(height) / 100;
    const bmi     = heightM > 0
      ? parseFloat((parseFloat(weight) / (heightM * heightM)).toFixed(1))
      : null;

    const patient = PatientModel.create({
      userId, name, age: parseInt(age), gender, height: parseFloat(height),
      weight: parseFloat(weight), bmi, diseaseType, phone, email
    });

    res.status(201).json({ success: true, message: 'Patient profile saved.', patient });
  } catch (err) {
    console.error('[Patient] Save error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save patient profile.' });
  }
}

// ── Get patient profile ───────────────────────────────────────
function getPatient(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const patient = PatientModel.findByUserId(userId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient profile found.' });
    }

    res.json({ success: true, patient });
  } catch (err) {
    console.error('[Patient] Get error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve patient profile.' });
  }
}

module.exports = { savePatient, getPatient };
