import { Session, SessionManager } from '../sessions/SessionManager';
import { v4 } from 'uuid';
import { MetaData } from '../events/meta-data';
import { Config } from '../orchestration/Orchestration';
import { PageAttributes, PageManager } from '../sessions/PageManager';
import {
    AppMonitorDetails,
    UserDetails,
    RumEvent
} from '../dispatch/dataplane';
import EventBus, { Topic } from '../event-bus/EventBus';

const webClientVersion = '1.14.0';

/**
 * A cache which stores events generated by telemetry plugins.
 *
 * The event cache stores meta data and events until they are dispatched to the
 * data plane. The event cache removes the oldest event once the cache is full
 * and a new event is added.
 */
export class EventCache {
    private appMonitorDetails: AppMonitorDetails;
    private config: Config;

    private events: RumEvent[] = [];

    private sessionManager: SessionManager;
    private pageManager: PageManager;

    private enabled: boolean;
    private installationMethod: string;

    /**
     * @param applicationDetails Application identity and version.
     * @param batchLimit The maximum number of events that will be returned in a batch.
     * @param eventCacheSize  The maximum number of events the cache can contain before dropping events.
     * @param sessionManager  The sessionManager returns user id, session id and handles session timeout.
     * @param pageManager The pageManager returns page id.
     */
    constructor(
        applicationDetails: AppMonitorDetails,
        config: Config,
        private eventBus = new EventBus<Topic>()
    ) {
        this.appMonitorDetails = applicationDetails;
        this.config = config;
        this.enabled = true;
        this.pageManager = new PageManager(config, this.recordEvent);
        this.sessionManager = new SessionManager(
            applicationDetails,
            config,
            this.recordSessionInitEvent,
            this.pageManager
        );
        this.installationMethod = config.client;
    }

    /**
     * The event cache will record new events or new meta data.
     */
    public enable(): void {
        this.enabled = true;
    }

    /**
     * The event cache will not record new events or new meta data. Events and
     * meta data which are already in the cache will still be accessible.
     */
    public disable(): void {
        this.enabled = false;
    }

    /**
     * Update the current page interaction for the session.
     */
    public recordPageView = (payload: string | PageAttributes) => {
        if (this.isCurrentUrlAllowed()) {
            this.pageManager.recordPageView(payload);
        }
    };

    /**
     * Add an event to the cache and reset the session timer.
     *
     * If the session is being recorded, the event will be recorded.
     * If the session is not being recorded, the event will not be recorded.
     *
     * @param type The event schema.
     */
    public recordEvent = (type: string, eventData: object) => {
        if (!this.enabled) {
            return;
        }

        if (this.isCurrentUrlAllowed()) {
            const session: Session = this.sessionManager.getSession();
            this.sessionManager.incrementSessionEventCount();

            if (this.canRecord(session)) {
                this.addRecordToCache(type, eventData);
            }
        }
    };

    /**
     * Returns the current session (1) if a session exists and (2) if the
     * current URL is allowed. Returns undefined otherwise.
     */
    public getSession = (): Session | undefined => {
        if (this.isCurrentUrlAllowed()) {
            return this.sessionManager.getSession();
        }
        return undefined;
    };

    /**
     * Returns true if there are one or more events in the cache.
     */
    public hasEvents(): boolean {
        return this.events.length !== 0;
    }

    /**
     * Removes and returns the next batch of events.
     */
    public getEventBatch(): RumEvent[] {
        let rumEvents: RumEvent[] = [];

        if (this.events.length === 0) {
            return rumEvents;
        }

        if (this.events.length <= this.config.batchLimit) {
            // Return all events.
            rumEvents = this.events;
            this.events = [];
        } else {
            // Dispatch the front of the array and retain the back of the array.
            rumEvents = this.events.splice(0, this.config.batchLimit);
        }

        return rumEvents;
    }

    /**
     * Returns an object containing the AppMonitor ID and application version.
     */
    public getAppMonitorDetails(): AppMonitorDetails {
        return this.appMonitorDetails;
    }

    /**
     * Returns an object containing the session ID and user ID.
     */
    public getUserDetails(): UserDetails {
        return {
            userId: this.sessionManager.getUserId(),
            sessionId: this.sessionManager.getSession().sessionId
        };
    }

    /**
     * Set custom session attributes to add them to all event metadata.
     *
     * @param payload object containing custom attribute data in the form of key, value pairs
     */
    public addSessionAttributes(sessionAttributes: {
        [k: string]: string | number | boolean;
    }): void {
        this.sessionManager.addSessionAttributes(sessionAttributes);
    }

    /**
     * Add a session start event to the cache.
     */
    private recordSessionInitEvent = (
        session: Session,
        type: string,
        eventData: object
    ) => {
        if (!this.enabled) {
            return;
        }

        this.sessionManager.incrementSessionEventCount();

        if (this.canRecord(session)) {
            this.addRecordToCache(type, eventData);
        }
    };

    private canRecord = (session: Session): boolean => {
        return (
            session.record &&
            (session.eventCount <= this.config.sessionEventLimit ||
                this.config.sessionEventLimit <= 0)
        );
    };

    /**
     * Add an event to the cache.
     *
     * @param type The event schema.
     */
    private addRecordToCache = (type: string, eventData: object) => {
        if (!this.enabled) {
            return;
        }

        if (this.events.length === this.config.eventCacheSize) {
            // Make room in the cache by dropping the oldest event.
            this.events.shift();
        }

        // The data plane service model (i.e., LogEvents) does not adhere to the
        // RUM agent data model, where sessions and pages are first class
        // objects with their own attribute sets. Instead, we store session
        // attributes and page attributes together as 'meta data'.
        const metaData: MetaData = {
            ...this.sessionManager.getAttributes(),
            ...this.pageManager.getAttributes(),
            version: '1.0.0',
            'aws:client': this.installationMethod,
            'aws:clientVersion': webClientVersion
        };

        const partialEvent = {
            id: v4(),
            timestamp: new Date(),
            type
        };
        this.eventBus.dispatch(Topic.EVENTS, {
            ...partialEvent,
            details: eventData,
            metadata: metaData
        });
        this.events.push({
            ...partialEvent,
            details: JSON.stringify(eventData),
            metadata: JSON.stringify(metaData)
        });
    };

    /**
     * Returns {@code true} if the current url matches one of the allowedPages
     * and does not match any of the deniedPages; returns {@code false}
     * otherwise.
     */
    private isCurrentUrlAllowed() {
        const location = document.location.toString();
        const exclude = this.config.pagesToExclude.some((re) =>
            re.test(location)
        );

        const include = this.config.pagesToInclude.some((re) =>
            re.test(location)
        );

        return include && !exclude;
    }
}
