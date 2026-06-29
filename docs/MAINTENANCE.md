# MAINTENANCE PLAYBOOK — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** APPROVED  
**Date:** June 27, 2026  
**Author:** Chief Software Architect

---

## 1. SUPPORT & LIFECYCLE POLICY

PromptAgent v1.x is a production-hardened platform. This Playbook governs the daily maintenance operations, bug triage, feature development flows, and releasing workflows to sustain its high reliability.

### 1.1. Support Windows

- **Active Support:** 12 months from v1.0.0 release. Covers active feature development, minor capability improvements, and major bug fixing.
- **Security & Critical Bug Maintenance:** 24 months from v1.0.0 release. Covers emergency patches for core execution loop errors, memory leak corrections, and zero-day dependency remediation.

---

## 2. COMPREHENSIVE BUG-FIX WORKFLOW

Any defect reported in production must be triaged and resolved following a strict, reproducible pipeline:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  1. Defect Log  │      │  2. Regression  │      │   3. Patching   │      │ 4. Verification │
│  & Verification │ ───> │    Test Case    │ ───> │   Development   │ ───> │  & Integration  │
│ (Reproducer/PR) │      │ (Verify Failure)│      │  (Target Fix)   │      │ (Full Suite Pass)│
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Step 1: Reproduction & Triage

1. Extract the defect details (e.g., specific schema violation, broken transition step, or parsing error).
2. Create an isolated project directory under `projects/` replicating the failure conditions.
3. Run `npm run validate-project` to verify workspace structure.

### Step 2: Write a Regression Test

Before editing core files, write an automated test in the `tests/` directory that fails explicitly because of the bug.

- _Rule:_ A bug is not considered "fixed" unless an automated test is checked in to prevent its recurrence.

### Step 3: Implement Code Modification

Following the **Governance Guidelines**, modify code using the simplest possible fix. Bypassing schemas or hardcoding routing boundaries is strictly prohibited.

### Step 4: Verify & Merge

Run the regression test along with the comprehensive suite:

```bash
npm run test:all
```

Ensure all tests are 100% green and no ESLint/Prettier warnings exist. Open a PR and request architect sign-off.

---

## 3. FEATURE DEVELOPMENT WORKFLOW

Adding non-breaking capabilities to the PromptAgent ecosystem follows this structured lifecycle:

1. **Submit ADR:** Write and obtain acceptance for an ADR defining the feature boundaries.
2. **Design Extension Points:** Leverage `docs/EXTENSION_GUIDE.md` surfaces. Avoid adding raw code within Core Modules.
3. **Implementation:** Code the feature asynchronously, ensuring all new functions are fully covered with unit tests.
4. **Documentation:** Write inline JSDoc comments and append usage guides to `docs/` and `README.md`.
5. **Release Hook:** Register any new telemetry hooks or schemas to allow monitoring via the `event-bus.js`.

---

## 4. STRICT TESTING REQUIREMENTS

All submissions to the PromptAgent codebase are subject to a **100% Pass Threshold**.

### 4.1. The Standard Test Suite Matrix:

- **`tests/event-validation-test.js`:** Verifies schema structure and strict event bus interception middleware.
- **`tests/phase7-integration-test.js`:** Runs deep integration steps over state progression pipelines.
- **`tests/phase8-health-test.js`:** Assesses telemetry and health evaluation algorithms.
- **`tests/phase9-prompt-evolution-test.js`:** Tests self-evolution engines and promoter rules.
- **`tests/phase9-e2e-learning-cycle.js`:** Validates full learning loop memory updates.
- **`tests/phase10-scheduler-test.js`:** Validates background auto-scheduling cycles.
- **`tests/phase95-automation-test.js`:** Ensures automated pipeline runners are deterministic.

To run the full test suite locally, execute:

```bash
npm run test:all
```

---

## 5. STANDARD RELEASE WORKFLOW

Releasing formal versions of PromptAgent (patches or minor updates) requires executing this checklist sequentially:

1. **Verify Master Branch:** Confirm that the current `main` branch is 100% green in CI/CD (GitHub Actions).
2. **Execute Local Validation Audits:**
   ```bash
   node scripts/phase9-final-verify.js
   ```
3. **Bump Semantic Version:**
   Update the `version` attribute in `package.json` following SemVer guidelines.
4. **Update CHANGELOG.md:**
   Add a summary of issues fixed, deprecations announced, and features added.
5. **Apply Release Tags:**
   Commit the version change and tag the git repository:
   ```bash
   git commit -am "release: v1.0.0-beta.x"
   git tag v1.0.0-beta.x
   git push origin main --tags
   ```
6. **Publish:** Publish package artifacts or release bundles to the enterprise registry.
