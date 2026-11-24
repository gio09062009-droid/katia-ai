# Katia Skills Worker (foundation)

This is an isolated Cloudflare Worker. It does not replace `katia-braine` and is not deployed yet.

## Current endpoint

- `GET /health` — basic service health response.
- `POST /v1/skills/analyze` — accepts `{"owner":"OWNER","repo":"REPOSITORY","ref":"main"}`, reads a bounded GitHub repository and validates its declarative Skill package.

The analyze endpoint returns a report only. It does not install, activate, or execute a Skill.

## Local checks

Requires Node.js 20 or newer:

```sh
npm test
```

## Worker configuration

Before deployment, configure a strong random secret:

```sh
npx wrangler secret put SKILLS_API_TOKEN
```

Optionally configure a GitHub token to improve API rate limits:

```sh
npx wrangler secret put GITHUB_TOKEN
```

Then test locally and deploy only after reviewing the code and setting up authentication between the existing Brain Worker and this service.

## Critical integration rule

**Never put `SKILLS_API_TOKEN` or `GITHUB_TOKEN` in `index.html`, browser JavaScript, local storage, or a public repository.** The future frontend should call the existing authenticated Katia Brain, which can call this Worker server-to-server using a Worker secret.

## Limits and behavior

- Public GitHub repositories only in this first version.
- At most 50 files, 64 KiB per file and 256 KiB total.
- Only UTF-8 Markdown, JSON and text files are read.
- Executable, binary, archive and unsupported file types are rejected by the analyzer.
- Repository content is treated as untrusted data.
- No package code is evaluated or executed.
- No install, update, activation, D1 or R2 operations exist yet.
