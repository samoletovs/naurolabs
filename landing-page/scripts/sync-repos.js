#!/usr/bin/env node
/**
 * sync-repos.js — Fetches all public repos for samoletovs from GitHub API
 * and writes/updates repos.json for the landing page.
 *
 * Usage: node scripts/sync-repos.js
 *
 * Requires: Node.js 18+ (native fetch)
 * Optional: set GITHUB_TOKEN env var for higher rate limits
 */

const fs = require('fs');
const path = require('path');

const GITHUB_USER = 'samoletovs';
const OUTPUT_FILE = path.join(__dirname, '..', 'repos.json');
const PROJECTS_FILE = path.join(__dirname, '..', 'projects.json');

async function fetchAllRepos() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'samoletovs-landing-sync',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repos = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}&sort=updated&type=public`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.length === 0) break;

    repos.push(...data);
    page++;
  }

  return repos;
}

async function fetchLanguages(repo, headers) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${repo.name}/languages`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  // Sort by bytes descending
  return Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

function generateHighlights(repo) {
  const highlights = [];

  if (repo.description) {
    // Extract key phrases from description
    const desc = repo.description.toLowerCase();
    if (desc.includes('game') || desc.includes('simulation')) highlights.push('Interactive simulation');
    if (desc.includes('ai') || desc.includes('machine learning')) highlights.push('AI-powered');
    if (desc.includes('api') || desc.includes('backend')) highlights.push('Backend service');
    if (desc.includes('cli') || desc.includes('tool')) highlights.push('Developer tool');
  }

  if (repo.has_pages) highlights.push('Live demo available');
  if (repo.topics && repo.topics.length > 0) highlights.push(`Topics: ${repo.topics.slice(0, 3).join(', ')}`);

  return highlights;
}

async function main() {
  console.log(`Fetching repos for ${GITHUB_USER}...`);

  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'samoletovs-landing-sync',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const rawRepos = await fetchAllRepos();
  console.log(`Found ${rawRepos.length} public repos.`);

  // Load existing repos.json to preserve manually added highlights
  let existing = {};
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    data.forEach(r => { existing[r.name] = r; });
  } catch {
    // No existing file, that's fine
  }

  const repos = [];

  for (const repo of rawRepos) {
    if (repo.archived) continue;

    const languages = await fetchLanguages(repo, headers);
    const prev = existing[repo.name];

    repos.push({
      name: repo.name,
      description: repo.description || 'No description provided.',
      url: repo.html_url,
      language: repo.language || (languages[0] || null),
      languages: languages,
      topics: repo.topics || [],
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
      homepage: repo.homepage || null,
      archived: repo.archived,
      // Preserve manually added highlights if they exist
      highlights: prev?.highlights || generateHighlights(repo),
    });
  }

  // Sort by updated date descending
  repos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(repos, null, 2) + '\n');
  console.log(`Written ${repos.length} repos to ${OUTPUT_FILE}`);

  // Update lastUpdated in projects.json from GitHub pushed_at
  await syncProjectDates(headers);
}

async function syncProjectDates(headers) {
  let projects;
  try {
    projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch {
    console.warn('No projects.json found, skipping date sync.');
    return;
  }

  let updated = 0;
  for (const project of projects) {
    if (!project.repo) continue;
    try {
      const url = `https://api.github.com/repos/${GITHUB_USER}/${project.repo}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`  Could not fetch ${project.repo}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      project.lastUpdated = data.pushed_at;
      updated++;
    } catch (err) {
      console.warn(`  Error fetching ${project.repo}: ${err.message}`);
    }
  }

  // Sort by lastUpdated descending so JSON file reflects the order
  projects.sort((a, b) => {
    const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
    const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
    return db - da;
  });

  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2) + '\n');
  console.log(`Updated lastUpdated for ${updated} projects in projects.json`);
}

main().catch(err => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
