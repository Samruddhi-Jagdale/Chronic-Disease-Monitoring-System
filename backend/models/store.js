/**
 * In-memory data store (replaces MongoDB for zero-dependency startup).
 * Swap out for real Mongoose models when MONGODB_URI is set.
 */

const { v4: uuidv4 } = require('uuid');

// ── Simple in-memory collections ─────────────────────────────
const store = {
  users:       [],   // { id, name, email, passwordHash, createdAt }
  patients:    [],   // { id, userId, name, age, gender, ... }
  healthReports: [], // { id, userId, data, analysis, riskLevel, createdAt }
  medications:   [], // { id, userId, name, dosage, time, frequency }
  chatHistory:   []  // { id, userId, messages: [], createdAt }
};

// ── User helpers ──────────────────────────────────────────────
const UserModel = {
  create(data) {
    const user = { id: uuidv4(), ...data, createdAt: new Date() };
    store.users.push(user);
    return user;
  },
  findByEmail(email) {
    return store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findById(id) {
    return store.users.find(u => u.id === id);
  }
};

// ── Patient helpers ───────────────────────────────────────────
const PatientModel = {
  create(data) {
    // Remove existing entry for this user (one patient profile per user)
    store.patients = store.patients.filter(p => p.userId !== data.userId);
    const patient = { id: uuidv4(), ...data, createdAt: new Date() };
    store.patients.push(patient);
    return patient;
  },
  findByUserId(userId) {
    return store.patients.find(p => p.userId === userId);
  }
};

// ── Health report helpers ─────────────────────────────────────
const HealthReportModel = {
  create(data) {
    const report = { id: uuidv4(), ...data, createdAt: new Date() };
    store.healthReports.push(report);
    return report;
  },
  findByUserId(userId, limit = 20) {
    return store.healthReports
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },
  latest(userId) {
    const reports = this.findByUserId(userId, 1);
    return reports[0] || null;
  },
  count(userId) {
    return store.healthReports.filter(r => r.userId === userId).length;
  }
};

// ── Medication helpers ────────────────────────────────────────
const MedicationModel = {
  create(data) {
    const med = { id: uuidv4(), ...data, createdAt: new Date() };
    store.medications.push(med);
    return med;
  },
  findByUserId(userId) {
    return store.medications.filter(m => m.userId === userId);
  },
  findById(id) {
    return store.medications.find(m => m.id === id);
  },
  update(id, data) {
    const idx = store.medications.findIndex(m => m.id === id);
    if (idx === -1) return null;
    store.medications[idx] = { ...store.medications[idx], ...data, updatedAt: new Date() };
    return store.medications[idx];
  },
  delete(id) {
    const idx = store.medications.findIndex(m => m.id === id);
    if (idx === -1) return false;
    store.medications.splice(idx, 1);
    return true;
  }
};

// ── Chat history helpers ──────────────────────────────────────
const ChatModel = {
  getOrCreate(userId) {
    let chat = store.chatHistory.find(c => c.userId === userId);
    if (!chat) {
      chat = { id: uuidv4(), userId, messages: [], createdAt: new Date() };
      store.chatHistory.push(chat);
    }
    return chat;
  },
  addMessage(userId, role, content) {
    const chat = this.getOrCreate(userId);
    chat.messages.push({ role, content, timestamp: new Date() });
    return chat;
  },
  getMessages(userId) {
    const chat = this.getOrCreate(userId);
    return chat.messages;
  },
  clearHistory(userId) {
    const chat = store.chatHistory.find(c => c.userId === userId);
    if (chat) chat.messages = [];
  }
};

module.exports = { UserModel, PatientModel, HealthReportModel, MedicationModel, ChatModel };
