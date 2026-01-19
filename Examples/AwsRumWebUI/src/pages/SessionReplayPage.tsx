import { useState, useEffect } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Button from '@cloudscape-design/components/button';
import SessionReplayViewer from '../SessionReplayViewer';

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

function SessionReplayPage() {
    const [sessionReplays, setSessionReplays] = useState<SessionReplayEvent[]>(
        []
    );
    const [loading, setLoading] = useState(false);

    const fetchSessionReplays = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                'http://localhost:3000/api/session-replay'
            );
            const data = await response.json();
            setSessionReplays(data);
        } catch (error) {
            console.error('Failed to fetch session replays:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Fetch session replays on component mount and set up interval
        const loadData = async () => {
            await fetchSessionReplays();
        };

        loadData();
        const interval = setInterval(fetchSessionReplays, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Container
            header={
                <Header
                    variant="h1"
                    actions={
                        <Button onClick={fetchSessionReplays} loading={loading}>
                            Refresh
                        </Button>
                    }
                >
                    AWS RUM Session Replay
                </Header>
            }
        >
            <SessionReplayViewer logs={sessionReplays} />
        </Container>
    );
}

export default SessionReplayPage;
