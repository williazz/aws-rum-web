# Modify Configuration

I need to add or modify a configuration option for the RUM web client.

## Configuration Change

-   Config key: [CONFIG_KEY]
-   Type: [string|number|boolean|object|array]
-   Default value: [DEFAULT_VALUE]
-   Purpose: [DESCRIPTION]

## Files to Update

1. Type definition in `src/orchestration/Orchestration.ts` (Config interface)
2. Default value in `src/orchestration/Orchestration.ts` (defaultConfig)
3. Validation logic if needed
4. Documentation in `docs/configuration.md`
5. Example usage in relevant loader script (`src/loader/`)

## Backward Compatibility

-   Is this a breaking change? [yes|no]
-   Migration path for existing users: [DESCRIPTION]

Please help me implement this configuration change following the existing patterns.
