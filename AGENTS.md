# AGENTS.md

Guidance for AI coding agents (Command Code, Claude Code, and others) working in NariCare-App. See `CLAUDE.md` for the full architecture and command reference.

## Git Workflow

- `staging` is the main branch for this repo. Always create new branches from `staging`.
- Never commit directly to `staging`, `master`, or `main`. Always work on a feature branch and commit there.
- When a feature is done, raise a PR into `staging`. The PR must include a thorough code review and a clear description of what changed and why.
- Commit only when explicitly asked, and only the files the user names.

## UI Design

- When building or changing UI, use design skills for higher quality. The `/ui-ux-pro-max` skill (and similar UI/design skills or agents) are encouraged for polished, production-grade interfaces.

## PR Requirements

- Base branch: `staging`.
- Include a clear description: what changed, why, and how it was tested.
- Include a thorough code review before merge.
