# Quick Reference

## Project Structure

```
src/
├── orchestration/     # Main coordinator
├── plugins/          # Event collectors (monkey patching)
├── events/           # Event type definitions
├── event-schemas/    # JSON schemas → TypeScript types
├── event-cache/      # Event buffering
├── event-bus/        # Internal pub/sub
├── dispatch/         # Send events to CloudWatch
├── sessions/         # Session/page tracking
├── loader/           # Bootstrap scripts
└── utils/            # Shared utilities

app/                  # Integration test pages
docs/                 # User documentation
webpack/              # Build configuration
```

## Important Entry Points

-   `src/index.ts` - NPM module entry
-   `src/index-browser.ts` - Browser bundle entry
-   `src/orchestration/Orchestration.ts` - Main orchestrator
-   `src/CommandQueue.ts` - Pre-load command buffering

## Configuration

See `docs/configuration.md` for all options. Key configs:

-   `telemetries` - Which events to collect
-   `allowCookies` - Session persistence
-   `sessionSampleRate` - Sampling percentage
-   `endpoint` - CloudWatch RUM endpoint

## Dependencies

-   `web-vitals` - Core Web Vitals metrics
-   `rrweb` - Session replay recording
-   `shimmer` - Safe monkey patching
-   `ua-parser-js` - User agent parsing
-   `@smithy/*` - AWS SDK utilities
