import { useEffect, useState, useCallback } from 'react';
import echo from '@/echo';

/**
 * Custom React hook for real-time WebSocket student attendance monitoring.
 *
 * @param {number|string|null} sessionId - The active attendance session ID
 * @param {Object} options - Optional callbacks
 * @param {Function} [options.onRecordCreated] - Callback when a student marks attendance
 */
export function useAttendanceMonitor(sessionId, options = {}) {
    const { onRecordCreated } = options;
    const [records, setRecords] = useState([]);
    const [lastCheckIn, setLastCheckIn] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const clearRecords = useCallback(() => {
        setRecords([]);
        setLastCheckIn(null);
    }, []);

    useEffect(() => {
        if (!sessionId) {
            setIsConnected(false);
            return;
        }

        const channelName = `attendance.session.${sessionId}`;
        const channel = echo.private(channelName);

        setIsConnected(true);

        // Listen for student attendance status / check-in events
        channel.listen('.AttendanceRecordCreated', (data) => {
            setLastCheckIn(data);
            setRecords((prev) => {
                // Prevent duplicate entries for the same student
                const exists = prev.some(
                    (r) => r.student_id === data.student_id || r.attendance_record_id === data.attendance_record_id
                );
                if (exists) {
                    return prev.map((r) =>
                        r.student_id === data.student_id ? { ...r, ...data } : r
                    );
                }
                return [data, ...prev];
            });

            if (onRecordCreated) {
                onRecordCreated(data);
            }
        });

        return () => {
            channel.stopListening('.AttendanceRecordCreated');
            echo.leave(channelName);
            setIsConnected(false);
        };
    }, [sessionId, onRecordCreated]);

    return {
        records,
        lastCheckIn,
        isConnected,
        clearRecords,
        setRecords,
    };
}

export default useAttendanceMonitor;

