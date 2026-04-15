# Runtime Routing

Wayland-Yutani Cyberdec is the product/UI shell. It should not own execution policy.

Execution routing belongs in the sibling Cognosys harness:

- local repo and filesystem work -> `just-bash`
- sandboxed JavaScript execution -> `lo`
- unsafe or destructive work -> explicit gating in the harness

## Why this matters

The UI should ask for the right behavior, but the harness should decide how to run it.

That keeps runtime policy:

- centralized
- inspectable
- swappable
- separated from product UI changes

## Relationship

- `Wayland-Yutani Cyberdec` = shell and visible app
- `Cognosys` = context, memory, and execution control plane
