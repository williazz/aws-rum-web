# Session Replay Design Document

## Background

### Observability Providers with Session Replay

Session replay is a widely adopted feature in modern observability platforms:

-   **Datadog**: Captures user interactions, DOM mutations, and network activity with privacy controls
-   **New Relic**: Records user sessions with masking capabilities for sensitive data
-   **LogRocket**: Provides session replay with Redux/Vuex state tracking
-   **FullStory**: Offers session replay with retroactive search and analytics
-   **Sentry**: Integrates session replay with error tracking for debugging context

Common capabilities across providers:

-   DOM snapshot and mutation recording
-   User interaction capture (clicks, scrolls, inputs)
-   Network request/response logging
-   Console log capture
-   Privacy controls (masking, blocking sensitive elements)
-   Configurable sampling rates
-   Compression and optimization for bandwidth

### rrweb Open Source Project

[rrweb](https://github.com/rrweb-io/rrweb) (record and replay the web) is an open-source library for recording and replaying user sessions on web applications.

**Core Concepts:**

-   **Snapshot**: Initial full DOM capture at recording start
-   **Incremental Snapshots**: Mutations, interactions, and changes recorded as events
-   **Event Types**: DOM mutations, mouse movements, clicks, scrolls, viewport changes, input changes
-   **Serialization**: Converts DOM to JSON-serializable format
-   **Replay**: Reconstructs the session from recorded events

**Key Features:**

-   Minimal performance impact (~1-2% overhead)
-   Privacy-first design with built-in masking
-   Cross-browser compatibility
-   Plugin architecture for extensibility
-   Compression support for reduced payload size

**Architecture:**

-   `rrweb-snapshot`: DOM serialization library
-   `rrweb`: Core recording and replay functionality
-   `rrweb-player`: UI component for playback

## rrweb Recording Options

### recordOptions Interface

```typescript
interface recordOptions {
    // Emit events in batches at specified interval (ms)
    emit?: (event: eventWithTime, isCheckout?: boolean) => void;

    // Checkout creates a new full snapshot at interval (ms)
    checkoutEveryNth?: number;
    checkoutEveryNms?: number;

    // Block specific elements from recording
    blockClass?: string | RegExp;
    blockSelector?: string;

    // Ignore specific elements (don't record mutations)
    ignoreClass?: string;

    // Mask text content
    maskTextClass?: string | RegExp;
    maskTextSelector?: string;
    maskAllInputs?: boolean;
    maskInputOptions?: {
        [key: string]: boolean; // e.g., { password: true, email: false }
    };
    maskInputFn?: (text: string) => string;
    maskTextFn?: (text: string) => string;

    // Slice mutations into smaller chunks
    slimDOMOptions?: {
        script?: boolean;
        comment?: boolean;
        headFavicon?: boolean;
        headWhitespace?: boolean;
        headMetaSocial?: boolean;
        headMetaRobots?: boolean;
        headMetaHttpEquiv?: boolean;
        headMetaAuthorship?: boolean;
        headMetaVerification?: boolean;
    };

    // Inline styles and images
    inlineStylesheet?: boolean;
    inlineImages?: boolean;

    // Record canvas content
    recordCanvas?: boolean;

    // Collect and record console logs
    collectFonts?: boolean;

    // Plugin hooks
    plugins?: Array<{
        name: string;
        observer?: (cb: Function) => listenerHandler;
        eventProcessor?: (event: eventWithTime) => eventWithTime;
    }>;

    // Sampling configuration
    mousemoveWait?: number; // Throttle mousemove events (ms)

    // Pack function for compression
    packFn?: (event: eventWithTime) => string;

    // Sampling strategies
    sampling?: {
        // Sample mouse interactions
        mousemove?: boolean | number;
        mouseInteraction?:
            | boolean
            | {
                  [key: string]: boolean | number;
              };
        // Sample scroll events
        scroll?: number;
        // Sample media (video/audio) interactions
        media?: number;
        // Sample input events
        input?: 'all' | 'last';
    };

    // Record cross-origin iframes
    recordCrossOriginIframes?: boolean;

    // Hooks for lifecycle events
    hooks?: {
        mutation?: (mutations: MutationRecord[]) => void;
        mousemove?: (positions: mousePosition[]) => void;
        mouseInteraction?: (event: MouseEvent) => void;
        scroll?: (event: Event) => void;
        viewportResize?: (data: viewportResizeDimension) => void;
        input?: (event: Event) => void;
        mediaInteraction?: (event: Event) => void;
        styleSheetRule?: (rule: CSSRule) => void;
        canvasMutation?: (event: CanvasEvent) => void;
        font?: (font: FontFaceDescriptors) => void;
    };
}
```

### Key Configuration Categories

**Privacy Controls:**

-   `blockClass`, `blockSelector`: Completely exclude elements
-   `maskTextClass`, `maskTextSelector`: Mask text content
-   `maskAllInputs`, `maskInputOptions`: Control input field masking

**Performance Optimization:**

-   `checkoutEveryNms`: Periodic full snapshots for recovery
-   `slimDOMOptions`: Reduce DOM payload size
-   `sampling`: Throttle high-frequency events
-   `packFn`: Custom compression

**Content Capture:**

-   `inlineStylesheet`, `inlineImages`: Embed resources
-   `recordCanvas`: Capture canvas content
-   `collectFonts`: Record custom fonts

## Proposed RUM Session Replay Event Schema

### Event Structure

```json
{
    "id": "string (UUID)",
    "type": "com.amazon.rum.session_replay_event",
    "timestamp": "number (Unix epoch ms)",
    "details": {
        "recordingId": "string (UUID for this user visit)",
        "sessionId": "string (RUM session ID)",
        "events": [
            {
                "type": "number (rrweb event type)",
                "data": "object (rrweb event data)",
                "timestamp": "number (Unix epoch ms)"
            }
        ],
        "metadata": {
            "recordingStartTime": "number (Unix epoch ms)",
            "recordingEndTime": "number (Unix epoch ms)",
            "userAgent": "string",
            "viewport": {
                "width": "number",
                "height": "number"
            },
            "url": "string (page URL)",
            "title": "string (page title)",
            "samplingRate": "number (0-1)",
            "compressionType": "string (none|gzip|lz4)"
        }
    }
}
```

### Event Batching Strategy

**Approach 1: Time-based batching**

-   Emit events every N seconds (e.g., 10s)
-   Pros: Predictable payload size, reduced network requests
-   Cons: Delayed visibility, potential data loss on page close

**Approach 2: Size-based batching**

-   Emit when batch reaches N KB (e.g., 100KB)
-   Pros: Efficient bandwidth usage
-   Cons: Unpredictable timing, complex size calculation

**Approach 3: Hybrid (Recommended)**

-   Emit every 10 seconds OR when batch reaches 100KB
-   Emit immediately on page unload
-   Pros: Balance between latency and efficiency
-   Cons: Slightly more complex implementation

### Recording ID Management

**Recording ID Lifecycle:**

1. Generate new UUID on page load
2. Persist in sessionStorage as `aws_rum_recording_id`
3. Reuse for same page session (SPA navigation)
4. Generate new ID on hard navigation or sessionStorage clear

**Benefits:**

-   Correlate all events within a single user visit
-   Distinguish between multiple visits in same RUM session
-   Enable visit-level replay in debugging UI

## Proposed rrweb Default Recording Options

```typescript
const defaultRecordOptions: recordOptions = {
    // Emit events every 10 seconds or 100KB
    checkoutEveryNms: 300000, // Full snapshot every 5 minutes

    // Privacy: Block sensitive elements
    blockClass: 'aws-rum-block',
    blockSelector: '[data-aws-rum-block]',

    // Privacy: Mask sensitive text
    maskTextClass: 'aws-rum-mask',
    maskTextSelector: '[data-aws-rum-mask]',
    maskAllInputs: true,
    maskInputOptions: {
        password: true,
        email: true,
        tel: true,
        text: false, // Allow non-sensitive text inputs
        textarea: false,
        select: false,
        radio: false,
        checkbox: false
    },

    // Performance: Slim DOM
    slimDOMOptions: {
        script: true,
        comment: true,
        headFavicon: true,
        headWhitespace: true,
        headMetaSocial: true,
        headMetaRobots: true,
        headMetaHttpEquiv: true,
        headMetaAuthorship: true,
        headMetaVerification: true
    },

    // Performance: Sampling
    sampling: {
        mousemove: 50, // Sample every 50ms
        mouseInteraction: true,
        scroll: 100, // Sample every 100ms
        media: 500,
        input: 'last' // Only record final input value
    },

    // Content capture
    inlineStylesheet: true,
    inlineImages: false, // Avoid large payloads
    recordCanvas: false, // Opt-in for canvas-heavy apps
    collectFonts: true,

    // Cross-origin iframes
    recordCrossOriginIframes: false, // Requires CORS setup

    // Compression
    packFn: undefined // Use default JSON serialization, add compression at transport layer
};
```

### Rationale

**Privacy Defaults:**

-   Mask all inputs by default (opt-out for non-sensitive)
-   Provide CSS class and data attribute hooks for blocking
-   Balance between utility and privacy compliance

**Performance Defaults:**

-   Aggressive DOM slimming to reduce payload
-   Throttle high-frequency events (mousemove, scroll)
-   Periodic full snapshots for recovery without excessive data

**Content Capture:**

-   Inline stylesheets for accurate replay
-   Skip images to reduce bandwidth (rely on original URLs)
-   Canvas recording opt-in due to performance impact

## Proposed AWS RUM Configuration

### Telemetries Configuration

```typescript
interface RumConfig {
    // ... existing config

    telemetries: Array<'errors' | 'performance' | 'http' | 'session_replay'>;

    sessionReplayConfig?: {
        // Enable/disable session replay
        enabled?: boolean;

        // Sampling rate (0-1)
        sampleRate?: number;

        // Custom recording ID generator
        recordingIdGenerator?: () => string;

        // rrweb recording options override
        recordOptions?: Partial<recordOptions>;

        // Event batching configuration
        batchConfig?: {
            maxBatchSize?: number; // KB
            maxBatchInterval?: number; // ms
            flushOnUnload?: boolean;
        };

        // Privacy overrides
        privacyConfig?: {
            maskAllText?: boolean;
            maskAllInputs?: boolean;
            blockSelectors?: string[];
            maskSelectors?: string[];
        };

        // Performance overrides
        performanceConfig?: {
            recordCanvas?: boolean;
            recordCrossOriginIframes?: boolean;
            mousemoveSampleRate?: number;
            scrollSampleRate?: number;
        };
    };
}
```

### Example Configuration

```javascript
const config = {
    sessionId: 'my-session-id',
    identityPoolId: 'us-west-2:xxx',
    endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
    telemetries: ['errors', 'performance', 'http', 'session_replay'],

    sessionReplayConfig: {
        enabled: true,
        sampleRate: 0.1, // Record 10% of sessions

        batchConfig: {
            maxBatchSize: 100, // 100KB
            maxBatchInterval: 10000, // 10 seconds
            flushOnUnload: true
        },

        privacyConfig: {
            maskAllInputs: true,
            blockSelectors: ['.sensitive-data', '[data-private]'],
            maskSelectors: ['.pii', '[data-mask]']
        },

        performanceConfig: {
            recordCanvas: false,
            mousemoveSampleRate: 50,
            scrollSampleRate: 100
        }
    }
};
```

## Proposed rrweb Internal Plugin Structure

### Plugin Architecture

```
src/plugins/event-plugins/SessionReplayPlugin.ts
  ├── Manages rrweb lifecycle
  ├── Handles event batching
  └── Integrates with RUM event dispatch

src/session-replay/
  ├── RecordingManager.ts       # rrweb recording lifecycle
  ├── EventBatcher.ts            # Batch and compress events
  ├── RecordingIdManager.ts      # Generate and persist recording IDs
  └── PrivacyManager.ts          # Apply privacy configurations
```

### SessionReplayPlugin Implementation

```typescript
export class SessionReplayPlugin implements Plugin {
    private readonly pluginId = 'session-replay';
    private enabled = false;
    private recordingManager: RecordingManager;
    private eventBatcher: EventBatcher;
    private recordingIdManager: RecordingIdManager;

    constructor(
        private config: SessionReplayConfig,
        private context: PluginContext
    ) {
        this.recordingIdManager = new RecordingIdManager(config);
        this.eventBatcher = new EventBatcher(
            config.batchConfig,
            this.flush.bind(this)
        );
        this.recordingManager = new RecordingManager(
            config.recordOptions,
            this.handleRrwebEvent.bind(this)
        );
    }

    enable(): void {
        if (this.enabled) return;

        // Check sampling
        if (!this.shouldRecord()) {
            return;
        }

        this.enabled = true;

        // Get or generate recording ID
        const recordingId = this.recordingIdManager.getRecordingId();

        // Start rrweb recording
        this.recordingManager.start(recordingId);

        // Flush on page unload
        window.addEventListener('beforeunload', this.handleUnload);
    }

    disable(): void {
        if (!this.enabled) return;

        this.enabled = false;
        this.recordingManager.stop();
        this.eventBatcher.flush();

        window.removeEventListener('beforeunload', this.handleUnload);
    }

    private shouldRecord(): boolean {
        return Math.random() < this.config.sampleRate;
    }

    private handleRrwebEvent(event: eventWithTime): void {
        this.eventBatcher.add(event);
    }

    private flush(events: eventWithTime[]): void {
        const recordingId = this.recordingIdManager.getRecordingId();
        const sessionId = this.context.getSession().sessionId;

        const rumEvent = {
            id: uuid(),
            type: 'com.amazon.rum.session_replay_event',
            timestamp: Date.now(),
            details: {
                recordingId,
                sessionId,
                events,
                metadata: {
                    recordingStartTime: events[0]?.timestamp,
                    recordingEndTime: events[events.length - 1]?.timestamp,
                    userAgent: navigator.userAgent,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    url: window.location.href,
                    title: document.title,
                    samplingRate: this.config.sampleRate,
                    compressionType: 'none'
                }
            }
        };

        this.context.record('session_replay_event', rumEvent);
    }

    private handleUnload = (): void => {
        if (this.config.batchConfig?.flushOnUnload) {
            this.eventBatcher.flush();
        }
    };

    getPluginId(): string {
        return this.pluginId;
    }
}
```

### RecordingManager

```typescript
export class RecordingManager {
    private stopRecording?: () => void;

    constructor(
        private recordOptions: recordOptions,
        private onEvent: (event: eventWithTime) => void
    ) {}

    start(recordingId: string): void {
        this.stopRecording = record({
            ...this.recordOptions,
            emit: (event, isCheckout) => {
                this.onEvent(event);
            }
        });
    }

    stop(): void {
        if (this.stopRecording) {
            this.stopRecording();
            this.stopRecording = undefined;
        }
    }
}
```

### EventBatcher

```typescript
export class EventBatcher {
    private events: eventWithTime[] = [];
    private timer?: number;
    private currentSize = 0;

    constructor(
        private config: BatchConfig,
        private onFlush: (events: eventWithTime[]) => void
    ) {
        this.scheduleFlush();
    }

    add(event: eventWithTime): void {
        this.events.push(event);
        this.currentSize += JSON.stringify(event).length;

        // Flush if size threshold reached
        if (this.currentSize >= this.config.maxBatchSize * 1024) {
            this.flush();
        }
    }

    flush(): void {
        if (this.events.length === 0) return;

        this.onFlush([...this.events]);
        this.events = [];
        this.currentSize = 0;

        this.scheduleFlush();
    }

    private scheduleFlush(): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = window.setTimeout(
            () => this.flush(),
            this.config.maxBatchInterval
        );
    }
}
```

### RecordingIdManager

```typescript
export class RecordingIdManager {
    private static readonly STORAGE_KEY = 'aws_rum_recording_id';

    constructor(private config: SessionReplayConfig) {}

    getRecordingId(): string {
        // Check for custom generator
        if (this.config.recordingIdGenerator) {
            return this.config.recordingIdGenerator();
        }

        // Try to retrieve from sessionStorage
        try {
            const stored = sessionStorage.getItem(
                RecordingIdManager.STORAGE_KEY
            );
            if (stored) {
                return stored;
            }
        } catch (e) {
            // sessionStorage not available
        }

        // Generate new ID
        const recordingId = uuid();

        // Persist to sessionStorage
        try {
            sessionStorage.setItem(RecordingIdManager.STORAGE_KEY, recordingId);
        } catch (e) {
            // Ignore storage errors
        }

        return recordingId;
    }

    clearRecordingId(): void {
        try {
            sessionStorage.removeItem(RecordingIdManager.STORAGE_KEY);
        } catch (e) {
            // Ignore
        }
    }
}
```

## Implementation Considerations

### Privacy and Compliance

1. **GDPR/CCPA Compliance:**

    - Provide opt-out mechanism
    - Document data collection in privacy policy
    - Implement data retention policies
    - Support data deletion requests

2. **PII Protection:**

    - Default to masking all inputs
    - Provide clear documentation on privacy controls
    - Consider server-side scrubbing as additional layer

3. **Security:**
    - Never record password fields
    - Block elements with sensitive data by default
    - Sanitize URLs containing tokens/secrets

### Performance Impact

1. **Recording Overhead:**

    - Target <2% CPU overhead
    - Monitor memory usage (target <10MB)
    - Benchmark on low-end devices

2. **Network Impact:**

    - Compress payloads (gzip at transport layer)
    - Implement adaptive sampling based on bandwidth
    - Respect user's data saver preferences

3. **Storage:**
    - Limit sessionStorage usage
    - Clear old recording IDs periodically

### Testing Strategy

1. **Unit Tests:**

    - Plugin lifecycle
    - Event batching logic
    - Recording ID management
    - Privacy controls

2. **Integration Tests:**

    - rrweb integration
    - Event dispatch to RUM backend
    - Cross-browser compatibility

3. **Performance Tests:**

    - CPU/memory profiling
    - Network payload size
    - Recording accuracy

4. **Privacy Tests:**
    - Verify masking behavior
    - Test blocking selectors
    - Validate no PII leakage

## Open Questions

1. Should we support custom compression algorithms (e.g., LZ4)?
2. How to handle recording across subdomain navigation?
3. Should we provide a mechanism to pause/resume recording?
4. How to handle very long sessions (>1 hour)?
5. Should we support recording in web workers?
6. How to handle recording in embedded contexts (iframes, web components)?

## References

-   [rrweb Documentation](https://github.com/rrweb-io/rrweb)
-   [rrweb Guide](https://www.rrweb.io/docs/guide)
-   [Session Replay Best Practices](https://www.datadoghq.com/blog/session-replay-best-practices/)
