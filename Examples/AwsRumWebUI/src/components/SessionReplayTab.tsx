import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Box from '@cloudscape-design/components/box';
import { RrwebPlayer } from './RrwebPlayer';

interface RecordingMetadata {
    recordingId: string;
    timestamp: number;
    eventCount: number;
}

interface SessionReplayTabProps {
    recordingIds: RecordingMetadata[];
    selectedRecordingId: string | null;
    selectedReplayEvents: any[];
    loadingRecordings: boolean;
    loadingEvents: boolean;
    onSelectRecording: (recordingId: string) => void;
    onEventClick: (event: any, idx: number) => void;
}

export function SessionReplayTab({
    recordingIds,
    selectedRecordingId,
    selectedReplayEvents,
    loadingRecordings,
    loadingEvents,
    onSelectRecording,
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
                <Container header={<Header variant="h2">Recordings</Header>}>
                    {loadingRecordings ? (
                        <div className="session-list">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="skeleton-item">
                                    <div className="skeleton skeleton-line title" />
                                    <div className="skeleton skeleton-line short" />
                                    <div className="skeleton skeleton-line short" style={{ width: '40%' }} />
                                </div>
                            ))}
                        </div>
                    ) : recordingIds.length === 0 ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box variant="strong" fontSize="heading-m" color="text-body-secondary">
                                No recordings yet
                            </Box>
                            <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                Session recordings will appear here once captured
                            </Box>
                        </Box>
                    ) : (
                        <div className="session-list">
                            {recordingIds.map((recording) => (
                                <div
                                    key={recording.recordingId}
                                    className={`session-item ${selectedRecordingId === recording.recordingId ? 'selected' : ''}`}
                                    onClick={() => onSelectRecording(recording.recordingId)}
                                >
                                    <Box variant="strong">{recording.recordingId.slice(0, 16)}...</Box>
                                    <div style={{ marginTop: '4px' }}>
                                        <Box variant="small" color="text-body-secondary">
                                            {recording.eventCount} events
                                        </Box>
                                        <Box variant="small" color="text-body-secondary">
                                            {new Date(recording.timestamp).toLocaleString()}
                                        </Box>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Container>
            </div>

            <div className="replay-main">
                <Container header={<Header variant="h2">Session Replay Player</Header>}>
                    {loadingRecordings || loadingEvents ? (
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
                    ) : recordingIds.length === 0 || !selectedRecordingId || selectedReplayEvents.length === 0 ? (
                        <div className="skeleton-player">
                            <div className="skeleton-player-screen">
                                <Box textAlign="center" padding={{ vertical: 'xxl' }}>
                                    <Box variant="strong" fontSize="heading-m" color="text-body-secondary">
                                        {recordingIds.length === 0 ? 'No replay to display' : 'Loading...'}
                                    </Box>
                                    <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                        {recordingIds.length === 0 ? 'Select a recording to view the session replay' : 'Please wait'}
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
                    {loadingRecordings || loadingEvents ? (
                        <div className="events-list">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                <div key={i} className="skeleton-item">
                                    <div className="skeleton skeleton-line title" />
                                    <div className="skeleton skeleton-line short" />
                                </div>
                            ))}
                        </div>
                    ) : recordingIds.length === 0 || !selectedRecordingId || selectedReplayEvents.length === 0 ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box variant="strong" fontSize="heading-m" color="text-body-secondary">
                                No events to display
                            </Box>
                            <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                Events will appear here when a recording is selected
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
