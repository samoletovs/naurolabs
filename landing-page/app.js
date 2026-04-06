/* Landing page — renders project cards from projects.json
   Auth-aware: teaser cards for anonymous, full cards for authenticated users */

const CATEGORY_ICONS = {
  game:        '🎲',
  tool:        '🔌',
  saas:        '📊',
  marketplace: '🤝',
  'ai-agent':  '☕',
  personal:    '💪',
  experiment:   '🧪',
};

const STATUS_LABELS = {
  'in-development': 'In development',
  'experiment':      'Experiment',
};

let currentUser = null;

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'just now';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

async function getAuthUser() {
  try {
    const res = await fetch('/.auth/me');
    const data = await res.json();
    if (data.clientPrincipal) return data.clientPrincipal;
  } catch { /* not logged in */ }
  return null;
}

function renderAuthUI(user) {
  const container = document.getElementById('header-actions');

  if (user) {
    const name = user.userDetails || user.userId || 'User';
    container.innerHTML = `
      <span class="auth-user">
        <span class="auth-user-name">${name}</span>
        <a href="/.auth/logout?post_logout_redirect_uri=/" class="auth-link">Sign out</a>
      </span>
    `;
  }
}

function renderStats(projects) {
  const container = document.getElementById('stats');
  const techs = new Set();
  projects.forEach(p => (p.stack || []).forEach(t => techs.add(t)));

  container.innerHTML = `
    <div class="stat">
      <span class="stat-value">${projects.length}</span>
      <span class="stat-label">Projects</span>
    </div>
    <div class="stat">
      <span class="stat-value">${techs.size}</span>
      <span class="stat-label">Technologies</span>
    </div>
  `;
}

function renderProjectCard(project, isAuthenticated) {
  const icon = project.icon || CATEGORY_ICONS[project.category] || '📦';
  const statusLabel = STATUS_LABELS[project.status] || project.status || '';

  const statusBadge = statusLabel
    ? `<span class="status-badge">${statusLabel}</span>`
    : '';

  const updatedBadge = project.lastUpdated
    ? `<span class="updated-badge" title="Last pushed ${new Date(project.lastUpdated).toLocaleDateString()}">${timeAgo(project.lastUpdated)}</span>`
    : '';

  // Teaser card for anonymous users — just the header
  if (!isAuthenticated) {
    return `
      <article class="project-card">
        <div class="project-card-top">
          <div class="project-card-header">
            <span class="project-icon">${icon}</span>
            <div>
              <h3 class="project-name">${project.name}</h3>
              <p class="project-tagline">${project.tagline}</p>
            </div>
          </div>
          ${statusBadge}
          ${updatedBadge}
        </div>
      </article>
    `;
  }

  // Full card for authenticated users
  const highlights = project.highlights
    ? `<ul class="project-highlights">${project.highlights.map(h => `<li>${h}</li>`).join('')}</ul>`
    : '';

  const stack = project.stack && project.stack.length > 0
    ? `<div class="project-stack">${project.stack.map(t => `<span class="stack-tag">${t}</span>`).join('')}</div>`
    : '';

  const appLink = project.appUrl
    ? `<a href="${project.appUrl}" class="project-action" target="_blank" rel="noopener noreferrer">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9"/></svg>
        Open app
      </a>`
    : '';

  const sourceLink = project.sourceUrl
    ? `<a href="${project.sourceUrl}" class="project-action project-action-secondary" target="_blank" rel="noopener noreferrer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        Source
      </a>`
    : '';

  const hasActions = appLink || sourceLink;
  const actionsBlock = hasActions
    ? `<div class="project-actions">${appLink}${sourceLink}</div>`
    : '';

  return `
    <article class="project-card">
      <div class="project-card-top">
        <div class="project-card-header">
          <span class="project-icon">${icon}</span>
          <div>
            <h3 class="project-name">${project.name}</h3>
            <p class="project-tagline">${project.tagline}</p>
          </div>
        </div>
        ${statusBadge}
        ${updatedBadge}
      </div>

      <p class="project-description">${project.description}</p>

      ${highlights}
      ${stack}
      ${actionsBlock}
    </article>
  `;
}

async function trackLogin(user) {
  try {
    await fetch('/api/track-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.userDetails || user.userId,
        provider: user.identityProvider,
        timestamp: new Date().toISOString()
      })
    });
  } catch { /* tracking is best-effort */ }
}

async function init() {
  try {
    // Check auth status and load projects in parallel
    const [user, projectsRes] = await Promise.all([
      getAuthUser(),
      fetch('projects.json')
    ]);

    currentUser = user;
    const projects = await projectsRes.json();
    const isAuthenticated = !!currentUser;

    renderAuthUI(currentUser);
    renderStats(projects);

    // Track login for authenticated users
    if (isAuthenticated) {
      trackLogin(currentUser);
      if (typeof gtag === 'function') {
        gtag('event', 'login', { method: 'google', user_id: currentUser.userId });
      }
    }

    // Sort by last updated — most recently active projects first
    projects.sort((a, b) => {
      const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return db - da;
    });

    // Warn about duplicate icons
    const iconMap = new Map();
    projects.forEach(p => {
      const icon = p.icon || CATEGORY_ICONS[p.category] || '📦';
      if (iconMap.has(icon)) {
        console.warn(`Duplicate icon "${icon}" used by "${iconMap.get(icon)}" and "${p.name}". Add a unique "icon" field to projects.json.`);
      } else {
        iconMap.set(icon, p.name);
      }
    });

    const grid = document.getElementById('projects-grid');
    grid.innerHTML = projects.map(p => renderProjectCard(p, isAuthenticated)).join('');
  } catch (err) {
    console.error('Failed to load projects:', err);
    document.getElementById('projects-grid').innerHTML =
      '<p style="color:var(--text-secondary)">Could not load projects.</p>';
  }
}

document.addEventListener('DOMContentLoaded', init);
