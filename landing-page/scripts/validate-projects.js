#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PROJECTS_PATH = path.resolve(__dirname, "..", "projects.json");
const VISIBILITY_PATH = path.resolve(__dirname, "..", "public-repos.json");
const QUESTION_IDS = new Set(["q1", "q2", "q3", "q4"]);
const REQUIRED_FIELDS = ["name", "repo", "question", "stage", "description"];
const BANNED_BRANDS = [
  "airbnb", "chatgpt", "discord", "duolingo", "fifa", "jira", "notion",
  "oracle", "salesforce", "sap", "shopify", "simcity", "slack", "stripe",
  "trello", "uber", "xero"
];
const NON_LATIN_RE = /[\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u4E00-\u9FFF\u3040-\u30FF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u0E00-\u0E7F]/;
const AGE_RE = /\d+[\s-]?year[\s-]?old/i;

// Deliberately a hand-maintained number, not projects.length. It is a tripwire
// against an entry being dropped or duplicated by a bad merge - a count derived
// from the file it is meant to check would agree with any value and catch
// nothing. Bump it in the same commit that adds or removes a project.
const EXPECTED_ENTRIES = 28;

let errors = 0;

function fail(project, field, message) {
  console.error(`  x [${project}] ${field}: ${message}`);
  errors += 1;
}

function parseJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateText(project, field, value) {
  if (NON_LATIN_RE.test(value)) {
    fail(project, field, "Contains non-English characters");
  }
  if (AGE_RE.test(value)) {
    fail(project, field, "Contains age-specific language");
  }
  const lower = value.toLowerCase();
  BANNED_BRANDS.forEach(brand => {
    if (lower.includes(brand)) {
      fail(project, field, `References competitor or product "${brand}"`);
    }
  });
}

function main() {
  const projects = parseJson(PROJECTS_PATH);
  const visibility = parseJson(VISIBILITY_PATH);
  const names = new Set();

  console.log(`Validating ${projects.length} catalog entries...`);

  projects.forEach(project => {
    REQUIRED_FIELDS.forEach(field => {
      if (!project[field]) fail(project.name || "(unnamed)", field, "Required field is missing");
    });

    if (names.has(project.name)) fail(project.name, "name", "Duplicate project name");
    names.add(project.name);

    if (!QUESTION_IDS.has(project.question)) {
      fail(project.name, "question", `Unknown question "${project.question}"`);
    }
    if (!/^(Can|An experiment in)/.test(project.description)) {
      fail(project.name, "description", "Must lead with the research question or experiment");
    }
    if (!/[?.]$/.test(project.description)) {
      fail(project.name, "description", "Must be one complete sentence");
    }
    validateText(project.name, "description", project.description);

    if ("sourceUrl" in project) {
      fail(project.name, "sourceUrl", "Source URLs must be derived from repository visibility");
    }
  });

  if (projects.length !== EXPECTED_ENTRIES) {
    fail("catalog", "count", `Expected ${EXPECTED_ENTRIES} Vision entries, found ${projects.length}`);
  }

  if (!Array.isArray(visibility.publicRepos)) {
    fail("visibility", "publicRepos", "Must be an array");
  }

  if (errors) {
    console.error(`\n${errors} validation error(s).`);
    process.exit(1);
  }

  console.log("Catalog and visibility snapshot are valid.");
}

try {
  main();
} catch (error) {
  console.error(`Validation failed: ${error.message}`);
  process.exit(1);
}
