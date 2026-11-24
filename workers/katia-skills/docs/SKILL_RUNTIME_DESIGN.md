# RFC: Katia Skill selection and runtime

Status: **Design only — not connected to the production Brain**

## Objective

Let Katia recognize when an installed Skill can help, choose the smallest relevant set, load its declarative instructions, and use only capabilities that the user has approved. A Skill is guidance and metadata, not executable code.

## Runtime sequence

1. **Understand the request.** Brain classifies the user's task and extracts the capability needed (for example, `documents.create` or `conversation.explain`).
2. **Read the user's enabled Skills.** Brain requests the authenticated user's install list from the Skills Worker. Only `enabled` installs are eligible.
3. **Filter by policy first.** Exclude Skills whose declared capabilities do not match the task, whose required permissions are not granted, whose version is unsupported, or whose package cannot be verified.
4. **Select minimally.** Choose the smallest relevant set. If multiple Skills overlap, prefer the more specific and lower-permission option. If confidence is low, proceed without a Skill or ask the user.
5. **Fetch exact package.** Brain retrieves the pinned `skillId/version` package. Skills Worker re-fetches the immutable commit, verifies SHA-256, and validates the manifest before returning text files.
6. **Treat instructions as untrusted data.** Add the selected Skill instructions to a clearly delimited, lower-priority context section. Never let package text override system/developer policy, safety rules, user intent, or tool permission checks.
7. **Authorize each capability.** A manifest declaration is not a grant. Brain may call only a known, built-in tool adapter whose permission is in the install's granted set. Unknown capability names fail closed.
8. **Confirm sensitive actions.** External writes, message sending, account changes, publishing, deletion, or other consequential actions require a clear user confirmation at the moment of action even when the Skill is enabled.
9. **Audit and explain.** Record the Skill ID/version and capability decisions without storing unnecessary user content. Katia can tell the user which Skill helped and why.

## Selection policy

- No enabled Skill means normal Brain behavior.
- Never install a Skill automatically because it appears relevant.
- Never enable a Skill automatically after installation; new installs remain disabled.
- A Skill cannot grant itself new permissions or install dependencies.
- A Skill's own text cannot authorize a tool call.
- Prefer no Skill over an unverified, incompatible, or over-privileged Skill.
- Limit the number and total size of injected Skill instructions per request.
- Cache only immutable package data by commit/digest; always check current install status and grants before use.

## Initial capability allowlist

Start with low-risk, instruction-only capabilities such as `conversation.explain`, `conversation.summarize`, `documents.analyze`, and `documents.create` where the existing Brain already has a safe implementation.

Do not expose `messages.send`, `device.open_app`, `network.write`, `files.write`, or other external side effects through generic Skill instructions. Add each such adapter separately, with narrow input validation, permission checks, explicit confirmation, and tests.

## Required tests

- Disabled or uninstalled Skills are never selected.
- A manifest capability without a matching grant is never used.
- Package digest mismatch, changed Git commit, or invalid manifest blocks loading.
- Prompt injection in Skill instructions cannot override higher-priority policy.
- A Skill cannot cause an unapproved tool call.
- Two overlapping Skills select the least-privileged suitable option.
- Package retrieval failure falls back to normal Brain behavior without blocking chat.
- The user is told when a Skill is used for a meaningful task, without exposing secrets or internal tokens.

## Integration boundary

The browser continues to call the existing Katia Brain endpoint. The Brain alone calls the isolated Skills Worker with server-side credentials and signed identity assertions. Do not add Skills API tokens, HMAC secrets, or direct private Worker URLs to `index.html`. Keep normal chat working if Skills are unavailable.
