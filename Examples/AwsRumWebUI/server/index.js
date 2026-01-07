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
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        appmonitorId: req.params.appmonitorId,
        headers: req.headers,
        body: req.body,
        query: req.query
    };

    fs.appendFile(
        path.join(__dirname, 'logs.jsonl'),
        JSON.stringify(logEntry) + '\n',
        (err) => {
            if (err) console.error('Failed to write log:', err);
        }
    );

    setTimeout(() => {
        res.status(202).json({ success: true });
    }, 10000);
});

app.get('/api/logs', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'logs.jsonl'),
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

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Logging requests to: ${path.join(__dirname, 'logs.jsonl')}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});
