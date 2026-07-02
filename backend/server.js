/**
 * AI Agent for Chronic Disease Monitoring
 * Main Express Server Entry Point
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express      = require('express');
const path         = require('path');
const session      = require('express-session');
const morgan       = require('morgan');

// Route imports
const authRoutes       = require('./routes/authRoutes');
const patientRoutes    = require('./routes/patientRoutes');
const healthRoutes     = require('./routes/healthRoutes');
const aiRoutes         = require('./routes/aiRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const dashboardRoutes  = require('./routes/dashboardRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Session
app.use(session({
  secret:            process.env.SESSION_SECRET || 'chronic-disease-ai-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000  // 24 hours
  }
}));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/patient',     patientRoutes);
app.use('/api/health',      healthRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/dashboard',   dashboardRoutes);

// ── Frontend page routes ──────────────────────────────────────
const pages = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/patient-register',
  '/health-monitor',
  '/health-history',
  '/medications',
  '/chat',
  '/lifestyle',
  '/emergency'
];

const frontendDir = path.join(__dirname, '../frontend');

pages.forEach(route => {
  app.get(route, (req, res) => {
    // Map route → html file
    const map = {
      '/':                  'index.html',
      '/login':             'login.html',
      '/register':          'register.html',
      '/dashboard':         'dashboard.html',
      '/patient-register':  'patient-register.html',
      '/health-monitor':    'health-monitor.html',
      '/health-history':    'health-history.html',
      '/medications':       'medications.html',
      '/chat':              'chat.html',
      '/lifestyle':         'lifestyle.html',
      '/emergency':         'emergency.html'
    };
    res.sendFile(path.join(frontendDir, map[route] || 'index.html'));
  });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ AI Chronic Disease Monitor running at http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   watsonx API : ${process.env.WATSONX_API_KEY ? 'Configured ✓' : 'NOT configured ✗'}\n`);
});

module.exports = app;
