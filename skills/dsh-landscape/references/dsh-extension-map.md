# DSH extension map for build briefs

Use only after the evidence workflow establishes a build or extension opportunity.

- Prefer an external plugin bundle for DSH runtime tools, UI, channels, model routing, or other Cordis-composed behavior. Follow the current upstream package and composition documentation; do not patch DSH core.
- Prefer one portable Agent Skill for reusable host-Agent workflow guidance. DSH currently discovers project skills from `.dsh/skills` and `.agents/skills`; Codex discovers repository skills from `.agents/skills`.
- Treat MCP as an interoperability option when the capability is a general external tool provider, not as a requirement for ordinary Skill/CLI use.
- Separate factual retrieval from semantic reasoning. Keep deterministic evidence available without a model key; let a host Agent or configured provider perform need decomposition.

Primary references:

- https://github.com/deepseek-ai/deepseek-harness
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md
- https://agentskills.io/specification
- https://developers.openai.com/codex/skills
