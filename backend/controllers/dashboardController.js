/**
 * Dashboard Controller
 * Aggregates data for the main dashboard view.
 */

const { HealthReportModel, PatientModel, MedicationModel } = require('../models/store');
const healthSvc = require('../services/healthService');

function getDashboard(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const patient    = PatientModel.findByUserId(userId);
    const latest     = HealthReportModel.latest(userId);
    const reports    = HealthReportModel.findByUserId(userId, 5);
    const totalReports = HealthReportModel.count(userId);
    const today      = new Date().toISOString().split('T')[0];
    const todayMeds  = MedicationModel.findByUserId(userId).filter(m => {
      if (!m.active) return false;
      if (m.endDate && m.endDate < today) return false;
      return true;
    });

    // Health tips rotation
    const tips = [
      'Take your medications at the same time every day.',
      'Staying hydrated helps regulate blood pressure and blood sugar.',
      'Even a 10-minute walk after meals can improve blood sugar control.',
      'Monitor your readings regularly and log changes for your doctor.',
      'Deep breathing for 5 minutes can lower blood pressure.',
      'Reduce sodium to under 2,300 mg/day to support heart health.',
      'Sleep 7–8 hours to help your body regulate hormones.',
      'Avoid sugary drinks — choose water or herbal tea instead.'
    ];
    const tip = tips[new Date().getDate() % tips.length];

    res.json({
      success: true,
      dashboard: {
        totalReports,
        latestHealthScore: latest?.healthScore || null,
        currentRiskLevel:  latest?.riskLevel   || 'No Data',
        todayMedications:  todayMeds,
        recentReports:     reports,
        healthTip:         tip,
        patientName:       patient?.name || req.session.userName,
        diseaseType:       patient?.diseaseType || 'Not set'
      }
    });
  } catch (err) {
    console.error('[Dashboard] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
}

module.exports = { getDashboard };
