/**
 * IBM watsonx.ai Service
 * Handles IAM token retrieval and text generation calls.
 */

const axios         = require('axios');
const watsonxConfig = require('../config/watsonx');

let cachedToken     = null;
let tokenExpiry     = 0;

// ── IAM Token ────────────────────────────────────────────────
async function getIAMToken() {
  // Return cached token if still valid (5-minute buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300_000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type:    'urn:ibm:params:oauth:grant-type:apikey',
    apikey:        watsonxConfig.apiKey
  });

  const response = await axios.post(watsonxConfig.iamUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  cachedToken  = response.data.access_token;
  tokenExpiry  = Date.now() + (response.data.expires_in * 1000);
  return cachedToken;
}

// ── Core generate function ───────────────────────────────────
async function generateText(prompt) {
  if (!watsonxConfig.isConfigured()) {
    throw new Error('WATSONX_NOT_CONFIGURED');
  }

  const token = await getIAMToken();

  const payload = {
    model_id:   watsonxConfig.modelId,
    project_id: watsonxConfig.projectId,
    input:      prompt,
    parameters: watsonxConfig.parameters
  };

  const response = await axios.post(watsonxConfig.generateUrl(), payload, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json'
    },
    timeout: 30_000
  });

  const result = response.data?.results?.[0]?.generated_text;
  if (!result) throw new Error('Empty response from watsonx.ai');
  return result.trim();
}

// ── Prompt builders ──────────────────────────────────────────

/**
 * Build a health analysis prompt from the submitted health data.
 */
function buildHealthAnalysisPrompt(healthData, patientInfo) {
  return `<|system|>
You are an expert AI health assistant specialized in chronic disease monitoring. Provide structured, medically accurate, and compassionate health analysis. Always format your response with the exact section labels provided.
<|user|>
Analyze the following patient health data and provide a complete structured report.

Patient Information:
- Name: ${patientInfo?.name || 'Patient'}
- Age: ${patientInfo?.age || 'Unknown'}
- Gender: ${patientInfo?.gender || 'Unknown'}
- Diagnosed Condition: ${patientInfo?.diseaseType || 'Not specified'}
- BMI: ${patientInfo?.bmi || healthData.bmi || 'Not provided'}

Current Health Readings:
- Blood Sugar: ${healthData.bloodSugar} mg/dL
- Blood Pressure: ${healthData.systolicBP}/${healthData.diastolicBP} mmHg
- Heart Rate: ${healthData.heartRate} bpm
- Cholesterol: ${healthData.cholesterol} mg/dL
- Oxygen Level: ${healthData.oxygenLevel}%
- Body Temperature: ${healthData.temperature}°C
- BMI: ${healthData.bmi}
- Daily Exercise: ${healthData.exercise} minutes
- Water Intake: ${healthData.waterIntake} liters
- Sleep Hours: ${healthData.sleepHours} hours

Provide the analysis using EXACTLY these section labels:
RISK_LEVEL: (Low / Medium / High / Critical — choose one)
HEALTH_CONCERNS: (List main concerns based on the readings)
ANALYSIS: (Brief explanation of what the readings indicate)
DIET_PLAN: (Specific dietary recommendations for this patient)
EXERCISE_PLAN: (Exercise recommendations suited to the condition)
LIFESTYLE_TIPS: (Water intake, sleep, and stress management advice)
MEDICATIONS_NOTE: (General note about medication adherence — no prescriptions)
EMERGENCY_ACTION: (What to do if emergency symptoms appear)
<|assistant|>
`;
}

/**
 * Build a chat prompt for the health assistant chatbot.
 */
function buildChatPrompt(userMessage, conversationHistory, patientInfo) {
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `<|${m.role === 'user' ? 'user' : 'assistant'}|>\n${m.content}`)
    .join('\n');

  const patientCtx = patientInfo
    ? `The patient's name is ${patientInfo.name}, age ${patientInfo.age}, diagnosed with ${patientInfo.diseaseType}.`
    : '';

  return `<|system|>
You are a compassionate and knowledgeable AI health assistant specializing in chronic disease management (diabetes, hypertension, heart disease). Provide helpful, accurate, practical health guidance. Always recommend consulting a qualified doctor for medical decisions. Be warm, clear, and supportive. ${patientCtx}
${historyText ? historyText + '\n' : ''}<|user|>
${userMessage}
<|assistant|>
`;
}

/**
 * Build a lifestyle recommendation prompt.
 */
function buildLifestylePrompt(patientInfo, latestReport) {
  return `<|system|>
You are an expert health coach specializing in chronic disease management. Create practical, detailed, and personalized lifestyle plans.
<|user|>
Create a comprehensive personalized weekly lifestyle plan for the following patient:

Patient: ${patientInfo?.name || 'Patient'}, Age: ${patientInfo?.age || 'Unknown'}
Condition: ${patientInfo?.diseaseType || 'Chronic disease'}
${latestReport ? `Latest Risk Level: ${latestReport.riskLevel}` : ''}

Provide detailed sections using EXACTLY these labels:
MEAL_PLAN: (3 balanced meals + 2 snacks per day, 7-day overview tailored to the condition)
EXERCISE_ROUTINE: (Daily exercise schedule with specific activities and durations)
HYDRATION_GOAL: (Specific daily water intake targets and timing)
SLEEP_HYGIENE: (Practical tips for improving sleep quality)
STRESS_MANAGEMENT: (Actionable stress reduction techniques)
MONITORING_SCHEDULE: (When and how often to check vitals)

Keep it practical, achievable, and specific to the diagnosed condition.
<|assistant|>
`;
}

// ── Mock responses for unconfigured state ────────────────────
function getMockHealthAnalysis() {
  return {
    riskLevel:    'Medium',
    concerns:     ['Blood sugar slightly elevated', 'Blood pressure in pre-hypertension range'],
    analysis:     'Your readings show some areas that need attention. Blood sugar is above optimal range and blood pressure is slightly elevated. Regular monitoring is recommended.',
    dietPlan:     'Reduce refined carbohydrates and sugary foods. Increase vegetables, lean proteins, and whole grains. Limit sodium intake to under 2,300 mg/day.',
    exercisePlan: 'Aim for 30 minutes of moderate aerobic activity (brisk walking, cycling) 5 days per week. Add 2 days of light resistance training.',
    lifestyleTips:'Drink 8–10 glasses of water daily. Target 7–8 hours of sleep. Practice 10 minutes of deep breathing or meditation daily.',
    medicationsNote: 'Take all prescribed medications at the scheduled times. Do not skip doses.',
    emergencyAction: 'If blood sugar exceeds 300 mg/dL, blood pressure exceeds 180/120, or you experience chest pain — seek emergency medical care immediately.',
    isMock:       true
  };
}

function getMockChatResponse(userMessage) {
  const msg = userMessage.toLowerCase();

  // ── Blood sugar / diabetes ────────────────────────────────
  if (msg.includes('blood sugar') || msg.includes('glucose') || msg.includes('sugar level') ||
      msg.includes('diabetes') || msg.includes('diabetic') || msg.includes('insulin') ||
      msg.includes('hyperglycemia') || msg.includes('hypoglycemia') || msg.includes('hba1c')) {
    return `Great question about blood sugar management! Here's what you need to know:

**Normal Ranges:**
- Fasting blood sugar: 70–100 mg/dL (normal), 100–125 (pre-diabetes), ≥126 (diabetes)
- Post-meal (2 hrs): below 140 mg/dL is ideal

**To keep blood sugar stable:**
• Eat low-glycemic foods: oats, lentils, leafy greens, whole grains
• Avoid sugary drinks, white rice, white bread, and processed snacks
• Eat smaller meals every 3–4 hours instead of 2–3 large meals
• Exercise after meals — even a 15-minute walk lowers blood sugar
• Stay well-hydrated; dehydration raises blood sugar
• Take medications at the same time every day

**Warning signs to watch:** If your sugar exceeds 250 mg/dL — increased thirst, frequent urination, blurred vision — contact your doctor. Below 70 mg/dL (shakiness, sweating, confusion) — consume fast-acting sugar immediately.`;
  }

  // ── Blood pressure / hypertension ─────────────────────────
  if (msg.includes('blood pressure') || msg.includes('hypertension') || msg.includes('bp') ||
      msg.includes('systolic') || msg.includes('diastolic') || msg.includes('high pressure') ||
      msg.includes('pressure high') || msg.includes('pressure is high')) {
    return `Here's a comprehensive guide to managing blood pressure:

**Understanding your numbers:**
- Normal: below 120/80 mmHg
- Elevated: 120–129 / below 80
- High Stage 1: 130–139 / 80–89
- High Stage 2: 140+ / 90+
- Crisis (seek emergency care): above 180/120

**Lifestyle changes that lower BP:**
• Reduce sodium to under 2,300 mg/day (avoid processed foods, pickles, chips)
• Follow the DASH diet: fruits, vegetables, low-fat dairy, whole grains
• Exercise 30 minutes most days (brisk walking, swimming, cycling)
• Limit alcohol and quit smoking
• Manage stress: deep breathing, yoga, meditation
• Maintain a healthy weight — losing even 5 kg can drop BP significantly
• Monitor BP at home every morning before eating

**If your BP exceeds 180/120 with symptoms** (chest pain, shortness of breath, severe headache) — call emergency services immediately.`;
  }

  // ── Heart / heart rate / heart disease ───────────────────
  if (msg.includes('heart rate') || msg.includes('heart disease') || msg.includes('cardiac') ||
      msg.includes('heartbeat') || msg.includes('pulse') || msg.includes('tachycardia') ||
      msg.includes('bradycardia') || msg.includes('palpitation') || msg.includes('chest pain') ||
      msg.includes('heart attack') || msg.includes('cholesterol') || msg.includes('triglyceride')) {
    return `Important information about heart health:

**Normal heart rate:** 60–100 bpm at rest. Athletes may have 40–60 bpm.

**Warning signs requiring immediate attention:**
• Heart rate above 120 bpm at rest (tachycardia)
• Heart rate below 40 bpm (bradycardia)
• Chest pain, tightness, or pressure
• Shortness of breath at rest
• Palpitations with dizziness

**Cholesterol targets:**
- Total cholesterol: below 200 mg/dL
- LDL ("bad"): below 100 mg/dL (below 70 if high risk)
- HDL ("good"): above 40 mg/dL (men), above 50 (women)

**Heart-healthy habits:**
• Eat oily fish (salmon, sardines) 2× per week for omega-3s
• Choose olive oil over butter; nuts over chips
• Avoid trans fats and limit saturated fats
• Exercise regularly — 150 min moderate activity per week
• Don't smoke; limit alcohol to 1 drink/day
• Manage stress and get 7–8 hours of sleep

**If you experience chest pain, call emergency services immediately.** Do not wait.`;
  }

  // ── Diet / food / nutrition / meals ───────────────────────
  if (msg.includes('diet') || msg.includes('food') || msg.includes('eat') ||
      msg.includes('meal') || msg.includes('nutrition') || msg.includes('vegetable') ||
      msg.includes('fruit') || msg.includes('protein') || msg.includes('carb') ||
      msg.includes('fat') || msg.includes('calori') || msg.includes('weight')) {
    return `Here are personalized dietary guidelines for chronic disease management:

**Foods to INCLUDE daily:**
• Vegetables: spinach, broccoli, bitter gourd, fenugreek, cucumber
• Whole grains: brown rice, oats, whole wheat chapati, quinoa
• Lean proteins: eggs, chicken (without skin), fish, lentils, tofu
• Healthy fats: nuts (handful/day), seeds, avocado, olive oil
• Low-fat dairy: curd, buttermilk, skimmed milk

**Foods to AVOID or LIMIT:**
• White rice, maida (refined flour), white bread
• Sugary drinks, packaged juices, cold drinks
• Fried food, fast food, chips, namkeen
• Full-fat dairy, red meat, processed meats
• Excess salt (use herbs/spices instead)

**Practical meal tips:**
• Eat 5–6 small meals instead of 3 large ones
• Fill half your plate with vegetables
• Drink a glass of water before each meal
• Don't skip breakfast — it stabilizes blood sugar all day
• Read food labels: avoid ingredients ending in "-ose" (sugars)

**Sample day:**
Morning: Oats with nuts + 1 fruit | Lunch: Dal + brown rice + sabzi + salad | Evening: Handful of nuts | Dinner: Roti + lean protein + vegetables`;
  }

  // ── Exercise / workout / physical activity ────────────────
  if (msg.includes('exercise') || msg.includes('workout') || msg.includes('physical activity') ||
      msg.includes('walk') || msg.includes('yoga') || msg.includes('gym') ||
      msg.includes('fitness') || msg.includes('active') || msg.includes('sport')) {
    return `Exercise is one of the most powerful tools for managing chronic disease. Here's your guide:

**Recommended activity (per week):**
• 150 minutes of moderate aerobic activity OR
• 75 minutes of vigorous aerobic activity
• 2 days of muscle-strengthening exercises

**Best exercises for chronic disease:**
• **Brisk walking** — 30 min/day, 5 days/week (easiest to start)
• **Swimming / water aerobics** — gentle on joints, great for heart
• **Cycling** — indoors or outdoors, excellent for blood sugar control
• **Yoga** — reduces blood pressure, stress, and improves flexibility
• **Light resistance training** — helps with weight and blood sugar

**Exercise tips for your condition:**
• Check blood sugar before and after exercise if you have diabetes
• Carry a fast-acting snack (glucose tablets, fruit) when exercising
• Stay well-hydrated — drink water before, during, after
• Start slow and gradually increase intensity over weeks
• Avoid exercising when blood sugar is below 80 or above 250 mg/dL
• Stop if you feel chest pain, dizziness, or extreme shortness of breath

**Aim for:** Moving every hour if you have a desk job — even a 5-minute walk helps!`;
  }

  // ── Sleep ─────────────────────────────────────────────────
  if (msg.includes('sleep') || msg.includes('insomnia') || msg.includes('tired') ||
      msg.includes('fatigue') || msg.includes('rest') || msg.includes('night')) {
    return `Sleep is critical for chronic disease management. Poor sleep raises blood sugar, increases blood pressure, and weakens immunity.

**How much sleep do you need?** 7–9 hours for most adults.

**Signs your sleep is affecting your health:**
• Waking up tired despite sleeping
• Blood sugar higher in the morning than evening
• High blood pressure readings in the morning

**Tips to improve sleep quality:**
• Go to bed and wake up at the same time every day (even weekends)
• Avoid screens (phone, TV) at least 1 hour before bed — blue light disrupts melatonin
• Keep your bedroom cool (18–22°C), dark, and quiet
• Avoid caffeine after 2 PM (coffee, tea, cola)
• Don't eat heavy meals within 2 hours of bedtime
• Try 4-7-8 breathing: inhale 4 sec, hold 7, exhale 8 — very relaxing
• Limit naps to 20 minutes before 3 PM
• Regular exercise improves sleep quality significantly

**If you consistently can't sleep or wake up gasping,** discuss sleep apnea with your doctor — it's common with hypertension and obesity and is very treatable.`;
  }

  // ── Oxygen / breathing ────────────────────────────────────
  if (msg.includes('oxygen') || msg.includes('breathing') || msg.includes('breath') ||
      msg.includes('asthma') || msg.includes('copd') || msg.includes('lung') ||
      msg.includes('inhaler') || msg.includes('spo2') || msg.includes('saturation')) {
    return `Understanding oxygen saturation and breathing health:

**Normal oxygen levels (SpO2):**
- 95–100%: Normal
- 90–94%: Low — monitor closely and seek medical advice
- Below 90%: Emergency — seek medical care immediately

**Signs of low oxygen:**
• Shortness of breath at rest or with minimal activity
• Bluish tint to lips or fingertips (cyanosis)
• Rapid breathing, confusion, or extreme fatigue

**Improving respiratory health:**
• Practice deep breathing exercises: 10 minutes daily
• Avoid smoking and second-hand smoke entirely
• Stay away from polluted environments; wear a mask when needed
• Keep your home dust-free; use air purifiers if possible
• If you have asthma/COPD, always carry your rescue inhaler
• Stay hydrated — water keeps airways moist and mucus thin
• Exercise regularly to strengthen respiratory muscles

**Breathing exercise (pursed lip breathing):**
Breathe in slowly through nose for 2 counts, then breathe out through pursed lips for 4 counts. Repeat 5–10 times. This helps with COPD and anxiety.`;
  }

  // ── Water / hydration ─────────────────────────────────────
  if (msg.includes('water') || msg.includes('hydrat') || msg.includes('drink') ||
      msg.includes('thirst') || msg.includes('dehydrat')) {
    return `Proper hydration is essential for managing chronic disease:

**Daily water targets:**
• General recommendation: 8–10 glasses (2–2.5 litres) per day
• More if you exercise, live in a hot climate, or have a fever
• Diabetics need extra hydration as high blood sugar increases urination

**Signs of dehydration:**
• Dark yellow urine (aim for pale yellow)
• Dry mouth, fatigue, headache, dizziness
• Increased blood sugar or blood pressure readings

**Smart hydration habits:**
• Drink a glass of water first thing in the morning
• Keep a water bottle visible at your desk
• Drink a glass before each meal (also helps with portion control)
• Set phone reminders every 2 hours if you forget
• Eat water-rich foods: cucumber, watermelon, oranges, tomatoes

**What to limit:**
• Sugary drinks (cola, packaged juice, energy drinks) — spike blood sugar
• Excess caffeine (>2 cups/day) — dehydrating effect
• Alcohol — raises blood pressure and blood sugar

**Good alternatives to plain water:** Coconut water (in moderation), herbal teas (tulsi, ginger, chamomile), lemon water without sugar.`;
  }

  // ── Stress / mental health / anxiety ─────────────────────
  if (msg.includes('stress') || msg.includes('anxiety') || msg.includes('mental') ||
      msg.includes('depress') || msg.includes('worry') || msg.includes('nervous') ||
      msg.includes('calm') || msg.includes('relax') || msg.includes('mood')) {
    return `Stress management is a vital part of chronic disease care. Chronic stress raises blood sugar, increases blood pressure, and weakens your immune system.

**How stress affects your health:**
• Releases cortisol → raises blood sugar and blood pressure
• Disrupts sleep → worsens all chronic conditions
• Leads to emotional eating → weight gain and poor glucose control

**Proven stress-reduction techniques:**

**1. Deep breathing (immediate relief):**
Breathe in for 4 counts, hold for 4, breathe out for 6. Repeat 5 times.

**2. Progressive muscle relaxation:**
Tense each muscle group for 5 seconds, then release. Start from feet, work up to face.

**3. Mindfulness/meditation:**
Even 5–10 minutes daily reduces cortisol significantly. Apps: Headspace, Calm (free options available).

**4. Physical activity:**
30 minutes of walking releases endorphins — nature's stress reliever.

**5. Social connection:**
Talk to family, friends, or a support group. Social isolation worsens chronic disease outcomes.

**6. Journaling:**
Write 3 things you're grateful for each evening — proven to reduce anxiety.

If stress or anxiety feels unmanageable, please speak with a mental health professional or your doctor.`;
  }

  // ── Medication / medicine / dosage ────────────────────────
  if (msg.includes('medication') || msg.includes('medicine') || msg.includes('tablet') ||
      msg.includes('pill') || msg.includes('dose') || msg.includes('drug') ||
      msg.includes('metformin') || msg.includes('insulin') || msg.includes('aspirin') ||
      msg.includes('miss') || msg.includes('forgot') || msg.includes('skip')) {
    return `Here's important guidance on medication adherence for chronic disease:

**Why medication adherence matters:**
Skipping medications — even occasionally — can cause blood sugar spikes, blood pressure surges, and increase risk of complications (heart attack, stroke, kidney damage).

**What to do if you miss a dose:**
• If you remember within a few hours: take it immediately
• If it's almost time for the next dose: skip the missed one, take the next at the regular time
• Never double up on a dose to compensate
• Note it in your health log

**Tips to never miss a dose:**
• Use our Medication Reminder feature to set time-based alerts
• Keep medications visible — next to your toothbrush or breakfast items
• Use a weekly pill organizer
• Set phone alarms for each dose time
• Ask your pharmacist about once-daily formulations if multiple doses are difficult

**Important medication rules:**
• Never stop a medication abruptly without doctor's advice (especially BP meds and insulin)
• Take medications with the right food: some need food, some need to be on an empty stomach
• Store medications correctly: away from heat, sunlight, and moisture
• Check expiry dates regularly

**Use the 💊 Medications page** in this app to add your medicines and set daily reminders!`;
  }

  // ── BMI / weight / obesity ────────────────────────────────
  if (msg.includes('bmi') || msg.includes('weight') || msg.includes('obese') ||
      msg.includes('obesity') || msg.includes('overweight') || msg.includes('fat') ||
      msg.includes('slim') || msg.includes('lose weight') || msg.includes('gain weight')) {
    return `Understanding BMI and healthy weight management:

**BMI Categories:**
- Below 18.5: Underweight
- 18.5–24.9: Normal weight ✓
- 25–29.9: Overweight
- 30–34.9: Obese (Class I)
- 35+: Severely obese

**Why weight matters for chronic disease:**
• Every 1 kg lost can lower blood pressure by ~1 mmHg
• Losing 5–10% of body weight significantly improves blood sugar control
• Reduces strain on heart, joints, and kidneys

**Safe weight loss approach:**
• Target 0.5–1 kg per week — faster is not better
• Create a 500 calorie/day deficit through diet + exercise combined
• Never skip meals — it slows metabolism and causes overeating
• Track what you eat for 1 week — most people are surprised by portions

**Practical tips:**
• Use a smaller plate — reduces portions without feeling deprived
• Eat slowly and chew thoroughly — takes 20 min for brain to register fullness
• Choose steamed, grilled, or baked over fried foods
• Replace sugary snacks with fruits, nuts, or roasted chana

**Important:** Always discuss significant weight changes with your doctor, especially if on insulin or blood pressure medications.`;
  }

  // ── Temperature / fever ───────────────────────────────────
  if (msg.includes('fever') || msg.includes('temperature') || msg.includes('hot') ||
      msg.includes('chill') || msg.includes('cold') || msg.includes('flu') ||
      msg.includes('infection')) {
    return `Managing fever and illness with a chronic disease:

**Temperature ranges:**
- Normal: 36.0–37.5°C (96.8–99.5°F)
- Low-grade fever: 37.5–38.0°C
- Fever: 38.0–39.0°C
- High fever (seek care): above 39.0°C
- Emergency: above 40.0°C

**Why fever is more serious with chronic disease:**
• Illness causes stress hormones that raise blood sugar significantly
• Dehydration from fever concentrates blood glucose
• Some infections can trigger diabetic ketoacidosis (DKA)

**Sick-day rules for chronic disease patients:**
• Check blood sugar every 2–4 hours (if diabetic)
• Check blood pressure twice daily (if hypertensive)
• Stay extra hydrated — sip water or electrolyte drinks every 15 minutes
• Continue taking regular medications unless doctor says otherwise
• Eat small amounts of easy-to-digest foods even if appetite is poor
• Rest as much as possible

**Seek immediate care if:**
• Fever above 39°C lasting more than 24 hours
• Blood sugar above 300 mg/dL that won't come down
• Vomiting and unable to keep fluids down
• Severe headache, stiff neck, or rash with fever`;
  }

  // ── Cholesterol / lipids ───────────────────────────────────
  if (msg.includes('cholesterol') || msg.includes('lipid') || msg.includes('ldl') ||
      msg.includes('hdl') || msg.includes('triglyceride') || msg.includes('statin')) {
    return `Understanding and managing cholesterol:

**Target cholesterol levels:**
- Total cholesterol: below 200 mg/dL (ideal), 200–239 (borderline high)
- LDL ("bad" cholesterol): below 100 mg/dL; below 70 if high cardiac risk
- HDL ("good" cholesterol): above 40 (men), above 50 (women) — higher is better
- Triglycerides: below 150 mg/dL

**Foods that LOWER cholesterol:**
• Oats and barley (beta-glucan fibre)
• Fatty fish: salmon, sardines, mackerel (omega-3)
• Nuts: walnuts, almonds (handful per day)
• Olive oil instead of butter
• Legumes: rajma, chana, moong dal
• Flaxseeds and chia seeds

**Foods that RAISE cholesterol:**
• Fried foods, ghee, coconut oil (in excess)
• Full-fat dairy, fatty red meat
• Processed snacks, bakery items, trans fats
• Egg yolks (limit to 3–4/week if cholesterol is high)

**Lifestyle changes:**
• Exercise raises HDL ("good") cholesterol — aim for 30 min/day
• Quit smoking — it lowers HDL significantly
• Lose excess weight — 5 kg loss can improve all lipid levels
• If prescribed statins, take them at night and never stop without doctor's advice`;
  }

  // ── Report / health report / analysis ────────────────────
  if (msg.includes('report') || msg.includes('analysis') || msg.includes('result') ||
      msg.includes('reading') || msg.includes('explain') || msg.includes('what does') ||
      msg.includes('what is') || msg.includes('mean') || msg.includes('normal')) {
    return `I can help you understand your health report. Here's a quick guide to interpreting common readings:

**Blood Sugar (Fasting):**
- 70–100 mg/dL: Normal ✓
- 100–125 mg/dL: Pre-diabetes — lifestyle changes needed
- 126+ mg/dL: Diabetes — medication + lifestyle management

**Blood Pressure:**
- Below 120/80: Normal ✓
- 120–129 / <80: Elevated
- 130–139 / 80–89: High Stage 1
- 140+ / 90+: High Stage 2 — medication usually needed

**Heart Rate:**
- 60–100 bpm: Normal ✓
- Below 60: Bradycardia (can be normal in athletes)
- Above 100: Tachycardia — needs evaluation

**Oxygen Level:**
- 95–100%: Normal ✓
- 90–94%: Low — monitor closely
- Below 90%: Seek emergency care

**BMI:**
- 18.5–24.9: Normal ✓
- 25–29.9: Overweight
- 30+: Obese

**To get a full AI-powered analysis of YOUR specific readings**, use the 📊 Health Monitor page to enter your vitals and receive a personalized report!`;
  }

  // ── Kidney / liver / complications ───────────────────────
  if (msg.includes('kidney') || msg.includes('liver') || msg.includes('complication') ||
      msg.includes('retinopathy') || msg.includes('neuropathy') || msg.includes('nephropathy') ||
      msg.includes('creatinine') || msg.includes('uric acid') || msg.includes('gout')) {
    return `Managing chronic disease complications:

**Common complications of uncontrolled diabetes/hypertension:**

**Kidney (Nephropathy):**
• Early signs: protein in urine, slightly elevated creatinine
• Protection: keep blood sugar <140 and BP <130/80, stay hydrated, avoid NSAIDs (ibuprofen) regularly, limit protein if advised
• Get kidney function test (eGFR, creatinine) every 6 months

**Eyes (Retinopathy):**
• Early signs: blurred vision, floaters, difficulty seeing at night
• Protection: strict blood sugar control, annual eye exam with ophthalmologist
• Do NOT ignore vision changes — they need urgent evaluation

**Nerves (Neuropathy):**
• Signs: tingling, numbness, burning in hands/feet, loss of sensation
• Protection: blood sugar control, B12 supplementation (if on Metformin), foot care daily
• Inspect your feet every day for cuts or sores that you may not feel

**Heart disease prevention:**
• Target BP below 130/80 for people with diabetes
• Take aspirin only if prescribed (do not self-prescribe)
• Get a lipid profile every year
• HbA1c target: below 7% for most adults with diabetes

Regular monitoring and early treatment prevent 90% of serious complications.`;
  }

  // ── Generic greetings ─────────────────────────────────────
  if (msg.match(/^(hi|hello|hey|good\s*(morning|evening|afternoon)|namaste|hii+)/)) {
    return `Hello! 👋 I'm your AI Health Assistant — here to help you manage your chronic condition effectively.

You can ask me about:
• 🩸 **Blood sugar & diabetes** management
• 💉 **Blood pressure & hypertension** control
• ❤️ **Heart health & cholesterol**
• 🥗 **Diet plans & nutrition** advice
• 🏃 **Exercise & physical activity**
• 💊 **Medications & adherence**
• 😴 **Sleep, stress & lifestyle tips**
• 📊 **Understanding your health readings**

What would you like to know today?`;
  }

  // ── Thank you ─────────────────────────────────────────────
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('helpful') ||
      msg.includes('great') || msg.includes('good')) {
    return `You're very welcome! 😊 Taking an active interest in your health is the most important step you can take.

Remember:
• Log your vitals regularly on the 📊 Health Monitor page
• Set up your 💊 Medication Reminders
• Check the 🥗 Lifestyle Plan for a personalized wellness guide
• Come back anytime you have questions!

Stay consistent with your routine — small daily habits create big long-term health improvements. Take care! 🌟`;
  }

  // ── Default: informative and genuinely helpful ────────────
  return `I'm your AI Health Assistant, and I'm here to help! 🤖

Here are some topics I can answer in detail — just ask:

**Common questions:**
• "What foods should I eat for diabetes/hypertension?"
• "Explain my blood sugar level of [value]"
• "What exercise is safe for heart disease?"
• "How do I manage high blood pressure naturally?"
• "What are normal cholesterol levels?"
• "How much water should I drink daily?"
• "How does stress affect blood sugar?"
• "What should I do if I miss a medication dose?"
• "How do I improve my sleep quality?"
• "What does my health report mean?"

You can also:
• 📊 Log your vitals on the **Health Monitor** page for a full AI analysis
• 🥗 Visit the **Lifestyle** page for a personalized wellness plan
• 💊 Set up **Medication Reminders** so you never miss a dose

What would you like to know?`;
}

module.exports = {
  generateText,
  buildHealthAnalysisPrompt,
  buildChatPrompt,
  buildLifestylePrompt,
  getMockHealthAnalysis,
  getMockChatResponse
};
