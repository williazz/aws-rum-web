# AWS RUM Web UI - Development Tool

## Overview

React + Express development tool for debugging the CloudWatch RUM web client locally.

## Architecture

### Backend (Express - Port 3000)

-   Intercepts RUM client requests at `/appmonitors/:appmonitorId`
-   Writes data to three JSONL files:
    -   `server/api/requests.jsonl` - Full HTTP requests
    -   `server/api/events.jsonl` - Individual RUM events
    -   `server/api/sessionreplay.jsonl` - rrweb session replay events
-   Serves data via `/api/requests`, `/api/events`, `/api/sessionreplay`

### Frontend (React + Vite - Port 5173)

Built with AWS Cloudscape Design System

#### Three Main Tabs

1. **Sessions** (default) - 3-column layout:

    - Left: Session list with ID, event count, duration, timestamp
    - Center: Placeholder for session replay module
    - Right: Event list with colored markers, timestamps (HH:MM:SS), size

2. **Payloads** - List of raw HTTP requests from `/api/requests`

3. **Settings** - Theme mode selector (Auto/Light/Dark)

#### Features

-   **Deep linking**: Tabs accessible via `?tab=sessions|payloads|settings`
-   **Theme persistence**: Stored in localStorage, uses Cloudscape's `applyMode`
-   **Event modal**: Click any event/request to view JSON
    -   Parsed view: Recursively parses stringified JSON fields
    -   Raw view: Original data
    -   Copy and Close buttons
-   **Auto-refresh**: Polls data every 5 seconds
-   **Timestamp handling**: Auto-converts Unix seconds to milliseconds

## Key Files

-   `src/pages/TimelinePage.tsx` - Main component
-   `src/pages/TimelinePage.css` - Custom styles using Cloudscape CSS variables
-   `server/index.js` - Express server with CORS and request capture

## Development

```bash
npm run dev  # Starts both server (3000) and client (5173)
npm run server  # Server only
npm run client  # Client only
```

## Usage

1. Point RUM client to `http://localhost:3000`
2. View captured data at `http://localhost:5173`
3. Click events to inspect JSON details
4. Switch themes in Settings tab
