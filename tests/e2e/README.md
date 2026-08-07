# E2E Tests

Before running E2E tests for the first time:

    npx playwright install --with-deps chromium

Then run:

    npm run test:e2e

Requires portal running at http://localhost:3000 and CMS at http://localhost:3002.
