import { InternalPlugin } from '../InternalPlugin';
import { RRWEB_EVENT_TYPE } from '../utils/constant';
import { InternalLogger } from '../../utils/InternalLogger';
import { record } from 'rrweb';
import type { recordOptions } from 'rrweb/typings/types';

export const RRWEB_PLUGIN_ID = 'rrweb';

export type RRWebPluginConfig = {
    sampling: number; // 0-1, probability of recording a session
    batchSize: number; // Number of events to batch before sending
    flushInterval: number; // MS between automatic flushes
    maxRecordingDuration: number; // Max recording duration in MS
    recordOptions?: recordOptions<any>;
};

export const RRWEB_CONFIG = {
    PROD: {
        sampling: 1.0,
        batchSize: 50,
        flushInterval: 10000,
        maxRecordingDuration: 300000,
        recordOptions: {
            // Privacy
            maskAllInputs: true,
            maskAllText: true,
            maskInputOptions: { password: true },

            // DOM Optimization
            slimDOMOptions: 'all',

            // Assets
            inlineStylesheet: true,
            inlineImages: false,
            collectFonts: true,

            // Cross-origin
            recordCrossOriginIframes: false
        }
    } as RRWebPluginConfig
};

const defaultConfig: RRWebPluginConfig = RRWEB_CONFIG.PROD;

export class RRWebPlugin extends InternalPlugin {
    private config: RRWebPluginConfig;
    private recordingEvents: any[] = [];
    private recordingId: string | null = null;
    private sessionId: string | null = null;
    private isRecording = false;
    private recordingStartTime: number | null = null;
    private flushTimer: number | null = null;
    private stopRecording: (() => void) | null = null;
    enabled = false;

    constructor(config?: Partial<RRWebPluginConfig>) {
        super(RRWEB_PLUGIN_ID);
        this.config = { ...defaultConfig, ...config };

        InternalLogger.info('RRWebPlugin initialized', {
            sampling: this.config.sampling,
            batchSize: this.config.batchSize,
            flushInterval: this.config.flushInterval,
            maxRecordingDuration: this.config.maxRecordingDuration
        });
    }

    enable(): void {
        if (this.enabled) {
            InternalLogger.info('RRWebPlugin already enabled');
            return;
        }

        // Check if the current session is being recorded
        const session = this.context?.getSession();
        if (!session || !session.record) {
            InternalLogger.warn(
                'RRWebPlugin skipping - session not being recorded',
                {
                    hasSession: !!session,
                    sessionRecord: session?.record
                }
            );
            return; // Don't record if session is not being recorded
        }

        // Check if we should record this session (session replay sampling)
        const randomValue = Math.random();
        if (randomValue > this.config.sampling) {
            InternalLogger.warn(
                'RRWebPlugin skipping - session replay sampling',
                {
                    randomValue,
                    samplingRate: this.config.sampling
                }
            );
            return; // Skip recording for this session
        }

        this.enabled = true;
        InternalLogger.info('RRWebPlugin enabled - starting recording');
        this.startRecording();
    }

    disable(): void {
        if (!this.enabled) {
            InternalLogger.info('RRWebPlugin already disabled');
            return;
        }

        InternalLogger.info('RRWebPlugin disabled - stopping recording');
        this.enabled = false;
        this.stopCurrentRecording();
    }

    record(data: any): void {
        // Manual recording trigger
        InternalLogger.info('RRWebPlugin record called', data);
        if (data?.action === 'start') {
            InternalLogger.info('RRWebPlugin manual start recording');
            this.startRecording();
        } else if (data?.action === 'stop') {
            InternalLogger.info('RRWebPlugin manual stop recording');
            this.stopCurrentRecording();
        }
    }

    protected onload(): void {
        // this.enable();
    }

    private startRecording(): void {
        const session = this.context?.getSession();
        this.recordingId = session?.sessionId || null;
        this.sessionId = session?.sessionId || null;
        this.recordingStartTime = Date.now();
        this.recordingEvents = [];
        this.isRecording = true;

        InternalLogger.info('RRWebPlugin starting rrweb recording', {
            recordingId: this.recordingId,
            sessionId: this.sessionId,
            startTime: this.recordingStartTime
        });

        // Start recording with rrweb
        const stopFn = record({
            ...this.config.recordOptions,
            emit: this.handleRRWebEvent.bind(this)
        });

        if (stopFn) {
            this.stopRecording = stopFn as () => void;
            InternalLogger.info(
                'RRWebPlugin rrweb recording initialized successfully'
            );
        } else {
            InternalLogger.warn(
                'RRWebPlugin failed to initialize rrweb recording'
            );
        }

        // Set up periodic flush
        this.flushTimer = window.setInterval(() => {
            this.flushEvents();
        }, this.config.flushInterval);

        // Set up max duration timeout
        setTimeout(() => {
            if (this.isRecording) {
                InternalLogger.info(
                    'RRWebPlugin stopping recording due to max duration timeout'
                );
                this.stopCurrentRecording();
            }
        }, this.config.maxRecordingDuration);
    }

    private stopCurrentRecording(): void {
        if (!this.isRecording) {
            InternalLogger.info(
                'RRWebPlugin stopCurrentRecording called but not recording'
            );
            return;
        }

        InternalLogger.info('RRWebPlugin stopping current recording');
        this.isRecording = false;

        // Stop recording
        if (this.stopRecording) {
            this.stopRecording();
            this.stopRecording = null;
            InternalLogger.info('RRWebPlugin rrweb recording stopped');
        }

        // Clear flush timer
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
            InternalLogger.info('RRWebPlugin flush timer cleared');
        }

        // Flush any remaining events
        this.flushEvents(true);
    }

    private handleRRWebEvent(event: any): void {
        if (!this.isRecording) {
            return;
        }

        this.recordingEvents.push(event);

        // Check if we need to flush due to batch size
        if (this.recordingEvents.length >= this.config.batchSize) {
            InternalLogger.info(
                'RRWebPlugin flushing events due to batch size',
                {
                    eventCount: this.recordingEvents.length,
                    batchSize: this.config.batchSize
                }
            );
            this.flushEvents();
        }
    }

    private async flushEvents(isFinal = false): Promise<void> {
        if (this.recordingEvents.length === 0) {
            InternalLogger.info(
                'RRWebPlugin flushEvents called but no events to flush'
            );
            return;
        }

        InternalLogger.info('RRWebPlugin flushing events', {
            eventCount: this.recordingEvents.length,
            isFinal,
            recordingId: this.recordingId
        });

        const events = [...this.recordingEvents];
        const uncompressedSize = JSON.stringify(events).length;

        // Compress events using web worker
        let compressedEvents = events;
        let compressedSize = uncompressedSize;

        try {
            const compressed = await this.compressEvents(events);
            compressedEvents = compressed;
            compressedSize = JSON.stringify(compressed).length;

            InternalLogger.info('RRWebPlugin compression complete', {
                uncompressedSize,
                compressedSize,
                compressionRatio:
                    ((1 - compressedSize / uncompressedSize) * 100).toFixed(1) +
                    '%'
            });
        } catch (error) {
            InternalLogger.warn(
                'RRWebPlugin compression failed, sending uncompressed',
                {
                    error:
                        error instanceof Error ? error.message : 'Unknown error'
                }
            );
        }

        const eventData = {
            events: compressedEvents,
            eventCount: events.length,
            uncompressedSize,
            compressedSize
        };

        // Send to RUM with event type com.amazon.rum.rrweb
        if (this.context?.record) {
            this.context.record(RRWEB_EVENT_TYPE, eventData);
            InternalLogger.info('RRWebPlugin events sent to RUM', {
                eventType: RRWEB_EVENT_TYPE,
                eventCount: this.recordingEvents.length
            });
        } else {
            InternalLogger.warn(
                'RRWebPlugin cannot send events - no record context available'
            );
        }

        // Clear events after sending
        this.recordingEvents = [];
    }

    /**
     * Compress events using @rrweb/packer
     * Note: Compression happens on main thread to avoid worker import issues
     * Impact is minimal (~50-100ms) and non-blocking due to async nature
     */
    private async compressEvents(events: any[]): Promise<any> {
        try {
            // Dynamic import to avoid bundling issues
            const { pack } = await import('@rrweb/packer');
            return pack(events as any);
        } catch (error) {
            throw new Error(
                error instanceof Error ? error.message : 'Compression failed'
            );
        }
    }

    // private generateId(): string {
    //     // Simple ID generator
    //     return (
    //         Math.random().toString(36).substring(2) + Date.now().toString(36)
    //     );
    // }
}
