# CloudWatch RUM Web Client Architecture

## Core Components

### Orchestration (`src/orchestration/`)

-   **Orchestration.ts**: Main coordinator for RUM client lifecycle
-   Manages plugin initialization, event collection, and dispatch

### Event System

-   **EventBus** (`src/event-bus/`): Pub/sub for internal events
-   **EventCache** (`src/event-cache/`): Buffers events before dispatch
-   **Event Types** (`src/events/`): Typed event schemas (navigation, errors, web vitals, HTTP)

### Plugins (`src/plugins/`)

Event collectors that monkey-patch browser APIs:

-   `event-plugins/`: Navigation, JS errors, HTTP (XHR/Fetch), Web Vitals, DOM events
-   `PluginManager.ts`: Plugin lifecycle management

### Dispatch (`src/dispatch/`)

-   **Dispatch.ts**: Batches and sends events to CloudWatch RUM
-   **Authentication**: Cognito, STS, Basic auth strategies
-   **HTTP Handlers**: Fetch, Beacon, with retry logic
-   **DataPlaneClient.ts**: CloudWatch RUM API client

### Sessions (`src/sessions/`)

-   **SessionManager.ts**: User session tracking
-   **PageManager.ts**: Page view lifecycle
-   **VirtualPageLoadTimer.ts**: SPA navigation timing

## Build Outputs

### CDN Bundle

-   `build/assets/cwr.js` - Minified browser bundle
-   Loaded via `<script>` tag, exposes `AwsRum` global

### NPM Modules

-   `dist/es/` - ES modules
-   `dist/cjs/` - CommonJS modules
-   TypeScript declarations included

## Key Patterns

1. **Monkey Patching**: Plugins wrap native APIs (XMLHttpRequest, fetch, addEventListener)
2. **Event Schemas**: JSON schemas in `src/event-schemas/` generate TypeScript types
3. **Loader Scripts**: `src/loader/` contains minimal bootstrap code for different configs
4. **Test Structure**: `__tests__/` for unit, `__integ__/` for integration, `__smoke-test__/` for E2E
