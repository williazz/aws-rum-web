import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Modal from '@cloudscape-design/components/modal';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import Button from '@cloudscape-design/components/button';
import Tabs from '@cloudscape-design/components/tabs';
import FormField from '@cloudscape-design/components/form-field';
import Select from '@cloudscape-design/components/select';
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

interface RawRequest {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
}

interface Session {
    sessionId: string;
    events: RawEvent[];
    firstSeen: number;
    lastSeen: number;
}

function TimelinePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
        null
    );
    const [selectedEvent, setSelectedEvent] = useState<RawEvent | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [jsonView, setJsonView] = useState<'parsed' | 'raw'>('parsed');
    const [activeTab, setActiveTab] = useState(
        searchParams.get('tab') || 'sessions'
    );
    const [requests, setRequests] = useState<RawRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RawRequest | null>(
        null
    );

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

            // Group by session
            const sessionMap = new Map<string, RawEvent[]>();
            data.forEach((event) => {
                const sid = event.sessionId || 'unknown';
                if (!sessionMap.has(sid)) sessionMap.set(sid, []);
                sessionMap.get(sid)!.push(event);
            });

            // Convert to sessions array
            const sessionList: Session[] = Array.from(sessionMap.entries()).map(
                ([sessionId, events]) => {
                    // Timestamps might be in seconds, convert to milliseconds if needed
                    const timestamps = events.map((e) => {
                        const ts = e.event.timestamp;
                        // If timestamp is less than year 2000 in milliseconds, it's likely in seconds
                        return ts < 946684800000 ? ts * 1000 : ts;
                    });
                    return {
                        sessionId,
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
                        firstSeen: Math.min(...timestamps),
                        lastSeen: Math.max(...timestamps)
                    };
                }
            );

            // Sort by most recent
            sessionList.sort((a, b) => b.lastSeen - a.lastSeen);
            setSessions(sessionList);

            // Auto-select most recent
            if (sessionList.length > 0 && !selectedSessionId) {
                setSelectedSessionId(sessionList[0].sessionId);
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

    useEffect(() => {
        fetchEvents();
        fetchRequests();
        const interval = setInterval(() => {
            fetchEvents();
            fetchRequests();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const selectedSession = sessions.find(
        (s) => s.sessionId === selectedSessionId
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
                        { id: 'sessions', label: 'Sessions' },
                        { id: 'payloads', label: 'Payloads' },
                        { id: 'settings', label: 'Settings' }
                    ]}
                />
            </div>

            {activeTab === 'sessions' && (
                <div className="timeline-layout">
                    <div className="sessions-sidebar">
                        <Container
                            header={<Header variant="h2">Sessions</Header>}
                        >
                            <div className="session-list">
                                {sessions.map((session) => {
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
                                                selectedSessionId ===
                                                session.sessionId
                                                    ? 'selected'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setSelectedSessionId(
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
                        {selectedSession && (
                            <Container
                                header={
                                    <Header variant="h2">
                                        Session Replay -{' '}
                                        {selectedSession.sessionId}
                                    </Header>
                                }
                            >
                                <div className="replay-placeholder">
                                    {/* Session replay module will go here */}
                                </div>
                            </Container>
                        )}
                    </div>

                    <div className="events-sidebar">
                        {selectedSession && (
                            <Container
                                header={<Header variant="h2">Events</Header>}
                            >
                                <div className="events-list">
                                    {selectedSession.events.map((event) => {
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
                                        : selectedRequest;
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
                {(selectedEvent || selectedRequest) && (
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
                                      ),
                                      null,
                                      2
                                  )
                                : JSON.stringify(
                                      selectedEvent
                                          ? selectedEvent.event
                                          : selectedRequest,
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
