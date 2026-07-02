/**
 * Health Controller
 * Handles health data submission, AI analysis, and history retrieval.
 */

const { HealthReportModel, PatientModel } = require('../models/store');
const watsonxSvc  = require('../services/watsonxService');
const healthSvc   = require('../services/healthService');

// ── Submit health data and get AI analysis ────────────────────
async function submitHealth(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const {
      bloodSugar, systolicBP, diastolicBP, heartRate,
      cholesterol, bmi, oxygenLevel, temperature,
      exercise, waterIntake, sleepHours
    } = req.body;

    // Basic validation
    const required = { bloodSugar, systolicBP, diastolicBP, heartRate, oxygenLevel };
    for (const [key, val] of Object.entries(required)) {
      if (val === undefined || val === '') {
        return res.status(400).json({ success: false, message: `${key} is required.` });
      }
    }

    const healthData = {
      bloodSugar:   parseFloat(bloodSugar),
      systolicBP:   parseFloat(systolicBP),
      diastolicBP:  parseFloat(diastolicBP),
      heartRate:    parseFloat(heartRate),
      cholesterol:  parseFloat(cholesterol  || 180),
      bmi:          parseFloat(bmi          || 22),
      oxygenLevel:  parseFloat(oxygenLevel),
      temperature:  parseFloat(temperature  || 37.0),
      exercise:     parseFloat(exercise     || 30),
      waterIntake:  parseFloat(waterIntake  || 2),
      sleepHours:   parseFloat(sleepHours   || 7)
    };

    // Detect emergencies (rule-based, instant)
    const emergencyAlerts = healthSvc.detectEmergencies(healthData);
    const ruleRiskLevel   = healthSvc.riskLevelFromScore(healthSvc.calculateRiskScore(healthData));
    const healthScore     = healthSvc.calculateHealthScore(healthData);

    // Fetch patient profile for context
    const patient = PatientModel.findByUserId(userId);

    // ── AI Analysis via watsonx.ai ────────────────────────────
    let aiAnalysis;
    let aiSource = 'watsonx';

    if (!process.env.WATSONX_API_KEY || !process.env.WATSONX_PROJECT_ID) {
      // Not configured → return rule-based mock
      aiAnalysis = watsonxSvc.getMockHealthAnalysis();
      aiSource   = 'mock';
    } else {
      try {
        const prompt   = watsonxSvc.buildHealthAnalysisPrompt(healthData, patient);
        const rawText  = await watsonxSvc.generateText(prompt);
        aiAnalysis     = healthSvc.parseAIResponse(rawText);
        aiAnalysis.isMock = false;
      } catch (aiErr) {
        console.error('[Health] watsonx.ai error:', aiErr.message);
        aiAnalysis = watsonxSvc.getMockHealthAnalysis();
        aiSource   = 'fallback';
      }
    }

    // Override riskLevel with rule-based if AI returns something odd
    const finalRiskLevel = emergencyAlerts.length > 0
      ? 'Critical'
      : (aiAnalysis.riskLevel || ruleRiskLevel);

    // ── Save report ───────────────────────────────────────────
    const report = HealthReportModel.create({
      userId,
      healthData,
      analysis:       aiAnalysis,
      riskLevel:      finalRiskLevel,
      healthScore,
      emergencyAlerts,
      aiSource
    });

    res.json({
      success: true,
      report: {
        id:             report.id,
        createdAt:      report.createdAt,
        healthData,
        analysis:       aiAnalysis,
        riskLevel:      finalRiskLevel,
        healthScore,
        emergencyAlerts,
        aiSource
      }
    });
  } catch (err) {
    console.error('[Health] Submit error:', err.message);
    res.status(500).json({ success: false, message: 'Health analysis failed. Please try again.' });
  }
}

// ── Get health history ────────────────────────────────────────
function getHistory(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const limit   = parseInt(req.query.limit) || 20;
    const reports = HealthReportModel.findByUserId(userId, limit);
    res.json({ success: true, reports });
  } catch (err) {
    console.error('[Health] History error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve health history.' });
  }
}

// ── Get latest report ─────────────────────────────────────────
function getLatestReport(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const report = HealthReportModel.latest(userId);
    res.json({ success: true, report: report || null });
  } catch (err) {
    console.error('[Health] Latest error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve latest report.' });
  }
}

module.exports = { submitHealth, getHistory, getLatestReport };
