import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Send, Hash, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseAvailable, clientService, Client } from '../lib/supabase';

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
  email?: string | null;
  avatar_url: string | null;
  role: string;
  unreadCount: number;
}

// Mock Data for Demo Mode
const mockChannels: Channel[] = [
  { id: '1', name: 'general', description: 'General discussion for all creators', type: 'general' },
  { id: '2', name: 'announcements', description: 'Official updates and news', type: 'general' },
  { id: '3', name: 'wins', description: 'Share your wins and successes!', type: 'general' },
  { id: '4', name: 'help', description: 'Get help with your projects', type: 'general' },
  { id: '5', name: 'collabs', description: 'Find people to collaborate with so you can grow together', type: 'general' },
];

const mockUsers: PrivateConversation[] = [
  { id: 'u1', full_name: 'Sarah Connor', email: 'sarah@example.com', avatar_url: null, role: 'admin', unreadCount: 2 },
  { id: 'u2', full_name: 'John Wick', email: 'john@example.com', avatar_url: null, role: 'pro', unreadCount: 0 },
  { id: 'u3', full_name: 'Tony Stark', email: 'tony@example.com', avatar_url: null, role: 'elite', unreadCount: 5 },
];

const mockChannelMessages: Record<string, Message[]> = {
  '1': [
    { id: 'm1', message: 'Welcome to the new community chat!', created_at: new Date(Date.now() - 86400000).toISOString(), profiles: { full_name: 'System', avatar_url: null, role: 'admin' } },
    { id: 'm2', message: 'This is looking great!', created_at: new Date(Date.now() - 3600000).toISOString(), profiles: { full_name: 'Sarah Connor', avatar_url: null, role: 'admin' } },
  ],
  '2': [
    { id: 'm3', message: 'New course dropping soon!', created_at: new Date().toISOString(), profiles: { full_name: 'Sarah Connor', avatar_url: null, role: 'admin' } },
  ],
};

export default function CommunityPage() {
  const { profile, user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'channels' | 'private'>('channels');
  const [clients, setClients] = useState<Client[]>([]);
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<PrivateConversation | null>(null);
  const [privateMessages, setPrivateMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [showDirectMessages, setShowDirectMessages] = useState(true);
  const [showClients, setShowClients] = useState(true);
  const [resolvedRecipientId, setResolvedRecipientId] = useState<string | null>(null);


  // Use a ref to persist mock messages during session in demo mode
  const localMessagesRef = useRef(mockChannelMessages);
  const [localUpdate, setLocalUpdate] = useState(0); // Force re-render for local mocks

  const canViewClients = (profile?.role || user?.user_metadata?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    fetchChannels();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (!canViewClients) {
      setClients([]);
      return;
    }
    fetchClients();
  }, [canViewClients]);

  async function fetchClients() {
    try {
      const data = await clientService.getAll();
      setClients(Array.from(new Map(data.map(c => [c.id, c])).values()));
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }

  // Handle direct message linking
  // Handle direct message linking
  useEffect(() => {
    const userId = searchParams.get('userId');
    const clientId = searchParams.get('clientId');

    const handleUserSelection = async (targetId: string) => {
      // First check if user is already in visible list
      const targetUser = privateConversations.find(u => u.id === targetId);
      if (targetUser) {
        setView('private');
        setSelectedUser(targetUser);
        return;
      }

      // If not, fetch them
      if (isSupabaseAvailable()) {
        const { data, error } = await supabase!
          .from('profiles')
          .select('id, full_name, email, avatar_url, role')
          .eq('id', targetId)
          .single();

        if (data && !error) {
          const newUser: PrivateConversation = { ...data, unreadCount: 0 };
          setPrivateConversations(prev => {
            const map = new Map(prev.map(u => [u.id, u] as const));
            map.set(newUser.id, newUser);
            return Array.from(map.values());
          });
          setView('private');
          setSelectedUser(newUser);
        }
      } else {
        // Demo mode fallback
        const mockUser = privateConversations.find(u => u.id === targetId);
        if (mockUser) {
          setView('private');
          setSelectedUser(mockUser);
        }
      }
    };

    if (userId) {
      handleUserSelection(userId);
    } else if (clientId) {
      if (!canViewClients) return;
      if (isSupabaseAvailable()) {
        // Resolve Client ID to User ID via Email
        supabase!
          .from('clients')
          .select('email')
          .eq('id', clientId)
          .single()
          .then(({ data: clientData }) => {
            if (clientData?.email) {
              supabase!
                .from('profiles')
                .select('id')
                .eq('email', clientData.email)
                .single()
                .then(({ data: profileData }) => {
                  if (profileData?.id) {
                    handleUserSelection(profileData.id);
                  }
                });
            }
          });
      } else {
        // Demo Mode: Link by Name or Create Mock
        const client = clients.find(c => c.id === clientId);
        if (client) {
          const matchingUser = privateConversations.find(u => u.full_name === client.name);
          if (matchingUser) {
            setView('private');
            setSelectedUser(matchingUser);
          } else {
            // Create temporary mock user for demo chat (don't add to conversations yet)
            // They'll be added when the first message is sent
            const newMockUser: PrivateConversation = {
              id: client.id,
              full_name: client.name,
              avatar_url: null,
              role: 'user',
              unreadCount: 0
            };

            setView('private');
            setSelectedUser(newMockUser);
          }
        }
      }
    }
  }, [searchParams, privateConversations, clients]);


  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
      if (!isSupabaseAvailable()) return;

      const subscription = supabase!
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
  }, [selectedChannel, localUpdate]);

  useEffect(() => {
    if (selectedUser) {
      fetchPrivateMessages();
      if (!isSupabaseAvailable()) return;
      if (!profile) return;

      let cancelled = false;
      let subscription: any;

      const setupSubscription = async () => {
        let recipientId = resolvedRecipientId || selectedUser.id;

        const client = clients.find(c => c.id === selectedUser.id);
        if (client && !resolvedRecipientId) {
          const { data: profileData } = await supabase!
            .from('profiles')
            .select('id')
            .eq('email', client.email)
            .maybeSingle();

          if (cancelled) return;

          if (profileData?.id) {
            recipientId = profileData.id;
            setResolvedRecipientId(profileData.id);
          } else {
            setResolvedRecipientId(null);
            return;
          }
        }

        const handleInsert = (payload: any) => {
          const msg = payload?.new;
          if (!msg) return;

          const otherPartyId = msg.sender_id === profile.id ? msg.recipient_id : msg.sender_id;
          if (otherPartyId !== recipientId) {
            fetchAllUsers();
            return;
          }

          fetchPrivateMessages();
          fetchAllUsers();
        };

        subscription = supabase!
          .channel(`private:${profile.id}:${recipientId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `sender_id=eq.${profile.id}`,
          }, handleInsert)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `recipient_id=eq.${profile.id}`,
          }, handleInsert)
          .subscribe();
      };

      setupSubscription();

      return () => {
        cancelled = true;
        subscription?.unsubscribe?.();
      };
    }
  }, [selectedUser, profile, resolvedRecipientId, clients]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateMessages]);

  async function fetchChannels() {
    if (!isSupabaseAvailable()) {
      setChannels(mockChannels);
      setSelectedChannel(mockChannels[0]);
      return;
    }

    const { data } = await supabase!
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
    if (!isSupabaseAvailable()) {
      setPrivateConversations(mockUsers);
      return;
    }

    if (!profile) return;

    // Get all private messages where the current user is sender or recipient
    const { data: messagesData } = await supabase!
      .from('private_messages')
      .select('sender_id, recipient_id')
      .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .limit(1000);

    if (!messagesData || messagesData.length === 0) {
      setPrivateConversations([]);
      return;
    }

    // Get unique user IDs from conversations
    const userIds = new Set<string>();
    messagesData.forEach(msg => {
      if (msg.sender_id !== profile.id) userIds.add(msg.sender_id);
      if (msg.recipient_id !== profile.id) userIds.add(msg.recipient_id);
    });

    if (userIds.size === 0) {
      setPrivateConversations([]);
      return;
    }

    // Fetch profile details for these users
    const { data } = await supabase!
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .in('id', Array.from(userIds));

    if (data) {
      const uniqueUsers = Array.from(new Map(data.map(u => [u.id, u])).values());
      const conversations = uniqueUsers.map(user => ({
        ...user,
        unreadCount: 0,
      }));
      setPrivateConversations(conversations);
    }
  }

  async function fetchMessages() {
    if (!selectedChannel) return;

    if (!isSupabaseAvailable()) {
      // Get messages from local ref
      const msgs = localMessagesRef.current[selectedChannel.id] || [];
      setMessages(msgs);
      return;
    }

    try {
      const { data, error } = await supabase!
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
    if (!selectedUser) return;

    if (!isSupabaseAvailable()) {
      // Mock private messages logic could go here, for now just empty or static
      setPrivateMessages([]);
      return;
    }

    if (!profile) return;

    // Check if selectedUser is a client and resolve to profile ID
    const client = clients.find(c => c.id === selectedUser.id);
    let recipientId = selectedUser.id;

    if (client) {
      // This might be a client - try to find their profile by email
      const { data: profileData } = await supabase!
        .from('profiles')
        .select('id')
        .eq('email', client.email)
        .maybeSingle();

      if (profileData) {
        recipientId = profileData.id;
        setResolvedRecipientId(recipientId); // Store for subscription
      } else {
        // Client doesn't have a profile yet, no messages to fetch
        setPrivateMessages([]);
        setResolvedRecipientId(null);
        return;
      }
    } else {
      setResolvedRecipientId(recipientId);
    }

    const { data } = await supabase!
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setPrivateMessages(data);

    await supabase!
      .from('private_messages')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('sender_id', recipientId)
      .eq('read', false);
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;

    const currentUserProfile = profile || {
      id: 'demo-user',
      full_name: user?.user_metadata?.name || 'Demo User',
      avatar_url: null,
      role: 'user'
    };

    setSending(true);
    try {
      if (view === 'channels' && selectedChannel) {
        if (!isSupabaseAvailable()) {
          // Add to local mock state
          const newMsg: Message = {
            id: Date.now().toString(),
            message: newMessage.trim(),
            created_at: new Date().toISOString(),
            profiles: {
              full_name: currentUserProfile.full_name || 'User',
              avatar_url: currentUserProfile.avatar_url,
              role: currentUserProfile.role
            }
          };

          const currentMsgs = localMessagesRef.current[selectedChannel.id] || [];
          localMessagesRef.current = {
            ...localMessagesRef.current,
            [selectedChannel.id]: [...currentMsgs, newMsg]
          };

          setLocalUpdate(prev => prev + 1); // Trigger re-render
        } else {
          if (profile) {
            await supabase!.from('chat_messages').insert({
              channel_id: selectedChannel.id,
              user_id: profile.id,
              message: newMessage.trim(),
            });
          }
        }
      } else if (view === 'private' && selectedUser) {
        if (!isSupabaseAvailable()) {
          // Mock private message sending - just adding to local state for display would require more mock structure
          // For now, let's just clear the input to simulate sending
        } else if (profile) {
          // Check if selectedUser is a client (no profile yet)
          // Try to resolve client email to profile ID
          const client = clients.find(c => c.id === selectedUser.id);
          let recipientId = selectedUser.id;

          if (client) {
            // This might be a client - try to find their profile by email
            const { data: profileData } = await supabase!
              .from('profiles')
              .select('id')
              .eq('email', client.email)
              .maybeSingle();

            if (profileData) {
              recipientId = profileData.id;
            } else {
              // Client doesn't have a profile yet
              alert(`Cannot send message: ${client.name} hasn't created their account yet. Please ask them to sign up first.`);
              setSending(false);
              return;
            }
          }

          // Optimistic update - add message to UI immediately
          const optimisticMessage = {
            id: `temp-${Date.now()}`,
            sender_id: profile.id,
            recipient_id: recipientId,
            message: newMessage.trim(),
            created_at: new Date().toISOString(),
            read: false
          };

          setPrivateMessages(prev => [...prev, optimisticMessage]);
          setNewMessage('');

          // Then send to server
          const { error } = await supabase!.from('private_messages').insert({
            sender_id: profile.id,
            recipient_id: recipientId,
            message: newMessage.trim(),
          });

          if (error) {
            // Remove optimistic message if send failed
            setPrivateMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            throw error;
          }

          // Update conversation list to include this new conversation
          await fetchAllUsers();

          // Sync messages in case realtime is delayed/missed
          await fetchPrivateMessages();

          // Successful send - the real-time subscription will replace the optimistic message
          return;
        }
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const getConversationName = (conversation: PrivateConversation | null) => {
    if (!conversation) return '';
    const fullName = (conversation.full_name || '').trim();
    if (fullName) return fullName;

    const email = (conversation.email || '').trim();
    if (email) {
      const matchingClient = clients.find(c => c.email === email);
      if (matchingClient?.name) return matchingClient.name;
      return email;
    }

    const matchingClient = clients.find(c => c.id === conversation.id);
    if (matchingClient?.name) return matchingClient.name;

    return 'User';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400';
      case 'elite': return 'text-yellow-400';
      case 'pro': return 'text-[#59a1e5]'; // Updated blue
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col lg:flex-row gap-6 chat-no-hover">
      <div className="lg:w-80 flex-shrink-0">
        <GlassCard disableHover className="h-full flex flex-col">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setView('channels')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium ${view === 'channels'
                ? 'bg-[#59a1e5] text-white shadow-[0_0_15px_rgba(89,161,229,0.3)]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
            >
              <Hash className="inline mr-2" size={16} />
              Channels
            </button>
            <button
              onClick={() => setView('private')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium ${view === 'private'
                ? 'bg-[#59a1e5] text-white shadow-[0_0_15px_rgba(89,161,229,0.3)]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
            >
              <MessageSquare className="inline mr-2" size={16} />
              Direct
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {view === 'channels' ? (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${selectedChannel?.id === channel.id
                    ? 'bg-[#59a1e5]/20 border border-[#59a1e5] shadow-[0_0_10px_rgba(89,161,229,0.1)]'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Hash size={16} className={selectedChannel?.id === channel.id ? 'text-[#59a1e5]' : 'text-gray-400'} />
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
              <div className="space-y-1">
                {/* Direct Messages Section */}
                <div>
                  <button
                    onClick={() => setShowDirectMessages(!showDirectMessages)}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-all group"
                  >
                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Direct Messages
                    </span>
                    {showDirectMessages ? (
                      <ChevronDown size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                    )}
                  </button>
                  {showDirectMessages && (
                    <div className="mt-1 space-y-1">
                      {privateConversations.length > 0 ? (
                        privateConversations.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${selectedUser?.id === user.id
                              ? 'bg-[#59a1e5]/20 border border-[#59a1e5] shadow-[0_0_10px_rgba(89,161,229,0.1)]'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={getConversationName(user)}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-[#59a1e5] to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {getInitials(getConversationName(user))}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {getConversationName(user)}
                                  </span>
                                  <span className={`text-xs font-bold ${getRoleBadgeColor(user.role)}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {user.role.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-gray-500 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            No conversations yet
                          </p>
                          {canViewClients && (
                            <p className="text-gray-600 text-xs mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                              Start a chat from Clients below
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Clients Section */}
                {canViewClients && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowClients(!showClients)}
                      className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-all group"
                    >
                      <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Clients ({clients.length})
                      </span>
                      {showClients ? (
                        <ChevronDown size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                      )}
                    </button>
                    {showClients && (
                      <div className="mt-1 space-y-1">
                        {clients.map((client) => {
                          // Check if this client is currently selected
                          const isSelected = selectedUser?.id === client.id ||
                            (selectedUser && privateConversations.find(u => u.id === selectedUser.id && u.full_name === client.name));

                          return (
                            <button
                              key={client.id}
                              onClick={() => {
                                // Find or create a conversation entry for this client
                                const existingConvo = privateConversations.find(u => u.full_name === client.name || u.id === client.id);
                                if (existingConvo) {
                                  setSelectedUser(existingConvo);
                                } else {
                                  // Create temporary user object for client (don't add to conversations yet)
                                  // They'll be added when the first message is sent
                                  const clientUser: PrivateConversation = {
                                    id: client.id,
                                    full_name: client.name,
                                    avatar_url: null,
                                    role: 'user',
                                    unreadCount: 0
                                  };

                                  setSelectedUser(clientUser);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-lg transition-all ${isSelected
                                ? 'bg-[#59a1e5]/20 border border-[#59a1e5] shadow-[0_0_10px_rgba(89,161,229,0.1)]'
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-gray-300 font-bold text-sm">
                                  {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-white font-medium text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                      {client.name}
                                    </span>
                                    {client.status === 'active' && (
                                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    )}
                                  </div>
                                  <p className="text-gray-400 text-xs truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {client.company || client.email}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <GlassCard disableHover className="flex-1 flex flex-col overflow-hidden">
          <div className="pb-4 border-b border-white/10">
            {view === 'channels' && selectedChannel ? (
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                  <Hash size={24} className="text-[#59a1e5]" />
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
                    alt={getConversationName(selectedUser)}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[#59a1e5] to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {getInitials(getConversationName(selectedUser))}
                  </div>
                )}
                <div>
                  <h2 className="text-white font-bold text-xl" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
                    {getConversationName(selectedUser)}
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
            {view === 'channels' && selectedChannel && messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  No messages yet. Be the first to say hi.
                </p>
              </div>
            )}
            {view === 'channels' && messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                {msg.profiles?.avatar_url ? (
                  <img
                    src={msg.profiles?.avatar_url}
                    alt={msg.profiles?.full_name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#59a1e5] to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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

            {view === 'private' && selectedUser && privateMessages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  No messages yet. Send the first message.
                </p>
              </div>
            )}
            {view === 'private' && privateMessages.map((msg) => {
              const isMyMessage = msg.sender_id === profile?.id;

              return (
                <div key={msg.id} className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                  {!isMyMessage && selectedUser && (
                    selectedUser.avatar_url ? (
                      <img
                        src={selectedUser.avatar_url}
                        alt={getConversationName(selectedUser)}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-[#59a1e5] to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {getInitials(getConversationName(selectedUser))}
                      </div>
                    )
                  )}
                  <div className={`flex-1 max-w-lg ${isMyMessage ? 'flex flex-col items-end' : ''}`}>
                    <div className={`p-3 rounded-lg ${isMyMessage
                      ? 'bg-[#59a1e5] text-white shadow-lg'
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
                  placeholder={`Message ${view === 'channels' ? `#${selectedChannel?.name}` : getConversationName(selectedUser)}...`}
                  className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#59a1e5] focus:ring-2 focus:ring-[#59a1e5]/50 focus:outline-none transition-all"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-6 py-3 bg-[#59a1e5] hover:bg-[#4a90d5] disabled:bg-[#59a1e5]/50 text-white rounded-lg transition-all font-medium shadow-[0_0_15px_rgba(89,161,229,0.3)] hover:shadow-[0_0_25px_rgba(89,161,229,0.5)] flex items-center gap-2"
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
