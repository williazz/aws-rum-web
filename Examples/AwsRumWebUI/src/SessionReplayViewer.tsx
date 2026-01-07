import React, { useEffect, useRef, useState } from 'react';
import { Replayer } from 'rrweb';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';

// RRWeb event types
interface RRWebEvent {
    type: number;
    data: Record<string, unknown>;
    timestamp: number;
}

interface SessionReplayEvent {
    sessionId: string;
    recordingId: string;
    events: RRWebEvent[];
    metadata: {
        recordingStartTime: number;
        recordingEndTime?: number;
        userAgent: string;
        viewport: {
            width: number;
            height: number;
        };
        url: string;
        title: string;
        samplingRate: number;
    };
}

interface RumEvent {
    type: string;
    details: string;
}

interface RequestBody {
    RumEvents?: RumEvent[];
}

interface LogEntry {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: RequestBody;
    query: Record<string, string>;
}

interface SessionReplayViewerProps {
    logs: LogEntry[];
}

const SessionReplayViewer: React.FC<SessionReplayViewerProps> = ({ logs }) => {
    const [sessionReplays, setSessionReplays] = useState<SessionReplayEvent[]>([]);
    const [selectedReplay, setSelectedReplay] = useState<SessionReplayEvent | null>(null);
    const [replayer, setReplayer] = useState<Replayer | null>(null);
    const replayContainerRef = useRef<HTMLDivElement>(null);

    // Extract session replay events from logs
    useEffect(() => {
        const extractSessionReplays = () => {
            const replays: SessionReplayEvent[] = [];
            
            logs.forEach(log => {
                if (log.body && log.body.RumEvents) {
                    log.body.RumEvents.forEach((event: RumEvent) => {
                        if (event.type === 'com.amazon.rum.rrweb') {
                            try {
                                const replayData = JSON.parse(event.details) as SessionReplayEvent;
                                replays.push(replayData);
                            } catch (error) {
                                console.error('Failed to parse RRWeb event:', error);
                            }
                        }
                    });
                }
            });

            setSessionReplays(replays);
        };

        extractSessionReplays();
    }, [logs]);

    // Initialize or update replayer when selection changes
    useEffect(() => {
        if (selectedReplay && replayContainerRef.current) {
            // Clear previous replayer
            if (replayer) {
                replayer.destroy();
            }

            // Clear container
            replayContainerRef.current.innerHTML = '';

            try {
                // Create new replayer with basic configuration
                const newReplayer = new Replayer(selectedReplay.events, {
                    root: replayContainerRef.current,
                    mouseTail: {
                        duration: 500,
                        lineCap: 'round',
                        lineWidth: 3,
                        strokeStyle: 'red',
                    },
                });

                setReplayer(newReplayer);
            } catch (error) {
                console.error('Failed to create replayer:', error);
            }
        }

        return () => {
            if (replayer) {
                replayer.destroy();
            }
        };
    }, [selectedReplay]);

    const handleReplaySelection = (selectedOption: { value: string; label?: string; description?: string } | null) => {
        if (!selectedOption) {
            setSelectedReplay(null);
            return;
        }
        const replay = sessionReplays.find(r => r.recordingId === selectedOption.value);
        setSelectedReplay(replay || null);
    };

    const playReplay = () => {
        if (replayer) {
            replayer.play();
        }
    };

    const pauseReplay = () => {
        if (replayer) {
            replayer.pause();
        }
    };

    const restartReplay = () => {
        if (replayer) {
            replayer.play(0);
        }
    };

    const replayOptions = sessionReplays.map(replay => ({
        label: `Recording ${replay.recordingId.substring(0, 8)}... - ${new Date(replay.metadata.recordingStartTime).toLocaleString()}`,
        value: replay.recordingId,
        description: `Session: ${replay.sessionId.substring(0, 8)}... | URL: ${replay.metadata.url}`
    }));

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    counter={`(${sessionReplays.length})`}
                >
                    Session Replay Events
                </Header>
            }
        >
            <SpaceBetween direction="vertical" size="l">
                {sessionReplays.length === 0 ? (
                    <Box textAlign="center" color="text-status-inactive">
                        <Badge color="grey">No session replay events found</Badge>
                        <p>Session replay events with type 'com.amazon.rum.rrweb' will appear here when captured.</p>
                    </Box>
                ) : (
                    <>
                        <SpaceBetween direction="horizontal" size="s">
                            <Select
                                selectedOption={
                                    selectedReplay 
                                        ? replayOptions.find(opt => opt.value === selectedReplay.recordingId) || null
                                        : null
                                }
                                onChange={({ detail }) => handleReplaySelection(detail.selectedOption as { value: string; label?: string; description?: string } | null)}
                                options={replayOptions}
                                placeholder="Select a recording to replay"
                                expandToViewport
                            />
                        </SpaceBetween>

                        {selectedReplay && (
                            <>
                                <Container>
                                    <SpaceBetween direction="vertical" size="s">
                                        <div>
                                            <strong>Session Details:</strong>
                                        </div>
                                        <SpaceBetween direction="horizontal" size="m">
                                            <div>
                                                <strong>Recording ID:</strong> {selectedReplay.recordingId}
                                            </div>
                                            <div>
                                                <strong>Session ID:</strong> {selectedReplay.sessionId}
                                            </div>
                                        </SpaceBetween>
                                        <SpaceBetween direction="horizontal" size="m">
                                            <div>
                                                <strong>URL:</strong> {selectedReplay.metadata.url}
                                            </div>
                                            <div>
                                                <strong>Title:</strong> {selectedReplay.metadata.title}
                                            </div>
                                        </SpaceBetween>
                                        <SpaceBetween direction="horizontal" size="m">
                                            <div>
                                                <strong>Viewport:</strong> {selectedReplay.metadata.viewport.width} x {selectedReplay.metadata.viewport.height}
                                            </div>
                                            <div>
                                                <strong>Events:</strong> {selectedReplay.events.length}
                                            </div>
                                        </SpaceBetween>
                                        <div>
                                            <strong>User Agent:</strong> {selectedReplay.metadata.userAgent}
                                        </div>
                                    </SpaceBetween>
                                </Container>

                                <Container>
                                    <SpaceBetween direction="vertical" size="m">
                                        <Header variant="h3">
                                            Replay Controls
                                        </Header>
                                        <SpaceBetween direction="horizontal" size="s">
                                            <Button onClick={playReplay} variant="primary">
                                                Play
                                            </Button>
                                            <Button onClick={pauseReplay}>
                                                Pause
                                            </Button>
                                            <Button onClick={restartReplay}>
                                                Restart
                                            </Button>
                                        </SpaceBetween>
                                    </SpaceBetween>
                                </Container>

                                <Container>
                                    <Header variant="h3">
                                        Session Replay
                                    </Header>
                                    <Box>
                                        <div
                                            ref={replayContainerRef}
                                            style={{
                                                border: '1px solid #e1e8ed',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                backgroundColor: '#fafbfc',
                                                minHeight: '600px',
                                                width: '100%',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        />
                                    </Box>
                                </Container>
                            </>
                        )}
                    </>
                )}
            </SpaceBetween>
        </Container>
    );
};

export default SessionReplayViewer;
