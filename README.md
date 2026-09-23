# pi-devin-plus

Run your **Devin / Cognition account models** — Claude Opus 5.5, GPT-5.6 Sol, Fable 5, SWE-2 and 50+ more — inside the [pi coding agent](https://pi.dev), with pi's own tools, sessions and UI. Unofficial, not affiliated with Cognition.

Login once with the [Devin CLI](https://docs.devin.ai/cli); after that it behaves like any other pi provider.

## Quick start

```bash
pi install npm:pi-devin-plus
```

Then inside pi:

```text
/login devin                    # instant if the Devin CLI or Desktop is already signed in
/model devin/claude-opus-5      # pick any model your account can run
```

Pick a thinking level with Shift+Tab or `/thinking` — medium / high / max map to the matching model variant automatically.

## Requirements

- Pi Coding Agent 0.86+
- A signed-in [Devin CLI](https://docs.devin.ai/cli) (`devin auth status`) — a signed-in Devin Desktop also works
- Node 22.19+

## What it does

- **Login** — `/login devin` reuses the Devin CLI credential store (`~/.local/share/devin/credentials.toml`). If that is empty but Devin Desktop is signed in, the Desktop token is imported instead of forcing a browser round-trip.
- **Model catalog** — the live catalog comes from `devin models list --format json`, so the model list always matches your account. Reasoning models register under one family id (e.g. `devin/claude-opus-5`); the thinking level picks the variant, and levels the family doesn't ship are hidden from the picker.
- **Chat** — completions stream from Devin's cloud endpoint straight into pi, with full tool calling. Your previous turns — including tool calls and the model's own reasoning — are replayed so multi-step agent work stays coherent.

Commands:

- `/devin-status` — CLI path, version, auth state, credential source
- `/devin-refresh` — reload the model catalog without restarting

## How this differs from upstream ([kashyab12/pi-devin](https://github.com/kashyab12/pi-devin))

This package is a superset of upstream 0.2.0. Upstream's fixes (pi ≥ 0.86 transcript support, system-prompt field) are included, plus:

| | Effect you can see |
|---|---|
| Thinking + sealed-signature replay | Long agent loops keep the model's reasoning instead of restarting blind every turn |
| Devin Desktop sign-in reuse | No forced browser login if Desktop is already signed in; `/devin-status` shows the credential source |
| Family model ids + thinking levels | `devin/claude-opus-5` instead of `devin/claude-opus-5-high`; thinking level switches variants |
| Socket-close crash fix | A dropped connection mid-stream no longer kills the process |
| CLI-aligned request fields | Requests match what the Devin CLI itself sends (trajectory + prompt ids) |

## Which Devin package should you install?

Five pi packages talk to Devin. They are mutually exclusive (all register the `devin` provider):

| | pi-devin-plus (this) | pi-devin (upstream) | pi-devin-local | pi-devin-oauth | pi-devin-auth |
|---|---|---|---|---|---|
| **pi ≥ 0.86 (tools + system prompt work)** | ✓ | ✓ | ✗ broken — model ignores tools, agent runs one turn | ✓ | ✗ |
| **Thinking replay across turns** | ✓ | ✗ | ✓ | ✗ | ✗ |
| **Devin Desktop sign-in reuse** | ✓ | ✗ | ✓ | ✗ | ✗ |
| **One id per model family + thinking levels** | ✓ | ✗ (`-high` baked into ids) | ✓ | ✗ | ✗ |
| **Requires Devin CLI** | ✓ | ✓ | ✓ | ✗ (own OAuth) | ✗ (token paste) |
| **Live model catalog** | ✓ | ✓ | ✓ | ✓ | ✗ hardcoded |
| **Maintenance** | active | active | stale (last publish 2026-09-13; fix PRs unmerged) | active but self-described "reverse engineered, can break" | stale |

Short version:

- Use **pi-devin-plus** (this package) if you want upstream pi-devin plus the improvements above — or if you were on pi-devin-local, which is broken on pi ≥ 0.86.
- Use **pi-devin** if you want the minimal, upstream-only experience.
- Use **pi-devin-oauth** only if you refuse to install the Devin CLI and accept a reverse-engineered login that can break any time.

## Don't co-install

Install only **one** of `pi-devin-plus`, `pi-devin`, `pi-devin-local`, `pi-devin-auth` or `pi-devin-oauth` — they all register the `devin` provider and overwrite each other.

## Why a fork at all

The first Devin pi packages treated Devin as plain cloud chat, and models like Opus 5, Fable 5 and Sol answered:

```text
This model is only in Devin Local.
```

Those models are only reachable through the Devin CLI's model catalog. Upstream `pi-devin` solved that; this fork keeps that solution and adds the improvements listed above.

## License

MIT. Unofficial — not affiliated with Cognition.
