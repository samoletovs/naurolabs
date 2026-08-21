const GITHUB_OWNER = "samoletovs";
const PUBLIC_REPOS_URL = `https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=100&type=owner`;

const QUESTIONS = {
  q1: {
    title: "Do we still need apps?",
    summary: "Testing whether the interface survives contact with a capable agent, from chat-only systems to software designed for agents as primary readers."
  },
  q2: {
    title: "Where is the AI-human boundary?",
    summary: "Testing how much judgement can be delegated before trust breaks, and where deliberate human approval still matters."
  },
  q3: {
    title: "What is worth selling?",
    summary: "Testing where durable value sits when software is cheap to build: trusted data, privacy, aggregation, local knowledge, or an operating loop."
  },
  q4: {
    title: "Can a company run itself?",
    summary: "The lab managing the lab: governance, shared infrastructure, agent visibility, and the control surfaces that keep autonomous work accountable."
  }
};

function normaliseRepoName(name) {
  return String(name || "").toLowerCase();
}

async function loadPublicRepos() {
  const snapshotRequest = fetch("public-repos.json").then(response => {
    if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
    return response.json();
  });

  const liveRequest = fetch(PUBLIC_REPOS_URL, {
    headers: { Accept: "application/vnd.github+json" }
  }).then(response => {
    if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
    return response.json();
  });

  try {
    const repos = await liveRequest;
    return new Set(repos.map(repo => normaliseRepoName(repo.name)));
  } catch (error) {
    console.info("Using the generated repository visibility snapshot.", error);
    const snapshot = await snapshotRequest;
    return new Set(snapshot.publicRepos.map(normaliseRepoName));
  }
}

function renderProjectName(project) {
  const heading = document.createElement("h3");
  const match = project.name.match(/^([a-z]+)([A-Z].*)$/);

  if (!match || !project.accentColor) {
    heading.textContent = project.name;
    return heading;
  }

  heading.append(document.createTextNode(match[1]));
  const accent = document.createElement("span");
  accent.style.color = project.accentColor;
  accent.textContent = match[2];
  heading.append(accent);
  return heading;
}

function createLink(url, text) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = text;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function renderProject(project, publicRepos) {
  const card = document.createElement("article");
  card.className = "project-card";

  const header = document.createElement("div");
  header.className = "project-card__header";
  header.append(renderProjectName(project));

  const stage = document.createElement("span");
  stage.className = "stage";
  stage.dataset.stage = project.stage;
  stage.textContent = project.stage;
  header.append(stage);

  const description = document.createElement("p");
  description.className = "project-card__description";
  description.textContent = project.description;

  const links = document.createElement("div");
  links.className = "project-card__links";

  if (project.domain) {
    links.append(createLink(`https://${project.domain}`, `Visit ${project.name}`));
  }

  const isPublic = publicRepos.has(normaliseRepoName(project.repo));
  if (project.sourceAllowed !== false && isPublic) {
    links.append(createLink(
      `https://github.com/${GITHUB_OWNER}/${project.repo}`,
      `View ${project.name} source`
    ));
  }

  card.append(header, description);

  if (project.note) {
    const note = document.createElement("p");
    note.className = "project-card__note";
    note.textContent = project.note;
    card.append(note);
  }

  card.append(links);
  return card;
}

function renderStats(projects, publicRepos) {
  const sourceCount = projects.filter(project =>
    project.sourceAllowed !== false &&
    publicRepos.has(normaliseRepoName(project.repo))
  ).length;

  const stats = [
    [projects.length, "Projects and lab systems"],
    [Object.keys(QUESTIONS).length, "Research questions"],
    [sourceCount, "Public source repositories"]
  ];

  const container = document.getElementById("stats");
  stats.forEach(([value, label]) => {
    const item = document.createElement("div");
    item.className = "stat";
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = value;
    item.append(term, detail);
    container.append(item);
  });
}

function renderCatalog(projects, publicRepos) {
  const container = document.getElementById("questions");

  Object.entries(QUESTIONS).forEach(([questionId, question], index) => {
    const section = document.createElement("section");
    section.className = "question";
    section.id = questionId;
    section.setAttribute("aria-labelledby", `${questionId}-title`);

    const questionHeader = document.createElement("header");
    questionHeader.className = "question__header";

    const titleGroup = document.createElement("div");
    const number = document.createElement("p");
    number.className = "question__number";
    number.textContent = `Question ${index + 1}`;
    const title = document.createElement("h2");
    title.id = `${questionId}-title`;
    title.textContent = question.title;
    titleGroup.append(number, title);

    const summary = document.createElement("p");
    summary.className = "question__summary";
    summary.textContent = question.summary;
    questionHeader.append(titleGroup, summary);

    const grid = document.createElement("div");
    grid.className = "project-grid";
    projects
      .filter(project => project.question === questionId)
      .forEach(project => grid.append(renderProject(project, publicRepos)));

    section.append(questionHeader, grid);
    container.append(section);
  });
}

async function init() {
  const status = document.getElementById("catalog-status");

  try {
    const [projectsResponse, publicRepos] = await Promise.all([
      fetch("projects.json"),
      loadPublicRepos()
    ]);

    if (!projectsResponse.ok) {
      throw new Error(`Project catalog request failed: ${projectsResponse.status}`);
    }

    const projects = await projectsResponse.json();
    renderStats(projects, publicRepos);
    renderCatalog(projects, publicRepos);
    status.hidden = true;
  } catch (error) {
    console.error("Failed to load the portfolio.", error);
    status.textContent = "The portfolio could not be loaded. Please try again later.";
  }
}

document.addEventListener("DOMContentLoaded", init);
