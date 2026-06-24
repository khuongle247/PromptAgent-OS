# Testing Rules

## General Rules

- All new features must include tests.
- Existing tests must continue passing.
- Do not remove tests unless explicitly approved.

## Unit Testing

- Business logic must be covered by unit tests.
- Mock external dependencies.
- Keep tests deterministic.

## Integration Testing

- Test module interactions.
- Validate API contracts.
- Verify database operations.

## UI Testing

- Verify critical user flows.
- Test loading, success, and error states.

## Definition of Done

A task is considered completed only when:

- Code compiles successfully.
- Lint passes.
- Tests pass.
- Acceptance criteria are satisfied.