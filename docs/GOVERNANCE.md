# FRAMEWORK GOVERNANCE — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** APPROVED  
**Date:** June 27, 2026  
**Author:** Chief Software Architect  

---

## 1. INTRODUCTORY POLICY

The PromptAgent codebase is entering a **governed maintenance stage**. To protect our high reliability metrics (all 153/153 tests passing, verified deterministic execution path), all updates to architecture, API interfaces, schemas, or dependencies must run through the governance loops outlined in this document.

---

## 2. VERSIONING POLICY (SEMANTIC VERSIONING)

PromptAgent adheres strictly to **Semantic Versioning 2.0.0 (SemVer)**:

$$\text{Version} = \text{MAJOR} . \text{MINOR} . \text{PATCH}$$

- **MAJOR version:** Incremented **only** when breaking public API contracts (as classified in `docs/API_CONTRACT.md`) or structural database/state-schema boundaries.
- **MINOR version:** Incremented when adding new backward-compatible capabilities, custom non-breaking adapters, or novel experimental utility options.
- **PATCH version:** Incremented for backward-compatible bug fixes, performance optimizations, and documentation completions.

---

## 3. ARCHITECTURAL DECISION RECORDS (ADR) PROCESS

Any modification that impacts directory layouts, changes event pathways, introduces third-party packages, or alters the frozen dependency boundaries **must** be proposed via an Architectural Decision Record (ADR).

### 3.1. ADR Directory & Lifespan
All ADRs are stored under `schemas/adr.schema.json` compliant JSON structures or flat markdown files within a designated folder.

### 3.2. ADR Status Lifecycle
An ADR moves through four deterministic states:

```
Proposed ───> Accepted ───> Implemented
     │
     └───> Rejected / Superseded
```

### 3.3. Mandatory ADR Structure
Every ADR must include:
1. **Title & Context:** What is the technical problem and current background constraint?
2. **Proposed Solution:** Architectural diagrams, changed require loops, and file actions.
3. **Consequences:** Impact on runtime speed, test coverage requirements, and backward compatibility.
4. **Validation Checklist:** Verification runs required to prove safety.

---

## 4. ARCHITECTURE CHANGE & CODE REVIEW POLICY

To merge any code modification into the `main` branch of PromptAgent, developers must complete the following rigorous quality process:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ 1. Local Branch │      │ 2. Pull Request │      │  3. CI/CD Pass  │      │ 4. Peer Review  │
│  & Validation   │ ───> │   Submission    │ ───> │  (Lint, Tests)  │ ───> │    Approval     │
│ (All tests pass)│      │  (Target: main) │      │  (100% Green)   │      │ (Min. 1 Architect)│
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 4.1. Step-by-Step Code Review Requirements:
- **Zero Warnings Linting:** Running `npm run lint` must return absolutely 0 errors and 0 warnings.
- **Formatting Match:** Code must be fully formatted according to Prettier standards. This is enforced during CI via `npm run format:check`.
- **Comprehensive Testing:** The full automated test suite must run and pass without failures:
  ```bash
  npm run test:all
  ```
- **Architect Approval:** At least one Senior Architect must review and sign off on any pull request before merging. Changes to CORE modules require explicit approval from the Chief Software Architect.

---

## 5. BACKWARD COMPATIBILITY & BREAKING CHANGE POLICY

No breaking changes are tolerated during the v1.x series. If a change is deemed necessary but is potentially breaking:

1. **Isolation & Redirection:** Keep the older API method in place. Internally, map it to the new logic or wrap it in a compatibility handler.
2. **Warn & Document:** Mark the interface as deprecated using the procedures defined in `docs/DEPRECATION_POLICY.md`.
3. **Defer:** Schedule the physical deletion of the deprecated module for the next major version release (`v2.0.0`).
4. **Data Portability:** If output states are changed, a migration/upgrade utility (similar to `legacy-adapter.js`) must be shipped alongside the release to dynamically convert existing user data files.
