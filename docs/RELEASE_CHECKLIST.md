# Release Checklist — PromptAgent

Use this checklist to verify a production release of PromptAgent.

---

## Pre-Release Verification

### Architecture Verification
- [ ] Single entrypoint confirmed: `run.js`
- [ ] `package.json` `"main"` points to `run.js`
- [ ] `package.json` `"start"` points to `node run.js`
- [ ] No parallel startup paths exist
- [ ] All 28 core workflow files present
- [ ] No dead files in active directories

### Runtime Verification
- [ ] `npm start <project>` runs without crash
- [ ] Event bus initializes with 12 schemas
- [ ] Audit engine initializes
- [ ] Metrics engine initializes
- [ ] Prompt evolution scheduler starts
- [ ] Validation pipeline runs without errors
- [ ] Agent readiness check completes

### Tests Passing
- [ ] `npm test` — Phase 9 evolution tests (70/70)
- [ ] `tests/event-validation-test.js` (2/2)
- [ ] `tests/phase7-integration-test.js` (28/28)
- [ ] `tests/phase8-health-test.js` (51/51)
- [ ] `tests/phase9-e2e-learning-cycle.js`
- [ ] `tests/phase10-scheduler-test.js`
- [ ] `tests/phase95-automation-test.js`

### Lint Passing
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run format:check` passes

### CI Passing
- [ ] GitHub Actions CI workflow created
- [ ] Pipeline runs on push to main/develop
- [ ] Pipeline runs on pull requests to main
- [ ] All steps pass (install, lint, format, test)

### Documentation Updated
- [ ] `README.md` — Entrypoint, installation, architecture
- [ ] `CHANGELOG.md` — All changes since last release
- [ ] `CONTRIBUTING.md` — Up to date
- [ ] `docs/ARCHITECTURE_FREEZE.md` — Reflects current state
- [ ] All audit reports generated (audit/*.md)

---

## Release Action Items

### Version Management
- [ ] Determine release version:
  - **MAJOR** — Breaking architectural changes
  - **MINOR** — New features, backward compatible
  - **PATCH** — Bug fixes, backward compatible
- [ ] Update `package.json` version
- [ ] Update `CHANGELOG.md` with release date
- [ ] Create git tag: `git tag v<version>`

### Version Strategy
| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Architecture change | MAJOR | 1.0.0 → 2.0.0 |
| New feature | MINOR | 1.0.0 → 1.1.0 |
| Bug fix | PATCH | 1.0.0 → 1.0.1 |
| Pre-release | -beta, -rc | 1.0.0-beta → 1.0.0 |

### Current
- **Current version:** `1.0.0-beta`
- **Recommended first stable:** `1.0.0` (after production validation)

### Branch Management
- [ ] Merge `develop` → `release/<version>`
- [ ] Run full verification on release branch
- [ ] Merge `release/<version>` → `main`
- [ ] Create GitHub Release with changelog

### Deployment
- [ ] Verify `npm ci` installs cleanly
- [ ] Verify `npm start <project>` on clean install
- [ ] Verify all CLI scripts work
- [ ] Verify prompt evolution runs
- [ ] Verify audit log is writable

---

## Post-Release

- [ ] Tag pushed to remote
- [ ] GitHub Release published
- [ ] `develop` rebased onto `main`
- [ ] Version bumped on `develop` for next release
- [ ] CHANGELOG preparation started for next version

---

## Rollback Plan

If release has critical issues:

1. Identify the failing component (entrypoint, event bus, scheduler, etc.)
2. Revert the specific change, not the entire release
3. Run full test suite
4. Create patch release
5. If patch fails: `git revert` the release tag
6. Create hotfix branch from `main`

## Safety Guarantee

This checklist ensures:
- **Single deterministic entrypoint** — No ambiguity in how the system starts
- **No parallel startup paths** — All initialization flows through `run.js`
- **Full test coverage** — 7 test suites with 153+ passing tests
- **Production-safe execution** — Event validation, error handling, observability