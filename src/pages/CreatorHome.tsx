import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon, PlayCircleIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';

export default function CreatorHome() {
  const navigate = useNavigate();

  const shortcuts = [
    { title: 'Courses', description: 'Browse the catalog and pick up where you left off.', icon: PlayCircleIcon, action: () => navigate('/community/courses') },
    { title: 'Lessons', description: 'Resume your last lesson and revisit quick notes.', icon: SparklesIcon, action: () => navigate('/community/courses/1') },
    { title: 'Club', description: 'Jump into the Creator Club chat.', icon: ChatBubbleOvalLeftIcon, action: () => navigate('/community') },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8AB5EB] font-medium">Creator Club</p>
            <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
              Welcome back, Creator
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Jump into your courses, resources, and community. Keep your creative flow with clear shortcuts.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white">
            <SparklesIcon className="h-5 w-5 text-[#8AB5EB]" />
            <span className="text-sm">Creator mode active</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {shortcuts.map(item => (
          <button
            key={item.title}
            onClick={item.action}
            className="glass-card w-full text-left rounded-xl p-4 border border-white/10 hover:border-[#8AB5EB]/60 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#8AB5EB]/15 flex items-center justify-center text-[#8AB5EB]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-white font-semibold">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
