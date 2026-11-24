# Katia Skills

Katia Skills are **declarative, permission-scoped extensions** that describe capabilities Katia may use through approved backend tools.

## Security baseline

- A GitHub repository is an untrusted source, not an authority.
- A manifest is metadata to validate; it is not executable code.
- Skill content is treated as data/instructions and must never be evaluated as JavaScript, shell, Python, WASM, or another executable format.
- A skill may request permissions, but the request is not a grant. Katia must show the user what each permission means and obtain explicit approval before enabling it.
- High-impact actions (sending messages, modifying files, writing to GitHub, or other external side effects) require a separate confirmation at the time of action.
- Unknown or unsupported permission names fail closed.
- Skills are disabled by default and can be revoked or uninstalled.

## Package layout (initial version)

```text
my-skill/
  katia.skill.json
  README.md
  instructions/
    skill.md
```

The `entrypoint` must point to a declarative `.md` or `.json` file inside the package. Paths must be relative and may not traverse directories.

## Manifest

See [manifest.schema.json](./manifest.schema.json) for the JSON Schema and [examples/hello-world/katia.skill.json](./examples/hello-world/katia.skill.json) for a minimal example.

## Initial supported permissions

- `network.read` — read public network resources through an approved fetch tool.
- `network.write` — request network writes through an approved integration; never arbitrary outbound requests.
- `files.read` / `files.write` — access user-selected files through approved file tools.
- `documents.create` / `documents.modify` — create or modify supported document formats through approved tools.
- `github.read` / `github.write` — access GitHub through an authorized GitHub connection.
- `device.open_app` — request opening a compatible installed app; subject to Android support and user action.
- `messages.draft` — prepare a message draft.
- `messages.send` — request sending only where an official app integration permits it and after explicit confirmation.
- `user.profile.read` — read only the profile fields specifically exposed and approved by the user.

## Lifecycle

1. Discover a candidate repository.
2. Fetch only bounded, supported text files.
3. Parse and validate the manifest against the schema.
4. Inspect package contents, declared capabilities, permissions, dependencies, publisher and integrity metadata.
5. Present a human-readable review to the user.
6. Install only after explicit user approval.
7. Register the exact version and permission grants.
8. Activate through an allowlisted capability adapter, never by executing package code.
9. Support disable, revoke, update and uninstall.

## Not in v1

No arbitrary code execution, shell commands, hidden background behavior, unrestricted device control, automatic message sending, or automatic installation from GitHub. These are intentionally excluded from the first release.
