# Security policy

## Supported versions

Security fixes target the latest released version and the default branch.

## What this project does

DSH Landscape reads bounded public ecosystem metadata and optional public README/package files. It does not execute code from discovered repositories. Standalone semantic mode sends the user's need and bounded public evidence to the explicitly configured OpenAI-compatible provider.

## Reporting a vulnerability

Use GitHub's private Security Advisory reporting for dependency, command-execution, path-handling, credential-disclosure, or unsafe-rendering vulnerabilities when available. If private reporting is unavailable, contact the repository owner privately before opening a public issue.

Do not include real API tokens, cookies, private repository data, or production configuration in a report. Scanner and provider fixtures must use synthetic data.

## Credential handling

The CLI checks only whether provider environment variables are present, never prints their values, and sends a configured key only in the authorization header of the required provider request. `--json` output excludes provider configuration and secrets.
