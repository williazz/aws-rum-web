# Development Workflows

## Build Commands

```bash
npm run build          # Full production build (schemas + webpack + dist)
npm run build:dev      # Development build with source maps
npm run server         # Start webpack dev server on :9000
```

## Testing

```bash
npm test                        # Jest unit tests
npm run integ                   # Playwright integration tests (all browsers)
npm run integ:chrome            # Chrome only
npm run integ:local:nightwatch  # Nightwatch tests (for monkey-patching features)
```

## Code Quality

```bash
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix linting issues
npm run prettier:fix   # Format code
```

## Key Files to Modify

### Adding a New Event Type

1. Create JSON schema in `src/event-schemas/`
2. Run `npm run build:schemas` to generate TypeScript types
3. Create event class in `src/events/`
4. Create plugin in `src/plugins/event-plugins/`
5. Register plugin in `Orchestration.ts`

### Modifying Dispatch Logic

-   `src/dispatch/Dispatch.ts` - Batching and retry logic
-   `src/dispatch/DataPlaneClient.ts` - API calls
-   `src/event-cache/EventCache.ts` - Event buffering

### Configuration Changes

-   `docs/configuration.md` - User-facing config docs
-   `src/orchestration/Orchestration.ts` - Config validation and defaults

## Common Issues

-   **Monkey patching conflicts**: Use Nightwatch tests, not TestCafe
-   **Build failures**: Run `npm run build:schemas` first
-   **Integration test flakiness**: Check `app/*.html` test pages
