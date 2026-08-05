import { MentionUser } from '../hooks/useMentionInput';

interface Props {
  users: MentionUser[];
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
}

function getInitials(name: string | null) {
  return (name ?? 'U').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function MentionDropdown({ users, selectedIndex, onSelect }: Props) {
  if (users.length === 0) return null;
  return (
    <div className="absolute bottom-full mb-1 left-0 z-50 bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
      {users.map((user, i) => (
        <button
          key={user.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(user); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all ${
            i === selectedIndex ? 'bg-[#3aa3eb]/20 text-white' : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#3aa3eb]/20 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-[#3aa3eb]">
              {getInitials(user.full_name)}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium truncate">{user.full_name}</span>
            <span className={`ml-1.5 text-[10px] font-bold ${
              user.role === 'admin' ? 'text-[#3aa3eb]' : 'text-gray-500'
            }`}>{user.role.toUpperCase()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
