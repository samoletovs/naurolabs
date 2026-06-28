# NauroLabs

> A research lab where ideas get built, tested, and occasionally work.

Live at **[naurolabs.com](https://naurolabs.com)**

---

## What is NauroLabs?

NauroLabs is a one-person research lab exploring how AI changes software and business. We run experiments across multiple paradigms — games, agents, SaaS, data tools, AI tutors — to find out what actually works.

This repo is the **landing page**: a project catalog that links to every experiment.

## Projects

| Project | What it is | URL |
|---|---|---|
| [atlas](https://github.com/samoletovs/atlas) | AI personal teacher — turns GitHub repo activity into lessons | atlas.naurolabs.com |
| [amberRepublic](https://github.com/samoletovs/amberRepublic) | Latvia political & economic simulation game | amber.naurolabs.com |
| [portaBaltica](https://github.com/samoletovs/portaBaltica) | Baltic economic data intelligence dashboard | portabaltica.naurolabs.com |
| [rosette](https://github.com/samoletovs/rosette) | AI electrical socket planner for Baltic properties | rosette.naurolabs.com |
| [tPlan](https://github.com/samoletovs/tPlan) | AI workout generator from training methodology books | tplan.naurolabs.com |
| [agentFlow](https://github.com/samoletovs/agentFlow) | Visualiser for NauroLabs agent architectures | agentflow.naurolabs.com |
| [playGround](https://github.com/samoletovs/playGround) | Arcade games as single-file HTML pages | playground.naurolabs.com |
| [art](https://github.com/samoletovs/art) | Generative web art — single-file HTML pieces | art.naurolabs.com |

## Development

```bash
# No build step — static files served from landing-page/
# Edit index.html / style.css / app.js directly
# Project data lives in landing-page/projects.json
```

## Hosting

Azure Static Web Apps (Free tier). Deployed on push to `main` via GitHub Actions.

## Shared agent run pattern

Reusable unattended-run support is in `/home/runner/work/naurolabs/naurolabs/shared`:

- session checkpoints
- replay summary generation
- acceptance checks for reviewer-ready output
- wrappers for `agentMode`, `mindMe`, and `memex`

## License

MIT — see [LICENSE](LICENSE).
