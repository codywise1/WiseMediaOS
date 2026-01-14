import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    VideoCameraIcon,
    PhoneIcon,
    UserGroupIcon,
    DocumentTextIcon,
    PlayCircleIcon,
    PencilSquareIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import { Meeting, UserRole } from '../lib/supabase';

interface MeetingCardProps {
    meeting: Meeting;
    currentUserRole?: UserRole;
    onJoin?: (meeting: Meeting) => void;
    onViewDetails?: (meeting: Meeting) => void;
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
    onDelete
}: MeetingCardProps) {
    const TypeIcon = typeIcons[meeting.type] || VideoCameraIcon;
    const isLive = meeting.status === 'live';
    const isAdmin = currentUserRole === 'admin';

    const [relativeTime, setRelativeTime] = useState<string>('');

    useEffect(() => {
        const updateTime = () => {
            const target = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
            const now = new Date();
            const diff = target.getTime() - now.getTime();

            if (diff > 24 * 60 * 60 * 1000) {
                const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                setRelativeTime(`Starts in ${days} ${days === 1 ? 'day' : 'days'}`);
            } else if (diff > 60 * 60 * 1000) {
                const hours = Math.floor(diff / (60 * 60 * 1000));
                setRelativeTime(`Starts in ${hours} ${hours === 1 ? 'hour' : 'hours'}`);
            } else if (diff > 0) {
                const minutes = Math.floor(diff / (60 * 1000));
                const seconds = Math.floor((diff % (60 * 1000)) / 1000);
                setRelativeTime(`Starts in ${minutes}:${seconds.toString().padStart(2, '0')}`);
            } else {
                if (meeting.status === 'live') {
                    setRelativeTime('Live now');
                } else {
                    setRelativeTime(format(target, 'MMM d, yyyy • h:mm a'));
                }
            }
        };

        updateTime();
        const intervalId = setInterval(updateTime, 1000);
        return () => clearInterval(intervalId);
    }, [meeting.meeting_date, meeting.meeting_time, meeting.status]);

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div
            className="glass-card rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all group cursor-pointer p-6"
            onClick={() => onViewDetails?.(meeting)}
        >
            <div className="flex items-start gap-6">
                {/* Icon Container - Left Side */}
                <div className={`p-3.5 rounded-lg shrink-0 ${isLive ? 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-blue-500/20'}`}>
                    <TypeIcon className={`h-6 w-6 ${isLive ? 'text-red-400' : 'text-blue-400'}`} />
                </div>

                {/* Content - Right Side */}
                <div className="flex-1 min-w-0">
                    {/* Title and Edit Button Row */}
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors truncate" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {meeting.title}
                        </h3>
                        {isAdmin && onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(meeting); }}
                                className="p-1 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete meeting"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Client and Project Info */}
                    <p className="text-gray-400 mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', lineHeight: '1.6' }}>
                        {meeting.client?.name || 'No Client'}
                        {meeting.project && (
                            <span className="block text-gray-500 mt-1">Project: {meeting.project.name}</span>
                        )}
                    </p>

                    {/* Status Badge and Indicators - Moved above separator */}
                    <div className="flex items-center gap-3 mb-6">
                        {(() => {
                            const statusStyles: Record<string, { bg: string, border: string, text: string, pulse?: boolean }> = {
                                scheduled: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                                live: { bg: 'rgba(239, 68, 68, 0.33)', border: 'rgba(239, 68, 68, 1)', text: '#ffffff', pulse: true },
                                processing: { bg: 'rgba(234, 179, 8, 0.33)', border: 'rgba(234, 179, 8, 1)', text: '#ffffff' },
                                ready: { bg: 'rgba(34, 197, 94, 0.33)', border: 'rgba(34, 197, 94, 1)', text: '#ffffff' },
                                shared: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                                archived: { bg: 'rgba(148, 163, 184, 0.33)', border: 'rgba(148, 163, 184, 1)', text: '#ffffff' },
                                default: { bg: 'rgba(148, 163, 184, 0.33)', border: 'rgba(148, 163, 184, 1)', text: '#ffffff' }
                            };
                            const style = statusStyles[meeting.status.toLowerCase()] || statusStyles.default;
                            return (
                                <span
                                    className={`px-3 py-1 rounded-full text-sm inline-block ${style.pulse ? 'animate-pulse' : ''}`}
                                    style={{
                                        backgroundColor: style.bg,
                                        border: `1px solid ${style.border}`,
                                        color: style.text,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontSize: '14px'
                                    }}
                                >
                                    {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                                </span>
                            );
                        })()}

                        {/* Indicator Icons */}
                        <div className="flex items-center gap-2">
                            {meeting.recording_id && (
                                <PlayCircleIcon className="h-4 w-4 text-gray-500" title="Recording available" />
                            )}
                            {meeting.transcript_id && (
                                <DocumentTextIcon className="h-4 w-4 text-gray-500" title="Transcript ready" />
                            )}
                            {meeting.notes_id && (
                                <PencilSquareIcon className="h-4 w-4 text-gray-500" title="Notes added" />
                            )}
                        </div>
                    </div>

                    {/* Date and Actions Section - Below separator */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-5">
                        {/* Date and Duration */}
                        <div className="flex items-center gap-2 text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            <span className={meeting.status === 'live' ? 'text-red-400 font-bold' : ''}>
                                {relativeTime}
                            </span>
                            <span className="text-gray-700 mx-1">•</span>
                            <span>{formatDuration(meeting.duration_minutes)}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {isLive && onJoin && (
                                <button
                                    onClick={() => onJoin(meeting)}
                                    className="px-5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full text-xs font-bold transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-2"
                                >
                                    <VideoCameraIcon className="h-3.5 w-3.5" />
                                    Join Now
                                </button>
                            )}
                            {!isLive && meeting.status === 'scheduled' && onJoin && (
                                <button
                                    onClick={() => onJoin(meeting)}
                                    className="px-5 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold transition-all flex items-center gap-2 group/btn"
                                >
                                    Join
                                    <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
