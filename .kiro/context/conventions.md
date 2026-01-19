# Coding Conventions

## TypeScript Style

-   Strict mode enabled
-   Prefer interfaces over types for object shapes
-   Use `readonly` for immutable properties
-   Avoid `any` - use `unknown` and type guards

## Plugin Pattern

```typescript
export class MyPlugin implements Plugin {
    private enabled: boolean = false;

    constructor(private readonly config: Config) {}

    enable(): void {
        if (this.enabled) return;
        this.enabled = true;
        // Monkey patch here
    }

    disable(): void {
        if (!this.enabled) return;
        this.enabled = false;
        // Restore original functions
    }
}
```

## Event Recording

```typescript
// Always use EventBus for internal events
this.eventBus.dispatch(EVENT_TYPE, eventData);

// Use PluginContext.record() for user-facing events
this.context.record(EVENT_TYPE, eventData);
```

## Testing Conventions

-   Unit tests: `__tests__/` directories
-   Integration tests: `__integ__/` directories
-   Smoke tests: `__smoke-test__/` directories
-   Mock data: `src/test-utils/mock-data.ts`

## File Naming

-   PascalCase for classes: `EventCache.ts`
-   kebab-case for schemas: `http-event.json`
-   camelCase for utilities: `common-utils.ts`

## Error Handling

-   Use custom error classes from `src/errors/`
-   Log errors via `InternalLogger`
-   Never throw in monkey-patched code - catch and log
