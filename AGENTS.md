# MUNDI — Shared AI Collaboration Rules

Read PROJECT_CONTEXT.md and docs/EDITORIAL_GUIDELINES.md before proposing substantial work. These files are the shared source of truth for ChatGPT, Claude Code and future contributors.

## Roles and collaboration
- Founder: product vision, editorial and release approvals; no manual coding required.
- Claude Code: primary local implementation agent.
- ChatGPT: product design, planning, code review and GitHub contribution.
- GitHub repository: canonical versioned source; local changes should be committed/pushed before asking another agent to review.

## Git workflow
- `main` is stable / release-ready.
- Use branches named `feature/<short-topic>`, `docs/<short-topic>`, or `fix/<short-topic>`.
- Prefer pull requests into `main` for review. A `develop` branch may be introduced when useful, but is not required for the first MVP.
- Never overwrite, force-push or discard another agent's unreviewed changes.
- Before starting: check current branch, uncommitted changes and recent commits. Pull latest changes when appropriate.
- Avoid working on the same files concurrently. If overlap occurs, coordinate via PRs.
- Do not merge into `main` or deploy publicly without founder approval.
- Never commit credentials, .env secrets or API tokens.

## Development standards
- Reuse the existing stack; if empty, prefer Next.js, TypeScript and Tailwind CSS.
- Keep components small, readable and typed.
- Favor performant, accessible and responsive design; respect reduced motion.
- Make interactive controls functional rather than decorative.
- Document important architecture choices in README.md or docs.
- Run available lint/build/tests before suggesting a merge. Disclose what could not be verified.
- Prioritize a working UI prototype with demo fixtures over speculative infrastructure.

## Editorial and media
- No fabricated real-world headlines, quotes, statistics or source links.
- Clearly label illustrative/demo content as such.
- Source real claims and show publication/update dates when available.
- Respect copyright, image licensing and attribution.
- AI can assist drafting but publication requires human review.
- Avoid sensationalism and false certainty.

## Reporting back
Respond in straightforward French with: what changed, where, what was tested, what needs review, and exact next actions for a non-technical founder.

## Deployment
Netlify is the intended host. Treat Netlify previews and production as different environments. Do not change production configuration without approval.
