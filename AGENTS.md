# NauroLabs Landing Page — Copilot Coding Agent Instructions

## Project Overview

Static landing page for naurolabs.com — project catalog showcasing all NauroLabs experiments.

## Tech Stack

- Vanilla HTML + CSS + JavaScript (no framework)
- Azure Static Web Apps for hosting

## Build & Test Commands

```bash
# No build step — static files served directly from landing-page/
# Verify: open landing-page/index.html in browser
```

## Directory Structure

```text
.main/
├── landing-page/
│   ├── index.html             # Main page
│   ├── style.css              # Styles
│   ├── app.js                 # Client JS
│   ├── projects.json          # Project catalog data
│   ├── repos.json             # GitHub repo metadata
│   └── staticwebapp.config.json
└── .github/
    └── workflows/
        └── deploy.yml         # Azure SWA deployment
```

## Conventions

- Keep it simple — vanilla HTML/CSS/JS, no build tools
- Project data lives in projects.json — update there when adding/removing projects
- Follow existing visual style (dark theme, NauroLabs brand)
- Keep changes minimal and focused on the issue
