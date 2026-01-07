import { useState, useEffect } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Button from '@cloudscape-design/components/button';
import SessionReplayViewer from '../SessionReplayViewer';

interface LogEntry {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    query: Record<string, string>;
}

function SessionReplayPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/session-replay');
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Fetch logs on component mount and set up interval
        const loadData = async () => {
            await fetchLogs();
        };

        loadData();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Container
            header={
                <Header
                    variant="h1"
                    actions={
                        <Button onClick={fetchLogs} loading={loading}>
                            Refresh
                        </Button>
                    }
                >
                    AWS RUM Session Replay
                </Header>
            }
        >
            <SessionReplayViewer logs={logs} />
        </Container>
    );
}

export default SessionReplayPage;
