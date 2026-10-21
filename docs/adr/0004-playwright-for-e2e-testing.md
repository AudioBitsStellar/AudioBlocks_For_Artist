# ADR 0004: Playwright for End-to-End Testing

## Status

Accepted

## Context

AudioBlocks For Artist requires comprehensive end-to-end testing to ensure:

- Critical user flows work correctly (signup, upload, authentication)
- UI components render properly across browsers
- Regressions are caught before production
- Confidence in deployments

## Decision

We will use Playwright as our end-to-end testing framework.

## Rationale

Playwright was chosen because:

- **Multi-browser support**: Tests run on Chromium, Firefox, and WebKit
- **Fast and reliable**: Parallel execution, auto-wait, and smart retry logic
- **Modern API**: Intuitive async/await syntax
- **Developer experience**: Excellent debugging with trace viewer and inspector
- **TypeScript first**: Built with TypeScript in mind
- **Network control**: Easy to mock API responses
- **Mobile testing**: Can test mobile viewport and touch interactions

Key features for our use case:

- Test critical flows: artist signup, music upload, authentication
- Visual regression testing capabilities
- API mocking for isolated tests
- CI/CD integration ready

Alternatives considered:

- **Cypress**: Popular but limited to Chrome-based browsers, different execution model
- **Selenium**: Older technology, slower, more flaky tests
- **Puppeteer**: Chrome-only, less feature-rich than Playwright
- **TestCafe**: Smaller community, fewer features

## Consequences

### Positive

- High confidence in deployments
- Catch UI bugs early in development
- Tests work across all major browsers
- Fast test execution with parallelization
- Great debugging experience

### Negative

- Test suite can be slow as it grows
- Requires maintenance when UI changes
- Initial setup and test writing time
- Can be flaky if not written carefully

## Implementation Notes

- Test files in `app/e2e` directory
- Configuration in `app/playwright.config.ts`
- Run tests with `npm run test:e2e`
- Use page object pattern for reusable test components
- Mock external API calls for deterministic tests
- Run in CI pipeline before deployment
