# AI Agent for Chronic Disease Monitoring

> An AI-powered healthcare web application for managing Diabetes, Hypertension, Heart Disease, and other chronic conditions — powered by **IBM watsonx.ai**.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🏠 Home Page | Responsive landing page with feature overview |
| 👤 Patient Registration | Personal health profile with BMI auto-calculation |
| 📊 Health Monitoring | Log 10+ vitals with instant rule-based risk detection |
| 🤖 AI Analysis | IBM watsonx.ai-powered health analysis & recommendations |
| 💬 AI Chat | Interactive chatbot using IBM watsonx.ai foundation models |
| 🥗 Lifestyle Plans | Personalized diet, exercise & wellness recommendations |
| 💊 Medication Reminders | Add, edit, delete medications with time-based reminders |
| 📋 Health History | Complete history of reports with expandable AI analysis |
| 🚨 Emergency Alerts | Instant alerts when vitals exceed safe thresholds |
| 📱 Responsive Design | Works on desktop, tablet, and mobile |
| 🔐 Authentication | Register, login, logout with session management |

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express.js (MVC architecture)
- **AI:** IBM watsonx.ai (Granite foundation model)
- **Storage:** In-memory store (swap to MongoDB with `MONGODB_URI`)
- **Auth:** bcryptjs + express-session
- **Deployment:** IBM Cloud ready

---

## 📁 Project Structure

```
IBM_Project/
├── backend/
│   ├── config/
│   │   ├── watsonx.js         # IBM watsonx.ai configuration
│   │   └── constants.js       # Health thresholds & disease types
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── patientController.js
│   │   ├── healthController.js
│   │   ├── aiController.js
│   │   ├── medicationController.js
│   │   └── dashboardController.js
│   ├── models/
│   │   └── store.js           # In-memory data store
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── healthRoutes.js
│   │   ├── aiRoutes.js
│   │   ├── medicationRoutes.js
│   │   └── dashboardRoutes.js
│   ├── services/
│   │   ├── watsonxService.js  # IBM watsonx.ai API integration
│   │   └── healthService.js   # Health analysis & emergency detection
│   └── server.js              # Express app entry point
├── frontend/
│   ├── public/
│   │   ├── css/
│   │   │   └── styles.css     # Global blue/white healthcare theme
│   │   └── js/
│   │       └── app.js         # Shared frontend utilities
│   ├── index.html             # Home page
│   ├── login.html             # Login
│   ├── register.html          # Account registration
│   ├── patient-register.html  # Patient profile setup
│   ├── dashboard.html         # Main dashboard
│   ├── health-monitor.html    # Vitals input + AI analysis
│   ├── health-history.html    # Past reports
│   ├── medications.html       # Medication reminders
│   ├── chat.html              # AI chat assistant
│   ├── lifestyle.html         # Lifestyle recommendations
│   └── emergency.html         # Emergency reference guide
├── .env                       # Environment variables (add your keys here)
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Open `.env` and fill in your IBM watsonx.ai credentials:

```env
# IBM watsonx.ai — REQUIRED for AI features
WATSONX_API_KEY=your_ibm_watsonx_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_ENDPOINT=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
WATSONX_IAM_URL=https://iam.cloud.ibm.com/identity/token

# Application
PORT=3000
NODE_ENV=development
SESSION_SECRET=change_this_to_a_long_random_string
```

> ℹ️ **Without credentials:** The app works in demo mode with rule-based analysis and helpful placeholder responses.

### 3. Start the Server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### 4. Open in Browser

```
http://localhost:3000
```

---

## 🔑 Getting IBM watsonx.ai Credentials

1. Go to [IBM Cloud](https://cloud.ibm.com) and create a free account.
2. Navigate to **watsonx.ai** → Create a new project.
3. Go to **Manage → Access (IAM)** → Create an API key.
4. Copy your **Project ID** from the project settings.
5. Choose your regional endpoint (e.g., `https://us-south.ml.cloud.ibm.com`).
6. Set `WATSONX_MODEL_ID` to `ibm/granite-13b-chat-v2` (or another available model).

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create user account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/session` | Check session |
| POST | `/api/patient` | Save patient profile |
| GET  | `/api/patient/me` | Get patient profile |
| POST | `/api/health/submit` | Submit vitals + get AI analysis |
| GET  | `/api/health/history` | Get health history |
| GET  | `/api/health/latest` | Get latest report |
| POST | `/api/ai/chat` | Send message to AI chat |
| GET  | `/api/ai/lifestyle` | Get lifestyle recommendations |
| GET  | `/api/medications` | Get all medications |
| POST | `/api/medications` | Add medication |
| PUT  | `/api/medications/:id` | Update medication |
| DELETE | `/api/medications/:id` | Delete medication |
| GET  | `/api/medications/today` | Today's schedule |
| GET  | `/api/dashboard` | Dashboard data |

---

## 🚨 Emergency Thresholds

| Parameter | Safe | Warning | Emergency |
|---|---|---|---|
| Blood Sugar | 70–140 mg/dL | 140–250 | <70 or >250 |
| Systolic BP | <120 mmHg | 120–180 | >180 |
| Heart Rate | 60–100 bpm | 100–120 | <40 or >120 |
| Oxygen | 95–100% | 90–95 | <90% |
| Temperature | 36–37.5°C | 37.5–39 | >39°C |

---

## ☁️ IBM Cloud Deployment

### Using IBM Cloud Foundry

```bash
# Install IBM Cloud CLI
# https://cloud.ibm.com/docs/cli

ibmcloud login
ibmcloud target --cf

# Push the app
ibmcloud cf push chronic-disease-ai -m 256M -b nodejs_buildpack
```

### manifest.yml (create for Cloud Foundry)

```yaml
applications:
  - name: chronic-disease-ai
    memory: 256M
    instances: 1
    buildpack: nodejs_buildpack
    command: npm start
    env:
      NODE_ENV: production
      WATSONX_API_KEY: <your-key>
      WATSONX_PROJECT_ID: <your-project-id>
```

---

## 📝 Disclaimer

This application is for **informational and educational purposes only**. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for any health concerns.

---

## 🏗️ Built With

- [Express.js](https://expressjs.com/) — Web framework
- [IBM watsonx.ai](https://www.ibm.com/products/watsonx-ai) — AI foundation models
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — Password hashing
- [axios](https://axios-http.com/) — HTTP client for watsonx API

---

*© 2024 ChroniCare AI — AI Agent for Chronic Disease Monitoring*
