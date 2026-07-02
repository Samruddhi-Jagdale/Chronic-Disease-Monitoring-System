/**
 * Medication Controller
 * CRUD operations for medication reminders.
 */

const { MedicationModel } = require('../models/store');

// ── Get all medications ───────────────────────────────────────
function getMedications(req, res) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Please log in first.' });

  const meds = MedicationModel.findByUserId(userId);
  res.json({ success: true, medications: meds });
}

// ── Add medication ────────────────────────────────────────────
function addMedication(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Please log in first.' });

    const { name, dosage, times, frequency, notes, startDate, endDate } = req.body;

    if (!name || !dosage || !times || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name, dosage, times, and frequency are required.'
      });
    }

    const med = MedicationModel.create({
      userId, name, dosage,
      times:     Array.isArray(times) ? times : [times],
      frequency, notes: notes || '',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate:   endDate   || null,
      active:    true
    });

    res.status(201).json({ success: true, message: 'Medication added.', medication: med });
  } catch (err) {
    console.error('[Medication] Add error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add medication.' });
  }
}

// ── Update medication ─────────────────────────────────────────
function updateMedication(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Please log in first.' });

    const { id } = req.params;
    const existing = MedicationModel.findById(id);

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Medication not found.' });
    }

    const updated = MedicationModel.update(id, req.body);
    res.json({ success: true, message: 'Medication updated.', medication: updated });
  } catch (err) {
    console.error('[Medication] Update error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update medication.' });
  }
}

// ── Delete medication ─────────────────────────────────────────
function deleteMedication(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Please log in first.' });

    const { id } = req.params;
    const existing = MedicationModel.findById(id);

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Medication not found.' });
    }

    MedicationModel.delete(id);
    res.json({ success: true, message: 'Medication deleted.' });
  } catch (err) {
    console.error('[Medication] Delete error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete medication.' });
  }
}

// ── Today's schedule ──────────────────────────────────────────
function todaySchedule(req, res) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Please log in first.' });

  const today = new Date().toISOString().split('T')[0];
  const meds  = MedicationModel.findByUserId(userId).filter(m => {
    if (!m.active) return false;
    if (m.endDate && m.endDate < today) return false;
    return true;
  });

  res.json({ success: true, medications: meds, date: today });
}

module.exports = { getMedications, addMedication, updateMedication, deleteMedication, todaySchedule };
