import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation
} from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import SessionReplayPage from './pages/SessionReplayPage';
import RawRequestsPage from './pages/RawRequestsPage';
import RawEventsPage from './pages/RawEventsPage';
import '@cloudscape-design/global-styles/index.css';

function AppContent() {
    const location = useLocation();

    const navigationItems = [
        {
            type: 'link' as const,
            text: 'Session Replay',
            href: '/session-replay'
        },
        {
            type: 'link' as const,
            text: 'Raw Requests',
            href: '/raw-requests'
        },
        {
            type: 'link' as const,
            text: 'Raw Events',
            href: '/raw-events'
        }
    ];

    // Determine active navigation item
    const activeHref =
        location.pathname === '/raw-requests'
            ? '/raw-requests'
            : location.pathname === '/raw-events'
            ? '/raw-events'
            : '/session-replay';

    return (
        <AppLayout
            navigation={
                <SideNavigation
                    header={{ text: 'AWS RUM WebUI', href: '/' }}
                    items={navigationItems}
                    activeHref={activeHref}
                />
            }
            toolsHide
            content={
                <Routes>
                    <Route
                        path="/"
                        element={<Navigate to="/session-replay" replace />}
                    />
                    <Route
                        path="/session-replay"
                        element={<SessionReplayPage />}
                    />
                    <Route path="/raw-requests" element={<RawRequestsPage />} />
                    <Route path="/raw-events" element={<RawEventsPage />} />
                </Routes>
            }
        />
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
