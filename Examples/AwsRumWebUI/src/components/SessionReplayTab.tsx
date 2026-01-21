import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Box from '@cloudscape-design/components/box';
import { RrwebPlayer } from './RrwebPlayer';

interface SessionMetadata {
    sessionId: string;
    eventCount: number;
    recordingIds: string[];
    firstSeen: number;
    lastSeen: number;
}

interface SessionReplayTabProps {
    sessions: SessionMetadata[];
    selectedSessionId: string | null;
    selectedReplayEvents: any[];
    loadingSessions: boolean;
    loadingEvents: boolean;
    onSelectSession: (sessionId: string) => void;
    onEventClick: (event: any, idx: number) => void;
}

export function SessionReplayTab({
    sessions,
    selectedSessionId,
    selectedReplayEvents,
    loadingSessions,
    loadingEvents,
    onSelectSession,
    onEventClick
}: SessionReplayTabProps) {
    const eventTypeNames: Record<number, string> = {
        0: 'DomContentLoaded',
        1: 'Load',
        2: 'FullSnapshot',
        3: 'IncrementalSnapshot',
        4: 'Meta',
        5: 'Custom',
        6: 'Plugin'
    };

    return (
        <div className="timeline-layout">
            <div className="sessions-sidebar">
                <Container header={<Header variant="h2">Sessions</Header>}>
                    {loadingSessions ? (
                        <div className="session-list">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="skeleton-item">
                                    <div className="skeleton skeleton-line title" />
                                    <div className="skeleton skeleton-line short" />
                                    <div className="skeleton skeleton-line short" style={{ width: '40%' }} />
                                </div>
                            ))}
                        </div>
                    ) : sessions.length === 0 ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box variant="strong" fontSize="heading-m" color="text-body-secondary">
                                No sessions yet
                            </Box>
                            <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                Sessions will appear here once captured
                            </Box>
                        </Box>
                    ) : (
                        <div className="session-list">
                            {sessions.map((session) => {
                                const duration = Math.round((session.lastSeen - session.firstSeen) / 1000);
                                const minutes = Math.floor(duration / 60);
                                const seconds = duration % 60;
                                const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                                return (
                                    <div
                                        key={session.sessionId}
                                        className={`session-item ${selectedSessionId === session.sessionId ? 'selected' : ''}`}
                                        onClick={() => onSelectSession(session.sessionId)}
                                    >
                                        <Box variant="strong">{session.sessionId.slice(0, 16)}...</Box>
                                        <div style={{ marginTop: '4px' }}>
                                            <Box variant="small" color="text-body-secondary">
                                                {session.eventCount} events • {durationStr}
                                            </Box>
                                            <Box variant="small" color="text-body-secondary">
                                                {new Date(session.lastSeen).toLocaleString()}
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
                <Container header={<Header variant="h2">Session Replay Player</Header>}>
                    {loadingSessions || loadingEvents ? (
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
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="skeleton skeleton-player-button" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : sessions.length === 0 || !selectedSessionId || selectedReplayEvents.length === 0 ? (
                        <div className="skeleton-player">
                            <div className="skeleton-player-screen">
                                <Box textAlign="center" padding={{ vertical: 'xxl' }}>
                                    <Box variant="strong" fontSize="heading-m" color="text-body-secondary">
                                        {sessions.length === 0 ? 'No replay to display' : 'Loading...'}
                                    </Box>
                                    <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                        {sessions.length === 0 ? 'Select a session to view the replay' : 'Please wait'}
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
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="skeleton skeleton-player-button" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <RrwebPlayer events={selectedReplayEvents} />
                    )}
                </Container>
            </div>

            <div className="events-sidebar">
                <Container header={<Header variant="h2">RRWeb Events</Header>}>
                    {loadingSessions || loadingEvents ? (
                        <div className="events-list">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                <div key={i} className="skeleton-item">
                                    <div className="skeleton skeleton-line title" />
                                    <div className="skeleton skeleton-line short" />
                                </div>
                            ))}
                        </div>
                    ) : sessions.length === 0 || !selectedSessionId || selectedReplayEvents.length === 0 ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box variant="strong" fontSize="heading-m" color="text-body-secondary">
                                No events to display
                            </Box>
                            <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                Events will appear here when a session is selected
                            </Box>
                        </Box>
                    ) : (
                        <div className="events-list">
                            {selectedReplayEvents.map((event, idx) => {
                                const eventSize = new Blob([JSON.stringify(event)]).size / 1024;
                                const timestamp = event.timestamp < 946684800000 ? event.timestamp * 1000 : event.timestamp;

                                return (
                                    <div key={idx} className="event-item" onClick={() => onEventClick(event, idx)}>
                                        <div className="event-marker" style={{ backgroundColor: '#8b6ccf' }} />
                                        <div className="event-content">
                                            <Box variant="strong" fontSize="body-s">
                                                {eventTypeNames[event.type] || `Type ${event.type}`}
                                            </Box>
                                            <Box variant="small" color="text-body-secondary">
                                                {new Date(timestamp).toLocaleTimeString('en-US', {
                                                    hour12: false,
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}{' '}
                                                • {eventSize.toFixed(2)} KB
                                            </Box>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Container>
            </div>
        </div>
    );
}
