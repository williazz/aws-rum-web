import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Box from '@cloudscape-design/components/box';

interface RawRequest {
    timestamp: string;
    method: string;
    appmonitorId: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
}

interface PayloadsTabProps {
    requests: RawRequest[];
    onRequestClick: (request: RawRequest) => void;
}

export function PayloadsTab({ requests, onRequestClick }: PayloadsTabProps) {
    return (
        <div className="payloads-layout">
            <Container header={<Header variant="h2">Request Payloads</Header>}>
                <div className="events-list">
                    {requests.map((request, idx) => {
                        const requestSize = new Blob([JSON.stringify(request)]).size / 1024;

                        return (
                            <div key={idx} className="event-item" onClick={() => onRequestClick(request)}>
                                <div className="event-marker" style={{ backgroundColor: '#0972d3' }} />
                                <div className="event-content">
                                    <Box variant="strong" fontSize="body-s">
                                        {request.method} {request.appmonitorId}
                                    </Box>
                                    <Box variant="small" color="text-body-secondary">
                                        {new Date(request.timestamp).toLocaleString()} • {requestSize.toFixed(2)} KB
                                    </Box>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Container>
        </div>
    );
}
