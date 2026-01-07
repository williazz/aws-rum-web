import { useState, useEffect } from 'react';
import AppLayout from '@cloudscape-design/components/app-layout';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Badge from '@cloudscape-design/components/badge';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import '@cloudscape-design/global-styles/index.css';

interface LogEntry {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
}

function App() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/logs');
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const openModal = (log: LogEntry) => {
        setSelectedLog(log);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedLog(null);
    };

    const columns = [
        {
            id: 'timestamp',
            header: 'Timestamp',
            cell: (item: LogEntry) => new Date(item.timestamp).toLocaleString(),
            sortingField: 'timestamp'
        },
        {
            id: 'method',
            header: 'Method',
            cell: (item: LogEntry) => (
                <Badge color={item.method === 'POST' ? 'blue' : 'grey'}>
                    {item.method}
                </Badge>
            )
        },
        {
            id: 'appmonitorId',
            header: 'App Monitor ID',
            cell: (item: LogEntry) => item.appmonitorId
        },
        {
            id: 'userAgent',
            header: 'User Agent',
            cell: (item: LogEntry) =>
                item.headers['user-agent']?.substring(0, 50) + '...'
        },
        {
            id: 'bodySize',
            header: 'Body Size',
            cell: (item: LogEntry) =>
                JSON.stringify(item.body).length + ' bytes'
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: (item: LogEntry) => (
                <Button variant="link" onClick={() => openModal(item)}>
                    View JSON
                </Button>
            )
        }
    ];

    return (
        <>
            <AppLayout
                navigationHide
                toolsHide
                content={
                    <Container
                        header={
                            <Header
                                variant="h1"
                                actions={
                                    <Button
                                        onClick={fetchLogs}
                                        loading={loading}
                                    >
                                        Refresh
                                    </Button>
                                }
                            >
                                AWS RUM Request Logs
                            </Header>
                        }
                    >
                        <Table
                            columnDefinitions={columns}
                            items={logs}
                            loading={loading}
                            sortingDisabled={false}
                            empty="No logs available"
                            header={
                                <Header counter={`(${logs.length})`}>
                                    Requests
                                </Header>
                            }
                        />
                    </Container>
                }
            />

            <Modal
                visible={modalVisible}
                onDismiss={closeModal}
                header="Raw JSON Log"
                size="large"
                footer={<Button onClick={closeModal}>Close</Button>}
            >
                {selectedLog && (
                    <Box>
                        <pre
                            style={{
                                background: '#f8f9fa',
                                padding: '16px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}
                        >
                            {JSON.stringify(selectedLog, null, 2)}
                        </pre>
                    </Box>
                )}
            </Modal>
        </>
    );
}

export default App;
