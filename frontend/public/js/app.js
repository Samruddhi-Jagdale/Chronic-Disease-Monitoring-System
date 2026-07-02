/**
 * app.js — Shared frontend utility functions
 * Used across all pages of the AI Chronic Disease Monitor.
 */

/* ── API helpers ──────────────────────────────────────────── */
const API = {
  baseUrl: '',

  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(this.baseUrl + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  get:    (ep)       => API.request('GET',    ep),
  post:   (ep, body) => API.request('POST',   ep, body),
  put:    (ep, body) => API.request('PUT',    ep, body),
  delete: (ep)       => API.request('DELETE', ep)
};

/* ── Session check ────────────────────────────────────────── */
async function requireAuth(redirectTo = '/login') {
  try {
    const data = await API.get('/api/auth/session');
    if (!data.authenticated) {
      window.location.href = redirectTo;
      return null;
    }
    return data.user;
  } catch (e) {
    window.location.href = redirectTo;
    return null;
  }
}

async function redirectIfLoggedIn(to = '/dashboard') {
  try {
    const data = await API.get('/api/auth/session');
    if (data.authenticated) window.location.href = to;
  } catch (e) { /* not logged in, stay */ }
}

/* ── Toast notifications ──────────────────────────────────── */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Loading overlay ──────────────────────────────────────── */
function showLoading(text = 'Analyzing with IBM watsonx.ai…') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="spinner"></div><p>${text}</p>`;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('p').textContent = text;
  }
  overlay.classList.add('active');
}
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('active');
}

/* ── Form validation ──────────────────────────────────────── */
function validateField(input, rules = {}) {
  const val     = input.value.trim();
  const errEl   = input.closest('.form-group')?.querySelector('.field-error');
  let   message = '';

  if (rules.required && !val)            message = 'This field is required.';
  else if (rules.min !== undefined && parseFloat(val) < rules.min)
                                          message = `Minimum value is ${rules.min}.`;
  else if (rules.max !== undefined && parseFloat(val) > rules.max)
                                          message = `Maximum value is ${rules.max}.`;
  else if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
                                          message = 'Enter a valid email address.';
  else if (rules.minLength && val.length < rules.minLength)
                                          message = `Minimum ${rules.minLength} characters required.`;

  if (message) {
    input.classList.add('error');
    if (errEl) errEl.textContent = message;
    return false;
  }
  input.classList.remove('error');
  if (errEl) errEl.textContent = '';
  return true;
}

function validateForm(formEl, fieldRules) {
  let valid = true;
  for (const [name, rules] of Object.entries(fieldRules)) {
    const input = formEl.querySelector(`[name="${name}"]`);
    if (input && !validateField(input, rules)) valid = false;
  }
  return valid;
}

/* ── Risk badge helper ────────────────────────────────────── */
function riskBadge(level) {
  const l = (level || '').toLowerCase();
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', critical: 'badge-critical' };
  return `<span class="badge ${map[l] || 'badge-primary'}">${level || 'Unknown'}</span>`;
}

/* ── Format date ──────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── Health score colour ──────────────────────────────────── */
function scoreColor(score) {
  if (score >= 80) return 'var(--secondary)';
  if (score >= 55) return 'var(--warning)';
  return 'var(--accent)';
}

/* ── Navbar mobile toggle ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.navbar-toggle');
  const nav    = document.querySelector('.navbar-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // Highlight active nav link
  const current = window.location.pathname;
  document.querySelectorAll('.navbar-nav a, .sidebar a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
});

/* ── Logout helper ────────────────────────────────────────── */
async function logout() {
  try {
    await API.post('/api/auth/logout');
    window.location.href = '/';
  } catch (e) {
    window.location.href = '/';
  }
}
