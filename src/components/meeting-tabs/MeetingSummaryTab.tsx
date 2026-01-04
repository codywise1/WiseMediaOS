import React, { useState } from 'react';
import {
    SparklesIcon,
    PencilSquareIcon,
    CheckIcon,
    LockClosedIcon,
    GlobeAltIcon,
    ClipboardIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Meeting } from '../../lib/supabase';

interface MeetingSummaryTabProps {
    meeting: Meeting;
    currentUserRole: string;
}

// Mock summary data
const MOCK_SUMMARY = {
    internal: "Client is hesitant about the budget increase. Need to demonstrate value of the add-ons clearly. They mentioned a competitor offering for $2k less.",
    client_safe: "Discussed project progress and upcoming milestones. Agreed on the font changes and color saturation adjustments. Reviewed the timeline for the beta launch.",
    decisions: [
        "Approved color palette modification (increased saturation)",
        "Confirmed Montserrat as body font",
        "Beta launch set for Feb 15th"
    ],
    action_items: [
        { text: "Update figma mockups", assignee: "Designer", due: "Tomorrow" },
        { text: "Send updated contract", assignee: "Admin", due: "Friday" },
        { text: "Review competitor pricing", assignee: "Admin", due: "Internal Only" }
    ],
    risks: "Potential delay if client doesn't approve wireframes by Friday."
};

export default function MeetingSummaryTab({ meeting, currentUserRole }: MeetingSummaryTabProps) {
    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'staff';
    const [isEditing, setIsEditing] = useState(false);

    if (!meeting.summary_id && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-gray-400">Summary not yet available.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* AI Header */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <SparklesIcon className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 text-purple-400" />
                            AI Summary
                        </h3>
                        {isAdmin && (
                            <button
                                className="text-xs text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full hover:bg-purple-500/20 transition-colors"
                            >
                                Regenerate
                            </button>
                        )}
                    </div>
                    <p className="text-gray-400 max-w-2xl">
                        Generated based on the meeting transcript. Reviewed by Wise Media team.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Internal Summary (Admin Only) */}
                    {isAdmin && (
                        <div className="glass-card rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                            <div className="px-6 py-4 border-b border-red-500/10 flex justify-between items-center bg-red-500/10">
                                <h4 className="font-bold text-red-200 flex items-center gap-2">
                                    <LockClosedIcon className="h-4 w-4" />
                                    Internal Notes
                                </h4>
                                <span className="text-[10px] uppercase font-bold text-red-300/70 tracking-wider">Private</span>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-300 leading-relaxed text-sm">
                                    {MOCK_SUMMARY.internal}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Client Facing Summary */}
                    <SummarySection
                        title="Meeting Overview"
                        icon={GlobeAltIcon}
                        content={MOCK_SUMMARY.client_safe}
                        color="blue"
                    />

                    {/* Decisions */}
                    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h4 className="font-bold text-white flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-400" />
                                Decisions Made
                            </h4>
                        </div>
                        <div className="p-6">
                            <ul className="space-y-3">
                                {MOCK_SUMMARY.decisions.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <CheckIcon className="h-3 w-3 text-emerald-400" />
                                        </span>
                                        <span className="text-gray-300 text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Action Items */}
                    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                            <h4 className="font-bold text-white">Action Items</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {MOCK_SUMMARY.action_items.map((item, i) => (
                                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" className="mt-1 rounded border-gray-600 bg-slate-800 text-blue-500 focus:ring-offset-slate-900" />
                                        <div>
                                            <p className="text-sm text-gray-200 font-medium">{item.text}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-xs text-gray-500">{item.assignee}</span>
                                                <span className="text-xs text-gray-600">•</span>
                                                <span className="text-xs text-blue-400">{item.due}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Risks (Admin Only) */}
                    {isAdmin && (
                        <div className="glass-card rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                            <div className="px-6 py-4 border-b border-amber-500/10 flex items-center gap-2 bg-amber-500/10">
                                <ExclamationTriangleIcon className="h-4 w-4 text-amber-400" />
                                <h4 className="font-bold text-amber-200">Risks & Flags</h4>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-300">{MOCK_SUMMARY.risks}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummarySection({ title, icon: Icon, content, color }: any) {
    return (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h4 className="font-bold text-white flex items-center gap-2">
                    <Icon className={`h-4 w-4 text-${color}-400`} />
                    {title}
                </h4>
                <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ClipboardIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="p-6">
                <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                    {content}
                </p>
            </div>
        </div>
    );
}
