import React from 'react';
import { useAttendanceMonitor } from '@/Hooks/useAttendanceMonitor';
import {
    CheckCircleIcon,
    ClockIcon,
    SignalIcon,
    ShieldCheckIcon,
    UserCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Live Attendance Monitor Component
 * Displays real-time WebSocket attendance feed for active class sessions.
 */
export default function LiveAttendanceMonitor({
    sessionId,
    courseTitle = 'Course Session',
    roomName = 'Assigned Room',
    sessionStatus = 'active',
    totalStudents = 0,
    initialRecords = [],
    onClose,
}) {
    const { records, lastCheckIn, isConnected } = useAttendanceMonitor(
        sessionId,
        {
            onRecordCreated: (data) => {
                console.log('[WebSocket] Live Student Check-in:', data);
            },
        }
    );

    // Merge initial and real-time records
    const allRecords = React.useMemo(() => {
        const map = new Map();
        initialRecords.forEach((r) => map.set(r.student_id, r));
        records.forEach((r) => map.set(r.student_id, r));
        return Array.from(map.values());
    }, [initialRecords, records]);

    const presentCount = allRecords.filter((r) => r.status === 'present').length;
    const lateCount = allRecords.filter((r) => r.status === 'late').length;
    const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header with Connection & Status */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-800/50 dark:to-slate-850">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse">
                            <SignalIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {sessionStatus.toUpperCase()}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${isConnected
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                        >
                            <SignalIcon className="w-3.5 h-3.5" />
                            {isConnected ? 'Reverb WebSocket Live' : 'Connecting...'}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-850 dark:text-white">{courseTitle}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{roomName} • Session #{sessionId}</p>
                </div>

                {/* Live Counters */}
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Present</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{presentCount}</p>
                    </div>
                    {totalStudents > 0 && (
                        <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enrolled</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalStudents}</p>
                        </div>
                    )}
                    <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rate</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{attendancePercentage}%</p>
                    </div>
                </div>
            </div>

            {/* Latest Live Check-in Toast Banner */}
            {lastCheckIn && (
                <div className="mx-6 mt-4 p-3 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                            {lastCheckIn.student?.first_name?.[0] || 'S'}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                                {lastCheckIn.student?.full_name || `Student ID: ${lastCheckIn.student_id}`} just verified!
                            </p>
                            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                                {lastCheckIn.face_verified && (
                                    <span className="flex items-center gap-0.5">
                                        <ShieldCheckIcon className="w-3.5 h-3.5" /> Face Verified
                                    </span>
                                )}
                                {lastCheckIn.rssi && <span>RSSI: {lastCheckIn.rssi} dBm</span>}
                            </div>
                        </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300">
                        {new Date(lastCheckIn.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
            )}

            {/* Live Student Feed */}
            <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <UserCircleIcon className="w-4 h-4 text-indigo-500" />
                    Live Verified Students ({allRecords.length})
                </h3>

                {allRecords.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <SignalIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 animate-pulse" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Waiting for students to check in...</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            WebSocket is active and listening for BLE & facial detections.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-1">
                        {allRecords.map((record) => (
                            <div
                                key={record.attendance_record_id || record.student_id}
                                className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {record.student?.profile_picture ? (
                                        <img
                                            src={record.student.profile_picture}
                                            alt={record.student.full_name}
                                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                                            {record.student?.first_name?.[0] || 'S'}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-850 dark:text-white">
                                            {record.student?.full_name || `Student #${record.student_id}`}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            ID: {record.student?.user_id || record.student_id}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {record.face_verified && (
                                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                            Face Match
                                        </span>
                                    )}
                                    {record.rssi && (
                                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            {record.rssi} dBm
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                        {record.status?.toUpperCase() || 'PRESENT'}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                        {record.verified_at ? new Date(record.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
