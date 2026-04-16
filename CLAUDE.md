# CLAUDE.md

## Post-change test workflow

After completing any code changes in a response, always:

1. Run unit tests: `npm run test -- --run`
2. If they pass, run Playwright tests: `npm run test:e2e`
3. If both pass, notify the user that both suites passed.
4. If either suite fails, diagnose and fix the failures, then re-run from step 1.

Only run tests when files in the project were actually modified. Skip for documentation-only changes or when only reading/exploring code.
