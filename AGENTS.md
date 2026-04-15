# Wayland-Yutani Cyberdec

This repo is the product shell and UI layer.

The canonical harness and memory rules live in the sibling repo:

- `..\cognosys\AGENTS.md`
- `..\cognosys\docs\COGNOSYS_MEMORY_ARCHITECTURE.md`
- `..\cognosys\docs\RUNTIMES.md`

## Read Order

1. `AGENTS.md`
2. `README.md`
3. `docs/HARNESS_CONTEXT.md`
4. `docs/WAYLAND_YUTANI_MEMORY_ARCHITECTURE.md`

## Working Rules

- Keep UI changes aligned with the harness docs.
- Treat the sibling harness repo as the source of truth for memory and workflow.
- Route execution concerns to the harness instead of embedding runtime policy here.
- Keep product state visible and inspectable.
- Update docs whenever the app behavior changes.

## Intent

This repo is the shell. The harness is where the context contract lives.
