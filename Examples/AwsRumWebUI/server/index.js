import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.text());
app.use(express.raw());

app.all('/appmonitors/:appmonitorId', (req, res) => {
    const requestEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        appmonitorId: req.params.appmonitorId,
        headers: req.headers,
        body: req.body,
        query: req.query
    };

    // 1. Write full request to requests.jsonl
    fs.appendFile(
        path.join(__dirname, 'api/requests.jsonl'),
        JSON.stringify(requestEntry) + '\n',
        (err) => {
            if (err) console.error('Failed to write request:', err);
        }
    );

    // 2. Process individual RUM events if present
    if (req.body && req.body.RumEvents && Array.isArray(req.body.RumEvents)) {
        const { AppMonitorDetails, UserDetails } = req.body;

        req.body.RumEvents.forEach((event) => {
            const eventEntry = {
                appmonitorId: req.params.appmonitorId,
                requestTimestamp: requestEntry.timestamp,
                sessionId: UserDetails?.sessionId,
                userId: UserDetails?.userId,
                appMonitorId: AppMonitorDetails?.id,
                event: event
            };

            if (event.type === 'com.amazon.rum.rrweb') {
                // 3. Write session replay events to session-replay-events.jsonl
                let sessionReplayData;
                try {
                    const details =
                        typeof event.details === 'string'
                            ? JSON.parse(event.details)
                            : event.details;
                    sessionReplayData = {
                        sessionId: UserDetails?.sessionId,
                        recordingId: details.recordingId || event.id,
                        timestamp: event.timestamp,
                        events: details.events || [],
                        metadata: details.metadata || {}
                    };
                } catch (err) {
                    console.error(
                        'Failed to parse session replay details:',
                        err
                    );
                    sessionReplayData = {
                        sessionId: UserDetails?.sessionId,
                        recordingId: event.id,
                        timestamp: event.timestamp,
                        events: [],
                        metadata: {},
                        rawDetails: event.details
                    };
                }

                fs.appendFile(
                    path.join(__dirname, 'api/sessionreplay.jsonl'),
                    JSON.stringify(sessionReplayData) + '\n',
                    (err) => {
                        if (err)
                            console.error(
                                'Failed to write session replay event:',
                                err
                            );
                    }
                );
            }

            // Write individual to events.jsonl
            fs.appendFile(
                path.join(__dirname, 'api/events.jsonl'),
                JSON.stringify(eventEntry) + '\n',
                (err) => {
                    if (err) console.error('Failed to write log event:', err);
                }
            );
        });
    }

    res.status(202).json({ success: true });
});

app.get('/api/requests', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/requests.jsonl'),
            'utf8'
        );
        const requests = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line));
        res.json(requests);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/events', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/events.jsonl'),
            'utf8'
        );
        const logs = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line));
        res.json(logs);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/session-replay', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/sessionreplay.jsonl'),
            'utf8'
        );
        const events = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line));
        res.json(events);
    } catch (err) {
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});
