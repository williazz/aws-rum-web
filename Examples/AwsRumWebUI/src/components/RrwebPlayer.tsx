import { useEffect, useRef } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

interface RrwebPlayerProps {
    events: any[];
    onTimeUpdate?: (timestamp: number) => void;
}

export function RrwebPlayer({ events, onTimeUpdate }: RrwebPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || events.length === 0) return;

        const sortedEvents = [...events]
            .filter((e) => e && typeof e.type === 'number' && e.timestamp)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (sortedEvents.length === 0) return;

        // Clear container
        containerRef.current.innerHTML = '';

        // Create player
        playerRef.current = new rrwebPlayer({
            target: containerRef.current,
            props: {
                events: sortedEvents,
                logConfig: {
                    level: ['error'], // Suppress warning logs
                },
            }
        });

        // Set up time update listener
        if (onTimeUpdate && playerRef.current) {
            const interval = setInterval(() => {
                if (playerRef.current?.getReplayer) {
                    const replayer = playerRef.current.getReplayer();
                    if (replayer) {
                        const currentTime = replayer.getCurrentTime();
                        onTimeUpdate(currentTime);
                    }
                }
            }, 100); // Update every 100ms

            return () => {
                clearInterval(interval);
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }
                playerRef.current = null;
            };
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            playerRef.current = null;
        };
    }, [events, onTimeUpdate]);

    return <div ref={containerRef} />;
}
