#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const OWNER = "samoletovs";
const OUTPUT_PATH = path.resolve(__dirname, "..", "public-repos.json");
const PROJECTS_PATH = path.resolve(__dirname, "..", "projects.json");

function queryRepos() {
  const output = execFileSync(
    "gh",
    ["repo", "list", OWNER, "--limit", "200", "--json", "name,visibility"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  return JSON.parse(output);
}

function main() {
  const catalogRepos = new Set(
    JSON.parse(fs.readFileSync(PROJECTS_PATH, "utf8"))
      .filter(project => project.sourceAllowed !== false)
      .map(project => project.repo.toLowerCase())
  );

  const publicRepos = queryRepos()
    .filter(repo => repo.visibility === "PUBLIC" && catalogRepos.has(repo.name.toLowerCase()))
    .map(repo => repo.name)
    .sort((left, right) => left.localeCompare(right));

  const snapshot = {
    owner: OWNER,
    publicRepos
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${publicRepos.length} public repositories to ${OUTPUT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error(`Could not refresh repository visibility: ${error.message}`);
  process.exitCode = 1;
}
