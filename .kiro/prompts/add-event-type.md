# Add New Event Type

I need to add a new event type to the CloudWatch RUM web client.

## Event Details

-   Event name: [EVENT_NAME]
-   Event type: [performance|error|custom|interaction]
-   Data to capture: [LIST_FIELDS]

## Steps Needed

1. Create JSON schema in `src/event-schemas/[event-name].json`
2. Generate TypeScript types: `npm run build:schemas`
3. Create event class in `src/events/[event-name]-event.ts`
4. Create plugin in `src/plugins/event-plugins/[EventName]Plugin.ts`
5. Register plugin in `src/orchestration/Orchestration.ts`
6. Add tests in `src/plugins/event-plugins/__tests__/[EventName]Plugin.test.ts`
7. Create integration test page in `app/[event_name].html`
8. Add integration test in `src/__integ__/[eventName].spec.ts`

Please help me implement this following the existing patterns in the codebase.
