import { useState, useEffect } from 'react';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Badge from '@cloudscape-design/components/badge';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Toggle from '@cloudscape-design/components/toggle';
import { formatBytes } from '../utils/formatBytes';

interface RawEvent {
    appmonitorId: string;
    requestTimestamp: string;
    sessionId?: string;
    userId?: string;
    appMonitorId?: string;
    event: {
        id: string;
        type: string;
        timestamp: number;
        details: unknown;
    };
}

function RawEventsPage() {
    const [events, setEvents] = useState<RawEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<RawEvent | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [showRawFormat, setShowRawFormat] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/events');
            const data = await response.json();
            setEvents(data);
        } catch (error) {
            console.error('Failed to fetch raw events:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Fetch events on component mount and set up interval
        const loadData = async () => {
            await fetchEvents();
        };

        loadData();
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, []);

    const openModal = (event: RawEvent) => {
        setSelectedEvent(event);
        setModalVisible(true);
        setShowRawFormat(false);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedEvent(null);
        setShowRawFormat(false);
    };

    // Function to recursively parse stringified JSON
    const parseNestedJSON = (obj: unknown): unknown => {
        if (typeof obj === 'string') {
            try {
                const parsed = JSON.parse(obj);
                return parseNestedJSON(parsed);
            } catch {
                return obj;
            }
        } else if (Array.isArray(obj)) {
            return obj.map((item) => parseNestedJSON(item));
        } else if (obj !== null && typeof obj === 'object') {
            const result: Record<string, unknown> = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = parseNestedJSON(
                        (obj as Record<string, unknown>)[key]
                    );
                }
            }
            return result;
        }
        return obj;
    };

    const getDisplayData = () => {
        if (!selectedEvent) return null;
        return showRawFormat ? selectedEvent : parseNestedJSON(selectedEvent);
    };

    const getEventTypeColor = (
        eventType: string
    ): 'blue' | 'green' | 'grey' | 'red' => {
        const colorMap: Record<string, 'blue' | 'green' | 'grey' | 'red'> = {
            'com.amazon.rum.page_view_event': 'blue',
            'com.amazon.rum.js_error_event': 'red',
            'com.amazon.rum.http_event': 'green',
            'com.amazon.rum.navigation_event': 'blue',
            'com.amazon.rum.resource_event': 'grey',
            'com.amazon.rum.web_vital_event': 'red',
            'com.amazon.rum.rrweb': 'blue'
        };
        return colorMap[eventType] || 'grey';
    };

    const getShortEventType = (eventType: string) => {
        return eventType.replace('com.amazon.rum.', '').replace('_event', '');
    };

    const columns = [
        {
            id: 'requestTimestamp',
            header: 'Request Time',
            cell: (item: RawEvent) =>
                new Date(item.requestTimestamp).toLocaleString(),
            sortingField: 'requestTimestamp'
        },
        {
            id: 'eventTimestamp',
            header: 'Event Time',
            cell: (item: RawEvent) =>
                new Date(item.event.timestamp).toLocaleString(),
            sortingField: 'event.timestamp'
        },
        {
            id: 'eventType',
            header: 'Event Type',
            cell: (item: RawEvent) => (
                <Badge color={getEventTypeColor(item.event.type)}>
                    {getShortEventType(item.event.type)}
                </Badge>
            )
        },
        {
            id: 'sessionId',
            header: 'Session ID',
            cell: (item: RawEvent) =>
                item.sessionId ? item.sessionId.substring(0, 8) + '...' : 'N/A'
        },
        {
            id: 'eventId',
            header: 'Event ID',
            cell: (item: RawEvent) =>
                item.event.id ? item.event.id.substring(0, 12) + '...' : 'N/A'
        },
        {
            id: 'appMonitorId',
            header: 'App Monitor',
            cell: (item: RawEvent) =>
                item.appMonitorId
                    ? item.appMonitorId.substring(0, 8) + '...'
                    : item.appmonitorId
                    ? item.appmonitorId.substring(0, 8) + '...'
                    : 'N/A'
        },
        {
            id: 'eventSize',
            header: 'Event Size',
            cell: (item: RawEvent) => formatBytes(JSON.stringify(item).length)
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: (item: RawEvent) => (
                <Button variant="link" onClick={() => openModal(item)}>
                    View Details
                </Button>
            )
        }
    ];

    return (
        <>
            <Container
                header={
                    <Header
                        variant="h1"
                        actions={
                            <Button onClick={fetchEvents} loading={loading}>
                                Refresh
                            </Button>
                        }
                    >
                        AWS RUM Raw Events
                    </Header>
                }
            >
                <Table
                    columnDefinitions={columns}
                    items={events}
                    loading={loading}
                    sortingDisabled={false}
                    empty="No raw events available"
                    header={
                        <Header counter={`(${events.length})`}>
                            RUM Events
                        </Header>
                    }
                />
            </Container>

            <Modal
                visible={modalVisible}
                onDismiss={closeModal}
                header={
                    <SpaceBetween
                        direction="horizontal"
                        size="m"
                        alignItems="center"
                    >
                        <span>Raw Event Details</span>
                        <Toggle
                            checked={showRawFormat}
                            onChange={({ detail }) =>
                                setShowRawFormat(detail.checked)
                            }
                        >
                            Show Raw Format
                        </Toggle>
                    </SpaceBetween>
                }
                size="max"
                footer={<Button onClick={closeModal}>Close</Button>}
            >
                {selectedEvent && (
                    <Box>
                        <pre
                            style={{
                                background: '#f8f9fa',
                                padding: '16px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px',
                                maxHeight: '70vh'
                            }}
                        >
                            {JSON.stringify(getDisplayData(), null, 2)}
                        </pre>
                    </Box>
                )}
            </Modal>
        </>
    );
}

export default RawEventsPage;
