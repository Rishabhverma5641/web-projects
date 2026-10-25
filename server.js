/**
 * Forge Fitness Training — Backend Server
 *
 * Serves the static frontend and receives contact-form submissions.
 * Each submission is appended as a new row to leads.csv in this directory.
 *
 * Start with:  node server.js
 * Then open:   http://localhost:3000
 */

'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const CSV  = path.join(__dirname, 'leads.csv');

// ── CSV helpers ─────────────────────────────────────────────────────────────

/**
 * Escape a single cell value for CSV:
 *   - wraps in quotes if the value contains a comma, quote or newline
 *   - doubles any embedded quotes
 */
function csvEscape(value) {
  const str = String(value ?? '').trim();
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Append one row to the CSV file, creating the header row if needed. */
function appendLead(lead) {
  const header = 'Timestamp,Name,Email,Phone,Goal\n';
  const row = [
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    lead.name,
    lead.email,
    lead.phone,
    lead.goal,
  ]
    .map(csvEscape)
    .join(',') + '\n';

  // Create file with header if it doesn't exist yet
  if (!fs.existsSync(CSV)) {
    fs.writeFileSync(CSV, header, 'utf8');
  }

  fs.appendFileSync(CSV, row, 'utf8');
}

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(__dirname)); // serves index.html, CSS, etc.

// ── API routes ───────────────────────────────────────────────────────────────

/**
 * POST /api/leads
 * Body: { name, email, phone?, goal? }
 * Saves the submission to leads.csv and responds with a JSON message.
 */
app.post('/api/leads', (req, res) => {
  const { name, email, phone = '', goal = '' } = req.body || {};

  // Basic server-side validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    appendLead({ name: name.trim(), email: email.trim(), phone, goal });
    console.log(`[${new Date().toISOString()}] Lead saved — ${name.trim()} <${email.trim()}>`);
    return res.status(200).json({ message: "✅ Thanks! We'll be in touch soon." });
  } catch (err) {
    console.error('Failed to write lead:', err);
    return res.status(500).json({ error: 'Could not save your details. Please try again.' });
  }
});

/**
 * GET /api/leads  (optional convenience route)
 * Returns all leads as JSON so you can inspect them without opening the CSV.
 * Remove or password-protect this in production!
 */
app.get('/api/leads', (req, res) => {
  if (!fs.existsSync(CSV)) {
    return res.json({ leads: [], message: 'No leads recorded yet.' });
  }

  const lines  = fs.readFileSync(CSV, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const leads  = lines.slice(1).map(line => {
    // Simple CSV parse (handles quoted commas correctly)
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inQ)          { inQ = true; continue; }
      if (c === '"' && inQ && line[i+1] === '"') { cur += '"'; i++; continue; }
      if (c === '"' && inQ)           { inQ = false; continue; }
      if (c === ',' && !inQ)         { cells.push(cur); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur);

    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });

  return res.json({ leads });
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🏋️  Forge Fitness backend running`);
  console.log(`   Website  → http://localhost:${PORT}`);
  console.log(`   Leads    → http://localhost:${PORT}/api/leads  (JSON view)`);
  console.log(`   CSV file → ${CSV}\n`);
});
