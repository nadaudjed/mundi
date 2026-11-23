# MUNDI — Shared AI Collaboration Rules

Read PROJECT_CONTEXT.md and docs/EDITORIAL_GUIDELINES.md before proposing substantial work. These files are the shared source of truth for ChatGPT, Claude Code and future contributors.

## Roles and collaboration
- Founder: product vision, editorial approval for factual publications and major release decisions; no manual coding required.
- Claude Code: primary developer for immersive frontend, media playback, cross-device QA and Playwright end-to-end tests. Implement tasks tracked as GitHub issues. Read the latest main and coordinate through GitHub before changing shared files.
- ChatGPT: product direction, editorial publishing systems, architecture/quality integration, code reviews, issue specifications and GitHub contribution. Never claim Claude has executed a task unless its changes appear in GitHub.
- GitHub repository: canonical versioned source; local changes should be committed/pushed before asking another agent to review.

## Git workflow
- `main` is stable / release-ready.
- Use branches named `feature/<short-topic>`, `docs/<short-topic>`, or `fix/<short-topic>`.
- Prefer pull requests into `main` for review. A `develop` branch may be introduced when useful, but is not required for the first MVP.
- Never overwrite, force-push or discard another agent's unreviewed changes.
- Before starting: check current branch, uncommitted changes and recent commits. Pull latest changes when appropriate.
- Avoid working on the same files concurrently. If overlap occurs, coordinate via PRs.
- The founder has authorized automatic merges of standard feature/fix/docs pull requests after required GitHub quality checks pass; the CI automation governs eligibility. Avoid manual merges of failing builds. Changes to verified editorial publications, workflows, or deployment infrastructure are excluded from auto-merge and require explicit approval. Netlify deploys main automatically after a merge.
- Never commit credentials, .env secrets or API tokens.

## Team process
- Record work assignments in GitHub issues. Claude's immersion/QA work: issue #5. ChatGPT's editorial/publishing work: separate branches/issues.
- Each AI must check open PRs and issues before working, use separate branches, and leave a concise implementation/test summary in the PR.
- AI collaborators do not directly message one another: the shared repo, issue comments, and PR reviews are their coordination channel.
- Never assume a requested GitHub change has been implemented merely because it appears in an issue.

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
