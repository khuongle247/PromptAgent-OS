# Contributing to PromptAgent

Thank you for your interest in contributing to PromptAgent! This document provides guidelines and requirements for contributing.

## Project Structure

```
PromptAgent/
├── workflow/          # Core runtime modules (28 files)
│   ├── agent-*.js     # Agent execution and orchestration
│   ├── event-*.js     # Event bus and validation
│   ├── prompt-*.js    # Prompt evolution system
│   └── ...            # State, metrics, health, learning
├── scripts/           # CLI tools and utilities
│   └── validation/    # Validation utilities
├── validation/        # External validation modules
├── tests/             # Test suites (7 files)
├── schemas/           # JSON schemas for contracts and events
├── prompts/           # Agent prompt templates
├── adapters/          # Legacy compatibility adapters
├── agents/            # Agent context modules
├── config/            # Configuration files
├── archive/           # Archived unused files
├── audit/             # Architecture audit reports
├── docs/              # Documentation
└── run.js             # Single entrypoint (DO NOT MODIFY)
```

## Single Entrypoint Rule

**`run.js` is the ONLY canonical entrypoint.** It must never be bypassed for production execution. Internal workflow modules (`workflow/pipeline-runner.js`, etc.) must not be invoked directly for system startup.

For debugging specific components, use individual CLI scripts:
- `node scripts/init-project-v2.js <name> <type>`
- `node workflow/agent-executor.js <project> <role>`

## Coding Standards

### JavaScript
- **Style:** CommonJS (required by `package.json` `"type": "commonjs"`)
- **Linting:** ESLint with recommended rules + Prettier integration
- **Formatting:** Prettier with project `.prettierrc` configuration

### Requirements
- All new files must pass `npm run lint`
- All new files must pass `npm run format:check`
- All tests must pass (`npm test` and `npm run test:all`)

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `docs` — Documentation only
- `test` — Adding or updating tests
- `chore` — Maintenance tasks, dependency updates
- `arch` — Architecture changes
- `perf` — Performance improvements

### Examples
```
feat(evolution): add cross-role dependency tracking
fix(executor): handle null prompt in mock mode
docs(readme): update installation instructions
chore(deps): update ajv to 8.17.1
```

## Branch Strategy

- `main` — Production-ready releases
- `develop` — Integration branch for features
- `feature/<name>` — Feature branches (branch from `develop`)
- `fix/<name>` — Bug fix branches (branch from `develop`)
- `release/<version>` — Release preparation (branch from `develop`)

### Workflow
1. Create a feature/fix branch from `develop`
2. Make changes with tests
3. Run `npm run lint` and `npm test`
4. Create a pull request to `develop`
5. After review and CI passing, merge
6. Releases are merged from `develop` to `main`

## Pull Request Checklist

Before submitting a PR:

- [ ] Code follows project coding standards
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run format:check` passes
- [ ] `npm test` passes (existing tests)
- [ ] `npm run test:all` passes (all test suites)
- [ ] New code includes tests
- [ ] No dead code introduced
- [ ] Single entrypoint preserved (run.js untouched)
- [ ] No architecture changes without prior discussion
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Documentation updated (if applicable)

## Testing Requirements

### Running Tests
```bash
# Quick test (Phase 9 evolution tests)
npm test

# All test suites
npm run test:all
```

### Test Suites
| Suite | File | Coverage |
|-------|------|----------|
| Event validation | `tests/event-validation-test.js` | Event bus + schema validation |
| Phase 7 integration | `tests/phase7-integration-test.js` | Audit + Metrics engines |
| Phase 8 health | `tests/phase8-health-test.js` | Framework health engine |
| Phase 9 evolution | `tests/phase9-prompt-evolution-test.js` | (70 tests) Full evolution pipeline |
| Phase 9 E2E | `tests/phase9-e2e-learning-cycle.js` | End-to-end learning demo |
| Phase 10 scheduler | `tests/phase10-scheduler-test.js` | Scheduler automation |
| Phase 95 automation | `tests/phase95-automation-test.js` | Automation validation |

### Adding Tests
- Place new test files in `tests/`
- Follow existing naming: `phase<number>-<description>-test.js`
- Test files must not require external network access
- Mock LLM calls with `buildMockOutput()` from `agent-executor.js`

## Architecture Constraints

### DO NOT
- Modify `run.js` entrypoint logic
- Bypass the pipeline-runner for production startup
- Delete files without proof of zero `require()` references
- Merge or remove core workflow engines
- Change the event-driven architecture pattern
- Remove legacy scripts without updating `package.json` first

### DO
- Add new workflow modules by extending `workflow/pipeline-runner.js`
- Communicate between modules via the Event Bus
- Add event types following existing schema patterns
- Archive dead files to `archive/` (preserve history, don't delete)
- Update CHANGELOG.md with significant changes

## Code Review Process

1. All PRs require at least one review from a core maintainer
2. CI must pass before merge
3. Architecture changes require architecture freeze document update
4. Runtime behavior changes must include before/after comparison