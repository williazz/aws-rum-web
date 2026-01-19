# Plugin System Deep Dive

## Plugin Lifecycle

All plugins implement the `Plugin` interface:

```typescript
interface Plugin {
    enable(): void; // Start collecting events
    disable(): void; // Stop collecting events
    getPluginId(): string;
}
```

## Plugin Types

### Event Plugins (`src/plugins/event-plugins/`)

Collect telemetry by monkey-patching browser APIs:

-   **NavigationPlugin** - Page load timing via PerformanceNavigationTiming
-   **ResourcePlugin** - Resource timing (images, scripts, CSS)
-   **JsErrorPlugin** - Uncaught errors and promise rejections
-   **XhrPlugin** - XMLHttpRequest monitoring
-   **FetchPlugin** - Fetch API monitoring
-   **WebVitalsPlugin** - Core Web Vitals (LCP, FID, CLS, INP)
-   **DomEventPlugin** - User interactions (click, scroll, etc.)
-   **PageViewPlugin** - SPA navigation tracking

### Internal Plugins

-   **InternalPlugin** - Base class for internal functionality

## Monkey Patching Pattern

Safe monkey patching using `shimmer` library:

```typescript
import { wrap } from 'shimmer';

export class MyPlugin implements Plugin {
    private originalFunction: Function;

    enable(): void {
        // Save original
        this.originalFunction = window.someAPI;

        // Wrap with instrumentation
        wrap(window, 'someAPI', (original) => {
            return function wrapped(...args) {
                // Pre-processing
                const result = original.apply(this, args);
                // Post-processing - record event
                return result;
            };
        });
    }

    disable(): void {
        // Restore original
        window.someAPI = this.originalFunction;
    }
}
```

## Plugin Context

Plugins receive a `PluginContext` with:

-   `record(type, data)` - Record an event
-   `recordPageView(pageId)` - Record page view
-   `getSession()` - Get current session
-   `config` - User configuration

## Plugin Registration

In `Orchestration.ts`:

```typescript
private initializePlugins() {
    if (this.config.telemetries.includes('errors')) {
        this.addPlugin(new JsErrorPlugin(this.pluginContext));
    }
    // ... more plugins
}
```

## Testing Plugins

### Unit Tests

Mock browser APIs and verify event recording:

```typescript
it('records error events', () => {
    const record = jest.fn();
    const plugin = new JsErrorPlugin({ record });
    plugin.enable();

    window.dispatchEvent(new ErrorEvent('error', { message: 'test' }));

    expect(record).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
            message: 'test'
        })
    );
});
```

### Integration Tests

Use real browser in `app/*.html` test pages:

-   Load RUM client with specific config
-   Trigger the event (error, navigation, etc.)
-   Verify event was recorded

### Nightwatch vs Playwright

-   **Playwright**: Most integration tests
-   **Nightwatch**: Tests that conflict with TestCafe's monkey patching (PageViewPlugin, VirtualPageLoadTimer)

## Common Patterns

### Debouncing

```typescript
private debounceTimer: number;

private debounce(fn: Function, delay: number) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(fn, delay);
}
```

### Feature Detection

```typescript
enable(): void {
    if (!window.PerformanceObserver) {
        // Feature not supported
        return;
    }
    // Proceed with instrumentation
}
```

### Error Handling

```typescript
wrap(window, 'fetch', (original) => {
    return function wrapped(...args) {
        try {
            const result = original.apply(this, args);
            // Record event
            return result;
        } catch (e) {
            // Log but don't throw - never break user's app
            console.warn('RUM plugin error:', e);
            return original.apply(this, args);
        }
    };
});
```
