#!/usr/bin/env node
/**
 * Validates projects.json against NauroLabs description rules.
 * Run: node scripts/validate-projects.js
 * Exit code 1 on violations.
 *
 * Rules enforced:
 *   1. English only — no non-ASCII letter sequences (Cyrillic, CJK, etc.)
 *   2. No competitor/product mentions
 *   3. No age-specific language ("X-year-old")
 *   4. Unique icons across all projects
 *   5. Required fields present
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_PATH = path.resolve(__dirname, '..', 'projects.json');

// Banned product/brand names (case-insensitive)
const BANNED_BRANDS = [
  'fifa', 'duolingo', 'simcity', 'convict conditioning',
  'minecraft', 'roblox', 'fortnite', 'tiktok', 'chatgpt',
  'notion', 'trello', 'asana', 'jira', 'slack', 'discord',
  'uber', 'airbnb', 'stripe', 'shopify', 'quickbooks',
  'xero', 'sap', 'oracle', 'salesforce',
];

// Non-Latin script ranges (Cyrillic, CJK, Arabic, Hebrew, Devanagari, Thai, etc.)
const NON_LATIN_RE = /[\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u4E00-\u9FFF\u3040-\u30FF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u0E00-\u0E7F]/;

// Age-specific pattern: "X-year-old" or "X year old"
const AGE_RE = /\d+[\s-]?year[\s-]?old/i;

const REQUIRED_FIELDS = ['name', 'tagline', 'description', 'icon', 'category', 'status'];
const TEXT_FIELDS = ['name', 'tagline', 'description'];

let errors = 0;

function fail(project, field, message) {
  console.error(`  ✗ [${project}] ${field}: ${message}`);
  errors++;
}

function checkText(projectName, fieldName, text) {
  if (typeof text !== 'string') return;

  // Non-Latin characters
  if (NON_LATIN_RE.test(text)) {
    fail(projectName, fieldName, `Contains non-English characters: "${text.match(NON_LATIN_RE)[0]}..."`);
  }

  // Banned brands
  const lower = text.toLowerCase();
  for (const brand of BANNED_BRANDS) {
    if (lower.includes(brand)) {
      fail(projectName, fieldName, `References competitor/product "${brand}"`);
    }
  }

  // Age-specific language
  if (AGE_RE.test(text)) {
    fail(projectName, fieldName, `Contains age-specific language: "${text.match(AGE_RE)[0]}"`);
  }
}

// --- Main ---

let projects;
try {
  const raw = fs.readFileSync(PROJECTS_PATH, 'utf8');
  projects = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to read/parse projects.json: ${err.message}`);
  process.exit(1);
}

console.log(`Validating ${projects.length} projects...\n`);

// Check each project
for (const p of projects) {
  const name = p.name || '(unnamed)';

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (!p[field]) {
      fail(name, field, 'Required field is missing');
    }
  }

  // Text fields
  for (const field of TEXT_FIELDS) {
    checkText(name, field, p[field]);
  }

  // Highlights array
  if (Array.isArray(p.highlights)) {
    p.highlights.forEach((h, i) => checkText(name, `highlights[${i}]`, h));
  }
}

// Unique icons
const iconMap = new Map();
for (const p of projects) {
  if (!p.icon) continue;
  const name = p.name || '(unnamed)';
  if (iconMap.has(p.icon)) {
    fail(name, 'icon', `Duplicate icon "${p.icon}" — also used by "${iconMap.get(p.icon)}"`);
  } else {
    iconMap.set(p.icon, name);
  }
}

// Summary
console.log('');
if (errors > 0) {
  console.error(`✗ ${errors} violation(s) found. See rules: .github/PROJECT_DESCRIPTIONS.md`);
  process.exit(1);
} else {
  console.log('✓ All projects pass description rules.');
}
