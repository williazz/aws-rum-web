import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Modal from '@cloudscape-design/components/modal';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import Button from '@cloudscape-design/components/button';
import Tabs from '@cloudscape-design/components/tabs';
import { SessionReplayTab } from '../components/SessionReplayTab';
import { PayloadsTab } from '../components/PayloadsTab';
import { SettingsTab } from '../components/SettingsTab';
import './TimelinePage.css';

interface RawRequest {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
}

interface RecordingMetadata {
    recordingId: string;
    timestamp: number;
    eventCount: number;
}

function TimelinePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [jsonView, setJsonView] = useState<'parsed' | 'raw'>('parsed');
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'session-replay');
    const [requests, setRequests] = useState<RawRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RawRequest | null>(null);
    const [recordingIds, setRecordingIds] = useState<RecordingMetadata[]>([]);
    const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
    const [selectedReplayEvents, setSelectedReplayEvents] = useState<any[]>([]);
    const [loadingRecordings, setLoadingRecordings] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const savedTheme = localStorage.getItem('themeMode') || 'auto';
    const [themeMode, setThemeMode] = useState<{ label: string; value: string }>({
        label: savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1),
        value: savedTheme
    });

    useEffect(() => {
        const mode = themeMode.value as Mode;
        applyMode(mode);
        localStorage.setItem('themeMode', themeMode.value);
    }, [themeMode]);

    const fetchRequests = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/requests');
            const data: RawRequest[] = await response.json();
            setRequests(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        }
    };

    const fetchRecordingIds = async () => {
        try {
            setLoadingRecordings(true);
            const startTime = Date.now();
            const response = await fetch('http://localhost:3000/api/session-replay/ids');
            const data: RecordingMetadata[] = await response.json();

            const elapsed = Date.now() - startTime;
            const minDelay = 500;
            if (elapsed < minDelay) {
                await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
            }

            setRecordingIds(data);
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
            const response = await fetch(`http://localhost:3000/api/session-replay/${recordingId}`);
            const events: any[] = await response.json();

            if (initialLoad) {
                const elapsed = Date.now() - startTime;
                const minDelay = 500;
                if (elapsed < minDelay) {
                    await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
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

    useEffect(() => {
        if (selectedRecordingId) {
            fetchRecordingEvents(selectedRecordingId);
        }
    }, [selectedRecordingId]);

    useEffect(() => {
        fetchRequests();
        fetchRecordingIds();
    }, []);

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
                        { id: 'payloads', label: 'Payloads' },
                        { id: 'settings', label: 'Settings' }
                    ]}
                />
            </div>

            {activeTab === 'session-replay' && (
                <SessionReplayTab
                    recordingIds={recordingIds}
                    selectedRecordingId={selectedRecordingId}
                    selectedReplayEvents={selectedReplayEvents}
                    loadingRecordings={loadingRecordings}
                    loadingEvents={loadingEvents}
                    onSelectRecording={setSelectedRecordingId}
                    onEventClick={(event, idx) => {
                        setSelectedEvent({
                            event: {
                                id: String(idx),
                                type: 'rrweb',
                                timestamp: event.timestamp,
                                details: event
                            }
                        });
                        setSelectedRequest(null);
                        setModalVisible(true);
                    }}
                />
            )}

            {activeTab === 'payloads' && (
                <PayloadsTab
                    requests={requests}
                    onRequestClick={(request) => {
                        setSelectedRequest(request);
                        setSelectedEvent(null);
                        setModalVisible(true);
                    }}
                />
            )}

            {activeTab === 'settings' && (
                <SettingsTab themeMode={themeMode} onThemeChange={setThemeMode} />
            )}

            <Modal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                size="max"
                header={
                    selectedEvent
                        ? selectedEvent.event.type
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
                                    const data = selectedEvent ? selectedEvent.event : selectedRequest;
                                    const json = jsonView === 'parsed'
                                        ? JSON.stringify(recursiveParse(data), null, 2)
                                        : JSON.stringify(data, null, 2);
                                    navigator.clipboard.writeText(json);
                                }}
                            >
                                Copy
                            </Button>
                            <Button variant="primary" onClick={() => setModalVisible(false)}>
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
                            onChange={({ detail }) => setJsonView(detail.selectedId as 'parsed' | 'raw')}
                            options={[
                                { id: 'parsed', text: 'Parsed' },
                                { id: 'raw', text: 'Raw' }
                            ]}
                        />
                        <pre className="json-viewer">
                            {jsonView === 'parsed'
                                ? JSON.stringify(
                                      recursiveParse(selectedEvent ? selectedEvent.event : selectedRequest),
                                      null,
                                      2
                                  )
                                : JSON.stringify(
                                      selectedEvent ? selectedEvent.event : selectedRequest,
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
