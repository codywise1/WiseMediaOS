import { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { Send, Hash, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Channel {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

interface PrivateConversation {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  unreadCount: number;
}

export default function CommunityPage() {
  const { profile } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'channels' | 'private'>('channels');
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<PrivateConversation | null>(null);
  const [privateMessages, setPrivateMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannels();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
      const subscription = supabase
        .channel(`chat:${selectedChannel.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${selectedChannel.id}`,
        }, () => {
          fetchMessages();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedChannel]);

  useEffect(() => {
    if (selectedUser && profile) {
      fetchPrivateMessages();
      const subscription = supabase
        .channel(`private:${profile.id}:${selectedUser.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        }, () => {
          fetchPrivateMessages();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedUser, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateMessages]);

  async function fetchChannels() {
    const { data } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('type', 'general')
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setChannels(data);
      setSelectedChannel(data[0]);
    }
  }

  async function fetchAllUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .neq('id', profile?.id || '');

    if (data) {
      const conversations = data.map(user => ({
        ...user,
        unreadCount: 0,
      }));
      setPrivateConversations(conversations);
    }
  }

  async function fetchMessages() {
    if (!selectedChannel) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  async function fetchPrivateMessages() {
    if (!selectedUser || !profile) return;

    const { data } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setPrivateMessages(data);

    await supabase
      .from('private_messages')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('sender_id', selectedUser.id)
      .eq('read', false);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !profile) return;

    setSending(true);
    try {
      if (view === 'channels' && selectedChannel) {
        await supabase.from('chat_messages').insert({
          channel_id: selectedChannel.id,
          user_id: profile.id,
          message: newMessage.trim(),
        });
      } else if (view === 'private' && selectedUser) {
        await supabase.from('private_messages').insert({
          sender_id: profile.id,
          recipient_id: selectedUser.id,
          message: newMessage.trim(),
        });
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400';
      case 'elite': return 'text-yellow-400';
      case 'pro': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col lg:flex-row gap-6">
      <div className="lg:w-80 flex-shrink-0">
        <GlassCard className="h-full flex flex-col">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setView('channels')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium ${
                view === 'channels'
                  ? 'bg-[#3AA3EB] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
            >
              <Hash className="inline mr-2" size={16} />
              Channels
            </button>
            <button
              onClick={() => setView('private')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium ${
                view === 'private'
                  ? 'bg-[#3AA3EB] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
            >
              <MessageSquare className="inline mr-2" size={16} />
              Direct
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {view === 'channels' ? (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedChannel?.id === channel.id
                      ? 'bg-[#3AA3EB]/20 border border-[#3AA3EB]/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Hash size={16} className={selectedChannel?.id === channel.id ? 'text-[#3AA3EB]' : 'text-gray-400'} />
                    <span className="text-white font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                      {channel.name}
                    </span>
                  </div>
                  {channel.description && (
                    <p className="text-gray-400 text-xs ml-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {channel.description}
                    </p>
                  )}
                </button>
              ))
            ) : (
              privateConversations.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedUser?.id === user.id
                      ? 'bg-[#3AA3EB]/20 border border-[#3AA3EB]/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(user.full_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {user.full_name}
                        </span>
                        <span className={`text-xs font-bold ${getRoleBadgeColor(user.role)}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <GlassCard className="flex-1 flex flex-col overflow-hidden">
          <div className="pb-4 border-b border-white/10">
            {view === 'channels' && selectedChannel ? (
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                  <Hash size={24} className="text-[#3AA3EB]" />
                  {selectedChannel.name}
                </h2>
                {selectedChannel.description && (
                  <p className="text-gray-400 text-sm mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {selectedChannel.description}
                  </p>
                )}
              </div>
            ) : view === 'private' && selectedUser ? (
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {getInitials(selectedUser.full_name)}
                  </div>
                )}
                <div>
                  <h2 className="text-white font-bold text-xl" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                    {selectedUser.full_name}
                  </h2>
                  <p className={`text-sm font-bold ${getRoleBadgeColor(selectedUser.role)}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {selectedUser.role.toUpperCase()}
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="text-white font-bold text-xl" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                Select a {view === 'channels' ? 'channel' : 'conversation'}
              </h2>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {view === 'channels' && messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                {msg.profiles?.avatar_url ? (
                  <img
                    src={msg.profiles?.avatar_url}
                    alt={msg.profiles?.full_name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitials(msg.profiles?.full_name || 'User')}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-white font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {msg.profiles?.full_name || 'User'}
                    </span>
                    <span className={`text-xs font-bold ${getRoleBadgeColor(msg.profiles?.role || 'free')}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {msg.profiles?.role?.toUpperCase() || 'FREE'}
                    </span>
                    <span className="text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}

            {view === 'private' && privateMessages.map((msg) => {
              const isMyMessage = msg.sender_id === profile?.id;

              return (
                <div key={msg.id} className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                  {!isMyMessage && selectedUser && (
                    selectedUser.avatar_url ? (
                      <img
                        src={selectedUser.avatar_url}
                        alt={selectedUser.full_name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-[#3AA3EB] to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {getInitials(selectedUser.full_name)}
                      </div>
                    )
                  )}
                  <div className={`flex-1 max-w-lg ${isMyMessage ? 'flex flex-col items-end' : ''}`}>
                    <div className={`p-3 rounded-lg ${
                      isMyMessage
                        ? 'bg-[#3AA3EB] text-white'
                        : 'bg-white/10 text-gray-300'
                    }`}>
                      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                        {msg.message}
                      </p>
                    </div>
                    <span className="text-gray-500 text-xs mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {((view === 'channels' && selectedChannel) || (view === 'private' && selectedUser)) && (
            <div className="pt-4 border-t border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${view === 'channels' ? `#${selectedChannel?.name}` : selectedUser?.full_name}...`}
                  className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-6 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-lg transition-colors font-medium shadow-lg flex items-center gap-2"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  <Send size={20} />
                  Send
                </button>
              </form>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
