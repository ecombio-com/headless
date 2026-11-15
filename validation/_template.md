# Validation: <ID> <feature name>

Spec: `specs/<ID>-<slug>.md` · Environment: dev Worker | prod via workers.dev

## Runs
Newest first. A run passes only when every line passes.

### Run <n> · <YYYY-MM-DD> · PASS | FAIL

**Gate (plan.md §2)**
- [ ] `pnpm typecheck`
- [ ] `pnpm build` (before prod)
- [ ] No secrets in the diff
- [ ] 200 on the page, no errors in `wrangler tail` (3 loads)
- [ ] No "Too many subrequests" warning
- [ ] 375px and 1440px (frontend)
- [ ] Keyboard and visible focus (frontend)
- [ ] Works on dev and prod store (backend)
- [ ] Fails safely when the service is down (backend)

**Acceptance criteria (from the spec)**
- [ ] AC1:
- [ ] AC2:
- [ ] AC3:

**Evidence:** URLs tested, log lines, screenshots
**Result:** PASS → mark `[x]` in plan.md · FAIL → note the fix, keep `[v]` (2 fails = re-plan, plan.md §3)
