# DSH Landscape contributor instructions

These instructions apply to the entire repository.

- Keep the product need-first: `Need -> evidence -> coverage -> missing capability -> action`.
- Preserve the trust boundary. Never turn incomplete discovery into a `gap` verdict.
- Phase 1 exposes three primary commands only: `analyze`, `find`, and `brief`. `status` is a diagnostic utility.
- Keep the CLI, Node API, Agent Skill, and static site on the same core data and reasoning contracts.
- Do not log, serialize, commit, or echo API keys or GitHub credentials.
- Do not execute code from discovered repositories.
- Use synthetic fixtures and public ecosystem metadata in tests.
- Run `npm run check`, `npm test`, `npm run validate`, `npm run build`, and `npm pack --dry-run` before a release.
- English and Chinese README commands must remain identical and must be tested before publication.
