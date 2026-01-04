import React from 'react';
import { format } from 'date-fns';
import {
    VideoCameraIcon,
    PhoneIcon,
    UserGroupIcon,
    DocumentTextIcon,
    PlayCircleIcon,
    ShareIcon,
    PencilSquareIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { Meeting, MeetingStatus, UserRole } from '../lib/supabase';
import { meetingStatusColors } from '../lib/statusColors';

interface MeetingCardProps {
    meeting: Meeting;
    currentUserRole?: UserRole;
    onJoin?: (meeting: Meeting) => void;
    onViewDetails?: (meeting: Meeting) => void;
    onShare?: (meeting: Meeting) => void;
    onDelete?: (meeting: Meeting) => void;
}

const typeIcons = {
    video: VideoCameraIcon,
    phone: PhoneIcon,
    'in-person': UserGroupIcon,
};

export default function MeetingCard({
    meeting,
    currentUserRole,
    onJoin,
    onViewDetails,
    onShare,
    onDelete
}: MeetingCardProps) {
    const TypeIcon = typeIcons[meeting.type] || VideoCameraIcon;
    const isLive = meeting.status === 'live';
    const isAdmin = currentUserRole === 'admin';

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div
            className="glass-card rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all group p-5 flex flex-col gap-4 cursor-pointer"
            onClick={() => onViewDetails?.(meeting)}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${isLive ? 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' : ''}`}>
                        <TypeIcon className={`h-5 w-5 ${isLive ? 'text-red-400' : 'text-blue-300'}`} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-lg text-white truncate group-hover:text-blue-300 transition-colors">
                            {meeting.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="truncate">{meeting.client?.name || 'No Client'}</span>
                            {meeting.project && (
                                <>
                                    <span className="text-gray-600">•</span>
                                    <span className="truncate">{meeting.project.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${meetingStatusColors[meeting.status]}`}>
                    {meeting.status === 'live' ? 'LIVE' : meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                    <span className="tabular-nums">
                        {format(new Date(`${meeting.meeting_date}T${meeting.meeting_time}`), 'MMM d, yyyy • h:mm a')}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span>{formatDuration(meeting.duration_minutes)}</span>
                </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    {meeting.recording_id && (
                        <div className="tooltip" title="Recording available">
                            <PlayCircleIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                        </div>
                    )}
                    {meeting.transcript_id && (
                        <div className="tooltip" title="Transcript ready">
                            <DocumentTextIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                        </div>
                    )}
                    {meeting.notes_id && (
                        <div className="tooltip" title="Notes added">
                            <PencilSquareIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {isLive && onJoin && (
                        <button
                            onClick={() => onJoin(meeting)}
                            className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full text-xs font-bold uppercase tracking-wide transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-2"
                        >
                            <VideoCameraIcon className="h-3.5 w-3.5" />
                            Join
                        </button>
                    )}

                    {!isLive && meeting.status === 'scheduled' && onJoin && (
                        <button
                            onClick={() => onJoin(meeting)}
                            className="px-4 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-wide transition-all"
                        >
                            Join
                        </button>
                    )}

                    {isAdmin && (
                        <>
                            {meeting.status !== 'scheduled' && meeting.status !== 'live' && onShare && (
                                <button
                                    onClick={() => onShare(meeting)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-300 transition-colors"
                                    title="Share meeting"
                                >
                                    <ShareIcon className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => onDelete?.(meeting)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete meeting"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
