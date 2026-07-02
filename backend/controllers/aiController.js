/**
 * AI Controller
 * Handles chat assistant and lifestyle recommendation endpoints.
 */

const { ChatModel, PatientModel, HealthReportModel } = require('../models/store');
const watsonxSvc = require('../services/watsonxService');

// ── Chat endpoint ─────────────────────────────────────────────
async function chat(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }

    // Retrieve context
    const patient    = PatientModel.findByUserId(userId);
    const history    = ChatModel.getMessages(userId);

    // Save user message
    ChatModel.addMessage(userId, 'user', message.trim());

    let reply;
    let aiSource = 'watsonx';

    if (!process.env.WATSONX_API_KEY || !process.env.WATSONX_PROJECT_ID) {
      reply    = watsonxSvc.getMockChatResponse(message);
      aiSource = 'mock';
    } else {
      try {
        const prompt = watsonxSvc.buildChatPrompt(message.trim(), history, patient);
        reply        = await watsonxSvc.generateText(prompt);
      } catch (err) {
        console.error('[AI] Chat error:', err.message);
        reply    = watsonxSvc.getMockChatResponse(message);
        aiSource = 'fallback';
      }
    }

    // Save assistant reply
    ChatModel.addMessage(userId, 'assistant', reply);

    res.json({ success: true, reply, aiSource });
  } catch (err) {
    console.error('[AI] Chat controller error:', err.message);
    res.status(500).json({ success: false, message: 'Chat failed. Please try again.' });
  }
}

// ── Clear chat history ────────────────────────────────────────
function clearChat(req, res) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  ChatModel.clearHistory(userId);
  res.json({ success: true, message: 'Chat history cleared.' });
}

// ── Get chat history ──────────────────────────────────────────
function getChatHistory(req, res) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  const messages = ChatModel.getMessages(userId);
  res.json({ success: true, messages });
}

// ── Lifestyle recommendations ─────────────────────────────────
async function getLifestyleRecommendations(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const patient      = PatientModel.findByUserId(userId);
    const latestReport = HealthReportModel.latest(userId);

    let recommendations;
    let aiSource = 'watsonx';

    if (!process.env.WATSONX_API_KEY || !process.env.WATSONX_PROJECT_ID) {
      recommendations = getDefaultLifestyleRecommendations(patient);
      aiSource        = 'mock';
    } else {
      try {
        const prompt = watsonxSvc.buildLifestylePrompt(patient, latestReport);
        const text   = await watsonxSvc.generateText(prompt);
        recommendations = { raw: text, aiSource: 'watsonx' };
      } catch (err) {
        console.error('[AI] Lifestyle error:', err.message);
        recommendations = getDefaultLifestyleRecommendations(patient);
        aiSource        = 'fallback';
      }
    }

    res.json({ success: true, recommendations, aiSource });
  } catch (err) {
    console.error('[AI] Lifestyle controller error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate lifestyle recommendations.' });
  }
}

// ── Default lifestyle recommendations ────────────────────────
function getDefaultLifestyleRecommendations(patient) {
  const condition = patient?.diseaseType?.toLowerCase() || '';
  let dietFocus   = 'balanced, nutrient-dense foods';

  if (condition.includes('diabetes')) dietFocus = 'low-glycemic index foods, complex carbohydrates, and fiber-rich vegetables';
  else if (condition.includes('hypertension')) dietFocus = 'low-sodium foods, potassium-rich vegetables, and the DASH diet';
  else if (condition.includes('heart')) dietFocus = 'heart-healthy foods like oily fish, nuts, and olive oil while avoiding saturated fats';

  return {
    mealPlan: `Focus on ${dietFocus}. Eat 3 balanced meals and 2 healthy snacks daily. Include vegetables, lean protein, and whole grains. Avoid processed foods, excessive sugar, and refined carbs.`,
    exerciseRoutine: 'Monday: 30-min brisk walk | Tuesday: Light strength training | Wednesday: 30-min cycling or swimming | Thursday: Rest or gentle yoga | Friday: 30-min aerobic activity | Saturday: Outdoor activity | Sunday: Rest and stretching.',
    hydrationGoal: 'Aim for 8–10 glasses (2–2.5 litres) of water per day. Drink a glass upon waking, before each meal, and before bed. Limit caffeinated and sugary beverages.',
    sleepHygiene: 'Target 7–8 hours of sleep. Keep a consistent sleep schedule. Avoid screens 1 hour before bed. Keep bedroom cool and dark. Avoid caffeine after 2 PM.',
    stressManagement: 'Practice 10-minute daily deep breathing exercises. Try mindfulness meditation using free apps. Engage in hobbies and social connections. Limit news consumption if it causes anxiety.',
    monitoringSchedule: 'Check blood pressure daily (morning). Check blood sugar before meals and 2 hours after. Weigh yourself weekly. Schedule a doctor visit every 3 months.',
    aiSource: 'default'
  };
}

module.exports = { chat, clearChat, getChatHistory, getLifestyleRecommendations };
