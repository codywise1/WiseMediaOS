import React from 'react';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface NotesProps {
  currentUser: User | null;
}

export default function Notes({ currentUser }: NotesProps) {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
          Notes
        </h1>
        <p className="text-gray-300">Notes feature coming soon...</p>
      </div>
    </div>
  );
}
