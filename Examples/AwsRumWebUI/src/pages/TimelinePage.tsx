import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Modal from '@cloudscape-design/components/modal';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import Button from '@cloudscape-design/components/button';
import Tabs from '@cloudscape-design/components/tabs';
import FormField from '@cloudscape-design/components/form-field';
import Select from '@cloudscape-design/components/select';
import { RrwebPlayer } from '../components/RrwebPlayer';
import './TimelinePage.css';

interface RawEvent {
    sessionId?: string;
    requestTimestamp: string;
    event: {
        id: string;
        type: string;
        timestamp: number;
        details: unknown;
    };
}

interface RecordingMetadata {
    recordingId: string;
    timestamp: number;
    eventCount: number;
}

interface SessionReplayData {
    sessionId: string;
    recordingId: string;
    timestamp: number;
    events: any[];
    metadata: any;
}

interface RawRequest {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
}

interface UserVisit {
    recordingId: string;
    events: RawEvent[];
    firstSeen: number;
    lastSeen: number;
}

interface RumSession {
    sessionId: string;
    visits: UserVisit[];
    events: RawEvent[];
    firstSeen: number;
    lastSeen: number;
}

function TimelinePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [rumSessions, setRumSessions] = useState<RumSession[]>([]);
    const [selectedRumSessionId, setSelectedRumSessionId] = useState<
        string | null
    >(null);
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<RawEvent | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [jsonView, setJsonView] = useState<'parsed' | 'raw'>('parsed');
    const [activeTab, setActiveTab] = useState(
        searchParams.get('tab') || 'session-replay'
    );
    const [requests, setRequests] = useState<RawRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RawRequest | null>(
        null
    );
    const [sessionReplays, setSessionReplays] = useState<SessionReplayData[]>(
        []
    );
    const [recordingIds, setRecordingIds] = useState<RecordingMetadata[]>([]);
    const [selectedRecordingId, setSelectedRecordingId] = useState<
        string | null
    >(null);
    const [selectedReplayEvents, setSelectedReplayEvents] = useState<any[]>([]);
    const [selectedReplay, setSelectedReplay] =
        useState<SessionReplayData | null>(null);
    const [loadingRecordings, setLoadingRecordings] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const savedTheme = localStorage.getItem('themeMode') || 'auto';
    const [themeMode, setThemeMode] = useState<{
        label: string;
        value: string;
    }>({
        label: savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1),
        value: savedTheme
    });

    useEffect(() => {
        const mode = themeMode.value as Mode;
        applyMode(mode);
        localStorage.setItem('themeMode', themeMode.value);
    }, [themeMode]);

    const fetchEvents = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/events');
            const data: RawEvent[] = await response.json();

            // Group by RUM session ID
            const rumSessionMap = new Map<string, RawEvent[]>();
            data.forEach((event) => {
                const sid = event.sessionId || 'unknown';
                if (!rumSessionMap.has(sid)) rumSessionMap.set(sid, []);
                rumSessionMap.get(sid)!.push(event);
            });

            // For each RUM session, group events by recording ID (user visits)
            const rumSessionList: RumSession[] = Array.from(
                rumSessionMap.entries()
            ).map(([sessionId, events]) => {
                // Group by recording ID to identify individual visits
                const visitMap = new Map<string, RawEvent[]>();
                events.forEach((event) => {
                    // Extract recording ID from rrweb events
                    let recordingId = 'default';
                    if (event.event.type === 'com.amazon.rum.rrweb') {
                        try {
                            const details =
                                typeof event.event.details === 'string'
                                    ? JSON.parse(event.event.details)
                                    : event.event.details;
                            recordingId =
                                (details as any)?.recordingId || event.event.id;
                        } catch {
                            recordingId = event.event.id;
                        }
                    }
                    if (!visitMap.has(recordingId))
                        visitMap.set(recordingId, []);
                    visitMap.get(recordingId)!.push(event);
                });

                // Convert visits
                const visits: UserVisit[] = Array.from(visitMap.entries()).map(
                    ([recordingId, visitEvents]) => {
                        const timestamps = visitEvents.map((e) => {
                            const ts = e.event.timestamp;
                            return ts < 946684800000 ? ts * 1000 : ts;
                        });
                        return {
                            recordingId,
                            events: visitEvents.sort((a, b) => {
                                const aTs =
                                    a.event.timestamp < 946684800000
                                        ? a.event.timestamp * 1000
                                        : a.event.timestamp;
                                const bTs =
                                    b.event.timestamp < 946684800000
                                        ? b.event.timestamp * 1000
                                        : b.event.timestamp;
                                return aTs - bTs;
                            }),
                            firstSeen: Math.min(...timestamps),
                            lastSeen: Math.max(...timestamps)
                        };
                    }
                );

                // Sort visits by most recent
                visits.sort((a, b) => b.lastSeen - a.lastSeen);

                const allTimestamps = events.map((e) => {
                    const ts = e.event.timestamp;
                    return ts < 946684800000 ? ts * 1000 : ts;
                });

                return {
                    sessionId,
                    visits,
                    events: events.sort((a, b) => {
                        const aTs =
                            a.event.timestamp < 946684800000
                                ? a.event.timestamp * 1000
                                : a.event.timestamp;
                        const bTs =
                            b.event.timestamp < 946684800000
                                ? b.event.timestamp * 1000
                                : b.event.timestamp;
                        return aTs - bTs;
                    }),
                    firstSeen: Math.min(...allTimestamps),
                    lastSeen: Math.max(...allTimestamps)
                };
            });

            // Sort by most recent
            rumSessionList.sort((a, b) => b.lastSeen - a.lastSeen);
            setRumSessions(rumSessionList);

            // Auto-select most recent
            if (rumSessionList.length > 0 && !selectedRumSessionId) {
                setSelectedRumSessionId(rumSessionList[0].sessionId);
                if (rumSessionList[0].visits.length > 0) {
                    setSelectedVisitId(rumSessionList[0].visits[0].recordingId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/requests');
            const data: RawRequest[] = await response.json();
            setRequests(
                data.sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
            );
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        }
    };

    const fetchRecordingIds = async () => {
        try {
            setLoadingRecordings(true);
            const startTime = Date.now();
            const response = await fetch(
                'http://localhost:3000/api/session-replay/ids'
            );
            const data: RecordingMetadata[] = await response.json();

            const elapsed = Date.now() - startTime;
            const minDelay = 500;
            if (elapsed < minDelay) {
                await new Promise((resolve) =>
                    setTimeout(resolve, minDelay - elapsed)
                );
            }

            setRecordingIds(data);

            // Auto-select first recording
            if (data.length > 0 && !selectedRecordingId) {
                setSelectedRecordingId(data[0].recordingId);
            }
        } catch (error) {
            console.error('Failed to fetch recording IDs:', error);
        } finally {
            setLoadingRecordings(false);
        }
    };

    const fetchRecordingEvents = async (recordingId: string) => {
        try {
            setLoadingEvents(true);
            const startTime = Date.now();
            const response = await fetch(
                `http://localhost:3000/api/session-replay/${recordingId}`
            );
            const events: any[] = await response.json();

            if (initialLoad) {
                const elapsed = Date.now() - startTime;
                const minDelay = 500;
                if (elapsed < minDelay) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, minDelay - elapsed)
                    );
                }
                setInitialLoad(false);
            }

            setSelectedReplayEvents(events);
        } catch (error) {
            console.error('Failed to fetch recording events:', error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const fetchSessionReplays = async () => {
        try {
            const response = await fetch(
                'http://localhost:3000/api/session-replay'
            );
            const data: SessionReplayData[] = await response.json();
            const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
            setSessionReplays(sorted);

            // Auto-select most recent if none selected
            if (sorted.length > 0 && !selectedReplay) {
                setSelectedReplay(sorted[0]);
            }
        } catch (error) {
            console.error('Failed to fetch session replays:', error);
        }
    };

    useEffect(() => {
        if (selectedRecordingId) {
            fetchRecordingEvents(selectedRecordingId);
        }
    }, [selectedRecordingId]);

    useEffect(() => {
        fetchEvents();
        fetchRequests();
        fetchRecordingIds();
    }, []);

    const selectedRumSession = rumSessions.find(
        (s) => s.sessionId === selectedRumSessionId
    );
    const selectedVisit = selectedRumSession?.visits.find(
        (v) => v.recordingId === selectedVisitId
    );

    const recursiveParse = (obj: any): any => {
        if (typeof obj === 'string') {
            try {
                const parsed = JSON.parse(obj);
                return recursiveParse(parsed);
            } catch {
                return obj;
            }
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => recursiveParse(item));
        }
        if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const key in obj) {
                result[key] = recursiveParse(obj[key]);
            }
            return result;
        }
        return obj;
    };

    const getEventColor = (type: string) => {
        if (type.includes('error')) return '#d13212';
        if (type.includes('navigation') || type.includes('page_view'))
            return '#0972d3';
        if (type.includes('http')) return '#037f0c';
        if (type.includes('performance')) return '#8b6ccf';
        return '#5f6b7a';
    };

    const getEventLabel = (type: string) => {
        return type.replace('com.amazon.rum.', '').replace(/_/g, ' ');
    };

    return (
        <div className="page-container">
            <div className="navbar">
                <Tabs
                    activeTabId={activeTab}
                    onChange={({ detail }) => {
                        setActiveTab(detail.activeTabId);
                        setSearchParams({ tab: detail.activeTabId });
                    }}
                    tabs={[
                        { id: 'session-replay', label: 'Session Replay' },
                        { id: 'sessions', label: 'Sessions (WIP)' },
                        { id: 'payloads', label: 'Payloads' },
                        { id: 'settings', label: 'Settings' }
                    ]}
                />
            </div>

            {activeTab === 'session-replay' && (
                <div className="timeline-layout">
                    <div className="sessions-sidebar">
                        <Container
                            header={<Header variant="h2">Recordings</Header>}
                        >
                            {loadingRecordings ? (
                                <div className="session-list">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="skeleton-item">
                                            <div className="skeleton skeleton-line title" />
                                            <div className="skeleton skeleton-line short" />
                                            <div
                                                className="skeleton skeleton-line short"
                                                style={{ width: '40%' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : recordingIds.length === 0 ? (
                                <Box padding={{ vertical: 'l' }}>
                                    <Box
                                        variant="strong"
                                        fontSize="heading-m"
                                        color="text-body-secondary"
                                    >
                                        No recordings yet
                                    </Box>
                                    <Box
                                        variant="p"
                                        color="text-body-secondary"
                                        padding={{ top: 's' }}
                                    >
                                        Session recordings will appear here once
                                        captured
                                    </Box>
                                </Box>
                            ) : (
                                <div className="session-list">
                                    {recordingIds.map((recording) => {
                                        return (
                                            <div
                                                key={recording.recordingId}
                                                className={`session-item ${
                                                    selectedRecordingId ===
                                                    recording.recordingId
                                                        ? 'selected'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    setSelectedRecordingId(
                                                        recording.recordingId
                                                    )
                                                }
                                            >
                                                <Box variant="strong">
                                                    {recording.recordingId.slice(
                                                        0,
                                                        16
                                                    )}
                                                    ...
                                                </Box>
                                                <div
                                                    style={{ marginTop: '4px' }}
                                                >
                                                    <Box
                                                        variant="small"
                                                        color="text-body-secondary"
                                                    >
                                                        {recording.eventCount}{' '}
                                                        events
                                                    </Box>
                                                    <Box
                                                        variant="small"
                                                        color="text-body-secondary"
                                                    >
                                                        {new Date(
                                                            recording.timestamp
                                                        ).toLocaleString()}
                                                    </Box>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Container>
                    </div>

                    <div className="replay-main">
                        {loadingRecordings ? (
                            <Container
                                header={
                                    <Header variant="h2">
                                        Session Replay Player
                                    </Header>
                                }
                            >
                                <div className="skeleton-player">
                                    <div className="skeleton-player-screen">
                                        <div className="skeleton skeleton-player-screen-inner" />
                                    </div>
                                    <div className="skeleton-player-controls">
                                        <div className="skeleton-player-timeline">
                                            <div className="skeleton skeleton-player-time" />
                                            <div className="skeleton skeleton-player-progress" />
                                            <div className="skeleton skeleton-player-time" />
                                        </div>
                                        <div className="skeleton-player-buttons">
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                        </div>
                                    </div>
                                </div>
                            </Container>
                        ) : recordingIds.length === 0 ? (
                            <Container
                                header={
                                    <Header variant="h2">
                                        Session Replay Player
                                    </Header>
                                }
                            >
                                <div className="skeleton-player">
                                    <div className="skeleton-player-screen">
                                        <Box
                                            textAlign="center"
                                            padding={{ vertical: 'xxl' }}
                                        >
                                            <Box
                                                variant="strong"
                                                fontSize="heading-m"
                                                color="text-body-secondary"
                                            >
                                                No replay to display
                                            </Box>
                                            <Box
                                                variant="p"
                                                color="text-body-secondary"
                                                padding={{ top: 's' }}
                                            >
                                                Select a recording to view the
                                                session replay
                                            </Box>
                                        </Box>
                                    </div>
                                    <div className="skeleton-player-controls">
                                        <div className="skeleton-player-timeline">
                                            <div className="skeleton skeleton-player-time" />
                                            <div className="skeleton skeleton-player-progress" />
                                            <div className="skeleton skeleton-player-time" />
                                        </div>
                                        <div className="skeleton-player-buttons">
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                        </div>
                                    </div>
                                </div>
                            </Container>
                        ) : !selectedRecordingId ||
                          selectedReplayEvents.length === 0 ? (
                            <Container
                                header={
                                    <Header variant="h2">
                                        Session Replay Player
                                    </Header>
                                }
                            >
                                <div className="skeleton-player">
                                    <div className="skeleton-player-screen">
                                        <div className="skeleton skeleton-player-screen-inner" />
                                    </div>
                                    <div className="skeleton-player-controls">
                                        <div className="skeleton-player-timeline">
                                            <div className="skeleton skeleton-player-time" />
                                            <div className="skeleton skeleton-player-progress" />
                                            <div className="skeleton skeleton-player-time" />
                                        </div>
                                        <div className="skeleton-player-buttons">
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                            <div className="skeleton skeleton-player-button" />
                                        </div>
                                    </div>
                                </div>
                            </Container>
                        ) : (
                            <Container
                                header={
                                    <Header variant="h2">
                                        Session Replay Player
                                    </Header>
                                }
                            >
                                <RrwebPlayer events={selectedReplayEvents} />
                            </Container>
                        )}
                    </div>

                    <div className="events-sidebar">
                        {loadingRecordings ? (
                            <Container
                                header={
                                    <Header variant="h2">RRWeb Events</Header>
                                }
                            >
                                <div className="events-list">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                        (i) => (
                                            <div
                                                key={i}
                                                className="skeleton-item"
                                            >
                                                <div className="skeleton skeleton-line title" />
                                                <div className="skeleton skeleton-line short" />
                                            </div>
                                        )
                                    )}
                                </div>
                            </Container>
                        ) : recordingIds.length === 0 ? (
                            <Container
                                header={
                                    <Header variant="h2">RRWeb Events</Header>
                                }
                            >
                                <Box padding={{ vertical: 'l' }}>
                                    <Box
                                        variant="strong"
                                        fontSize="heading-m"
                                        color="text-body-secondary"
                                    >
                                        No events to display
                                    </Box>
                                    <Box
                                        variant="p"
                                        color="text-body-secondary"
                                        padding={{ top: 's' }}
                                    >
                                        Events will appear here when a recording
                                        is selected
                                    </Box>
                                </Box>
                            </Container>
                        ) : !selectedRecordingId ||
                          selectedReplayEvents.length === 0 ? (
                            <Container
                                header={
                                    <Header variant="h2">RRWeb Events</Header>
                                }
                            >
                                <div className="events-list">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                        (i) => (
                                            <div
                                                key={i}
                                                className="skeleton-item"
                                            >
                                                <div className="skeleton skeleton-line title" />
                                                <div className="skeleton skeleton-line short" />
                                            </div>
                                        )
                                    )}
                                </div>
                            </Container>
                        ) : (
                            <Container
                                header={
                                    <Header variant="h2">RRWeb Events</Header>
                                }
                            >
                                <div className="events-list">
                                    {selectedReplayEvents.map((event, idx) => {
                                        const eventSize =
                                            new Blob([JSON.stringify(event)])
                                                .size / 1024;
                                        const timestamp =
                                            event.timestamp < 946684800000
                                                ? event.timestamp * 1000
                                                : event.timestamp;

                                        // rrweb event type names
                                        const eventTypeNames: Record<
                                            number,
                                            string
                                        > = {
                                            0: 'DomContentLoaded',
                                            1: 'Load',
                                            2: 'FullSnapshot',
                                            3: 'IncrementalSnapshot',
                                            4: 'Meta',
                                            5: 'Custom',
                                            6: 'Plugin'
                                        };

                                        return (
                                            <div
                                                key={idx}
                                                className="event-item"
                                                onClick={() => {
                                                    setSelectedEvent({
                                                        event: {
                                                            id: String(idx),
                                                            type: 'rrweb',
                                                            timestamp:
                                                                event.timestamp,
                                                            details: event
                                                        }
                                                    } as any);
                                                    setSelectedRequest(null);
                                                    setSelectedReplay(null);
                                                    setModalVisible(true);
                                                }}
                                            >
                                                <div
                                                    className="event-marker"
                                                    style={{
                                                        backgroundColor:
                                                            '#8b6ccf'
                                                    }}
                                                />
                                                <div className="event-content">
                                                    <Box
                                                        variant="strong"
                                                        fontSize="body-s"
                                                    >
                                                        {eventTypeNames[
                                                            event.type
                                                        ] ||
                                                            `Type ${event.type}`}
                                                    </Box>
                                                    <Box
                                                        variant="small"
                                                        color="text-body-secondary"
                                                    >
                                                        {new Date(
                                                            timestamp
                                                        ).toLocaleTimeString(
                                                            'en-US',
                                                            {
                                                                hour12: false,
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit'
                                                            }
                                                        )}{' '}
                                                        • {eventSize.toFixed(2)}{' '}
                                                        KB
                                                    </Box>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Container>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'sessions' && (
                <div className="timeline-layout">
                    <div className="sessions-sidebar">
                        <Container
                            header={<Header variant="h2">Sessions</Header>}
                        >
                            <div className="session-list">
                                {rumSessions.map((session) => {
                                    const duration = Math.round(
                                        (session.lastSeen - session.firstSeen) /
                                            1000
                                    );
                                    const minutes = Math.floor(duration / 60);
                                    const seconds = duration % 60;
                                    const durationStr =
                                        minutes > 0
                                            ? `${minutes}m ${seconds}s`
                                            : `${seconds}s`;

                                    return (
                                        <div
                                            key={session.sessionId}
                                            className={`session-item ${
                                                selectedRumSessionId ===
                                                session.sessionId
                                                    ? 'selected'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setSelectedRumSessionId(
                                                    session.sessionId
                                                )
                                            }
                                        >
                                            <Box variant="strong">
                                                {session.sessionId}
                                            </Box>
                                            <div>
                                                <Box
                                                    variant="small"
                                                    color="text-body-secondary"
                                                >
                                                    {session.events.length}{' '}
                                                    events • {durationStr}
                                                </Box>
                                                <Box
                                                    variant="small"
                                                    color="text-body-secondary"
                                                >
                                                    {new Date(
                                                        session.lastSeen
                                                    ).toLocaleString()}
                                                </Box>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Container>
                    </div>

                    <div className="replay-main">
                        {selectedRumSession && (
                            <SpaceBetween size="l">
                                <Container
                                    header={
                                        <Header variant="h2">
                                            User Visits (Session Replays)
                                        </Header>
                                    }
                                >
                                    <div className="session-list">
                                        {selectedRumSession.visits.map(
                                            (visit) => {
                                                const duration = Math.round(
                                                    (visit.lastSeen -
                                                        visit.firstSeen) /
                                                        1000
                                                );
                                                const minutes = Math.floor(
                                                    duration / 60
                                                );
                                                const seconds = duration % 60;
                                                const durationStr =
                                                    minutes > 0
                                                        ? `${minutes}m ${seconds}s`
                                                        : `${seconds}s`;

                                                return (
                                                    <div
                                                        key={visit.recordingId}
                                                        className={`session-item ${
                                                            selectedVisitId ===
                                                            visit.recordingId
                                                                ? 'selected'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            setSelectedVisitId(
                                                                visit.recordingId
                                                            )
                                                        }
                                                    >
                                                        <Box variant="strong">
                                                            {visit.recordingId.slice(
                                                                0,
                                                                16
                                                            )}
                                                            ...
                                                        </Box>
                                                        <div
                                                            style={{
                                                                marginTop: '4px'
                                                            }}
                                                        >
                                                            <Box
                                                                variant="small"
                                                                color="text-body-secondary"
                                                            >
                                                                {
                                                                    visit.events
                                                                        .length
                                                                }{' '}
                                                                events •{' '}
                                                                {durationStr}
                                                            </Box>
                                                            <Box
                                                                variant="small"
                                                                color="text-body-secondary"
                                                            >
                                                                {new Date(
                                                                    visit.lastSeen
                                                                ).toLocaleString()}
                                                            </Box>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </Container>

                                {selectedVisit && (
                                    <Container
                                        header={
                                            <Header variant="h2">
                                                Session Replay Player
                                            </Header>
                                        }
                                    >
                                        <div className="replay-placeholder">
                                            <div
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '40px'
                                                }}
                                            >
                                                <Box variant="h3">
                                                    Session Replay Placeholder
                                                </Box>
                                                <Box
                                                    variant="p"
                                                    color="text-body-secondary"
                                                    margin={{ top: 's' }}
                                                >
                                                    RUM Session:{' '}
                                                    {
                                                        selectedRumSession.sessionId
                                                    }
                                                </Box>
                                                <Box
                                                    variant="p"
                                                    color="text-body-secondary"
                                                >
                                                    Recording ID:{' '}
                                                    {selectedVisit.recordingId}
                                                </Box>
                                                <Box
                                                    variant="small"
                                                    color="text-body-secondary"
                                                    margin={{ top: 's' }}
                                                >
                                                    Session replay player will
                                                    be implemented here
                                                </Box>
                                            </div>
                                        </div>
                                    </Container>
                                )}
                            </SpaceBetween>
                        )}
                    </div>

                    <div className="events-sidebar">
                        {selectedVisit && (
                            <Container
                                header={<Header variant="h2">Events</Header>}
                            >
                                <div className="events-list">
                                    {selectedVisit.events.map((event) => {
                                        const eventSize =
                                            new Blob([
                                                JSON.stringify(event.event)
                                            ]).size / 1024;
                                        const color = getEventColor(
                                            event.event.type
                                        );
                                        const timestamp =
                                            event.event.timestamp < 946684800000
                                                ? event.event.timestamp * 1000
                                                : event.event.timestamp;

                                        return (
                                            <div
                                                key={event.event.id}
                                                className="event-item"
                                                onClick={() => {
                                                    setSelectedEvent(event);
                                                    setSelectedRequest(null);
                                                    setModalVisible(true);
                                                }}
                                            >
                                                <div
                                                    className="event-marker"
                                                    style={{
                                                        backgroundColor: color
                                                    }}
                                                />
                                                <div className="event-content">
                                                    <Box
                                                        variant="strong"
                                                        fontSize="body-s"
                                                    >
                                                        {getEventLabel(
                                                            event.event.type
                                                        )}
                                                    </Box>
                                                    <Box
                                                        variant="small"
                                                        color="text-body-secondary"
                                                    >
                                                        {new Date(
                                                            timestamp
                                                        ).toLocaleTimeString(
                                                            'en-US',
                                                            {
                                                                hour12: false,
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit'
                                                            }
                                                        )}{' '}
                                                        • {eventSize.toFixed(2)}{' '}
                                                        KB
                                                    </Box>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Container>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'payloads' && (
                <div className="payloads-layout">
                    <Container
                        header={<Header variant="h2">Request Payloads</Header>}
                    >
                        <div className="events-list">
                            {requests.map((request, idx) => {
                                const requestSize =
                                    new Blob([JSON.stringify(request)]).size /
                                    1024;

                                return (
                                    <div
                                        key={idx}
                                        className="event-item"
                                        onClick={() => {
                                            setSelectedRequest(request);
                                            setSelectedEvent(null);
                                            setModalVisible(true);
                                        }}
                                    >
                                        <div
                                            className="event-marker"
                                            style={{
                                                backgroundColor: '#0972d3'
                                            }}
                                        />
                                        <div className="event-content">
                                            <Box
                                                variant="strong"
                                                fontSize="body-s"
                                            >
                                                {request.method}{' '}
                                                {request.appmonitorId}
                                            </Box>
                                            <Box
                                                variant="small"
                                                color="text-body-secondary"
                                            >
                                                {new Date(
                                                    request.timestamp
                                                ).toLocaleString()}{' '}
                                                • {requestSize.toFixed(2)} KB
                                            </Box>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Container>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="settings-layout">
                    <Container header={<Header variant="h2">Settings</Header>}>
                        <FormField label="Theme Mode">
                            <Select
                                selectedOption={themeMode}
                                onChange={({ detail }) =>
                                    setThemeMode(detail.selectedOption)
                                }
                                options={[
                                    { label: 'Auto', value: 'auto' },
                                    { label: 'Light', value: 'light' },
                                    { label: 'Dark', value: 'dark' }
                                ]}
                            />
                        </FormField>
                    </Container>
                </div>
            )}

            <Modal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                size="max"
                header={
                    selectedEvent
                        ? getEventLabel(selectedEvent.event.type)
                        : selectedRequest
                        ? `${selectedRequest.method} Request`
                        : selectedReplay
                        ? `Recording ${selectedReplay.recordingId.slice(
                              0,
                              16
                          )}...`
                        : 'Details'
                }
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                variant="normal"
                                onClick={() => {
                                    const data = selectedEvent
                                        ? selectedEvent.event
                                        : selectedRequest
                                        ? selectedRequest
                                        : selectedReplay;
                                    const json =
                                        jsonView === 'parsed'
                                            ? JSON.stringify(
                                                  recursiveParse(data),
                                                  null,
                                                  2
                                              )
                                            : JSON.stringify(data, null, 2);
                                    navigator.clipboard.writeText(json);
                                }}
                            >
                                Copy
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setModalVisible(false)}
                            >
                                Close
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
            >
                {(selectedEvent || selectedRequest || selectedReplay) && (
                    <SpaceBetween size="m">
                        <SegmentedControl
                            selectedId={jsonView}
                            onChange={({ detail }) =>
                                setJsonView(
                                    detail.selectedId as 'parsed' | 'raw'
                                )
                            }
                            options={[
                                { id: 'parsed', text: 'Parsed' },
                                { id: 'raw', text: 'Raw' }
                            ]}
                        />
                        <pre className="json-viewer">
                            {jsonView === 'parsed'
                                ? JSON.stringify(
                                      recursiveParse(
                                          selectedEvent
                                              ? selectedEvent.event
                                              : selectedRequest
                                              ? selectedRequest
                                              : selectedReplay
                                      ),
                                      null,
                                      2
                                  )
                                : JSON.stringify(
                                      selectedEvent
                                          ? selectedEvent.event
                                          : selectedRequest
                                          ? selectedRequest
                                          : selectedReplay,
                                      null,
                                      2
                                  )}
                        </pre>
                    </SpaceBetween>
                )}
            </Modal>
        </div>
    );
}

export default TimelinePage;
