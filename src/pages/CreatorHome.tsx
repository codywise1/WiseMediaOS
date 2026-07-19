import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon, PlayCircleIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getLastName(fullName?: string | null) {
  if (!fullName?.trim()) return 'Wise';
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1];
}

export default function CreatorHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const shortcuts = [
    { title: 'Courses', description: 'Browse the catalog and pick up where you left off.', icon: PlayCircleIcon, action: () => navigate('/community/courses') },
    { title: 'Lessons', description: 'Resume your last lesson and revisit quick notes.', icon: SparklesIcon, action: () => navigate('/community/courses/1') },
    { title: 'Club', description: 'Jump into the Creator Club chat.', icon: ChatBubbleOvalLeftIcon, action: () => navigate('/community') },
  ];

  const greeting = `${getGreeting()}, Mr. ${getLastName(profile?.full_name)}`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Creator Club"
        subtitle={`${greeting} — jump into your courses, resources, and community.`}
        icon={<SparklesIcon className="h-5 w-5" />}
      />

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
                  <p className="text-white font-semibold font-body">{item.title}</p>
                  <p className="text-xs text-gray-400 font-body">{item.description}</p>
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
