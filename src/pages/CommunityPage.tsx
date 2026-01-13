import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import { Send, Hash, MessageSquare, ChevronDown, ChevronRight, Plus, Settings, Edit2, Trash2, X, Check, Paperclip, Upload, SmilePlus } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseAvailable, clientService, Client, UserRole } from '../lib/supabase';
import { formatAppDateTime } from '../lib/dateFormat';

interface Channel {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: UserRole;
  };
  attachments?: any[];
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🙌', '😮', '😢', '💯'];

const isImageUrl = (url: string) => {
  const lower = url.toLowerCase();
  return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
};

const isVideoUrl = (url: string) => {
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.mov') ||
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com')
  );
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getVimeoId = (url: string) => {
  const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:\w+\/)?|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
};

interface PrivateConversation {
  id: string;
  full_name: string;
  email?: string | null;
  avatar_url: string | null;
  role: UserRole;
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
    { id: 'm1', user_id: 'u1', message: 'Welcome to the new community chat!', created_at: new Date(Date.now() - 86400000).toISOString(), profiles: { full_name: 'System', avatar_url: null, role: 'admin' } },
    { id: 'm2', user_id: 'u2', message: 'This is looking great!', created_at: new Date(Date.now() - 3600000).toISOString(), profiles: { full_name: 'Sarah Connor', avatar_url: null, role: 'admin' } },
  ],
  '2': [
    { id: 'm3', user_id: 'u3', message: 'New course dropping soon!', created_at: new Date().toISOString(), profiles: { full_name: 'Sarah Connor', avatar_url: null, role: 'admin' } },
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
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  const [composerAttachments, setComposerAttachments] = useState<{ type: string; url: string }[]>([]);
  const [composerAttachmentUrl, setComposerAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chatReactionCounts, setChatReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [userChatReactions, setUserChatReactions] = useState<Record<string, string>>({});
  const [privateReactionCounts, setPrivateReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [userPrivateReactions, setUserPrivateReactions] = useState<Record<string, string>>({});
  const [togglingReaction, setTogglingReaction] = useState<Record<string, boolean>>({});


  // Use a ref to persist mock messages during session in demo mode
  const localMessagesRef = useRef(mockChannelMessages);
  const [localUpdate, setLocalUpdate] = useState(0); // Force re-render for local mocks

  const isAdmin = (profile?.role || user?.user_metadata?.role || '').toLowerCase() === 'admin';
  const canViewClients = isAdmin;

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

      const sub = supabase!
        .channel(`chat_channel_${selectedChannel.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${selectedChannel.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchMessages();
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time chat');
          }
        });

      return () => {
        supabase!.removeChannel(sub);
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
      const sortedMock = [...mockChannels].sort((a, b) => b.name.localeCompare(a.name));
      setChannels(sortedMock);
      setSelectedChannel(sortedMock[0]);
      return;
    }

    const { data } = await supabase!
      .from('chat_channels')
      .select('*')
      .eq('type', 'general')
      .order('name', { ascending: false });

    if (data && data.length > 0) {
      setChannels(data);
      if (!selectedChannel) setSelectedChannel(data[0]);
    }
  }

  async function handleCreateChannel() {
    if (!newChannelName.trim() || !profile?.id || !isAdmin) return;

    setCreatingChannel(true);
    try {
      const formattedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');

      if (!isSupabaseAvailable()) {
        const newChannel: Channel = {
          id: Date.now().toString(),
          name: formattedName,
          description: newChannelDescription.trim(),
          type: 'general'
        };
        setChannels(prev => [...prev, newChannel].sort((a, b) => b.name.localeCompare(a.name)));
        setSelectedChannel(newChannel);
      } else {
        const { data, error } = await supabase!
          .from('chat_channels')
          .insert({
            name: formattedName,
            description: newChannelDescription.trim(),
            type: 'general',
            created_by: profile.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setChannels(prev => [...prev, data].sort((a, b) => b.name.localeCompare(a.name)));
          setSelectedChannel(data);
        }
      }

      setIsCreateChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelDescription('');
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel. Please try again.');
    } finally {
      setCreatingChannel(false);
    }
  }

  async function handleUpdateChannel() {
    if (!editingChannel || !newChannelName.trim() || !isAdmin) return;

    setCreatingChannel(true);
    try {
      const formattedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');

      if (!isSupabaseAvailable()) {
        const updated = { ...editingChannel, name: formattedName, description: newChannelDescription.trim() };
        setChannels(prev => prev.map(c => c.id === editingChannel.id ? updated : c).sort((a, b) => b.name.localeCompare(a.name)));
        if (selectedChannel?.id === editingChannel.id) setSelectedChannel(updated);
      } else {
        const { data, error } = await supabase!
          .from('chat_channels')
          .update({
            name: formattedName,
            description: newChannelDescription.trim(),
          })
          .eq('id', editingChannel.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setChannels(prev => prev.map(c => c.id === editingChannel.id ? data : c).sort((a, b) => b.name.localeCompare(a.name)));
          if (selectedChannel?.id === editingChannel.id) setSelectedChannel(data);
        }
      }

      setIsEditChannelModalOpen(false);
      setEditingChannel(null);
      setNewChannelName('');
      setNewChannelDescription('');
    } catch (error) {
      console.error('Error updating channel:', error);
      alert('Failed to update channel.');
    } finally {
      setCreatingChannel(false);
    }
  }

  async function handleDeleteChannel(id: string) {
    if (!isAdmin || !id) return;
    if (!confirm('Are you sure you want to delete this channel? This will remove all messages in it.')) return;

    try {
      if (!isSupabaseAvailable()) {
        setChannels(prev => prev.filter(c => c.id !== id));
        if (selectedChannel?.id === id) setSelectedChannel(channels.find(c => c.id !== id) || null);
      } else {
        const { error } = await supabase!
          .from('chat_channels')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setChannels(prev => prev.filter(c => c.id !== id));
        if (selectedChannel?.id === id) {
          const next = channels.find(c => c.id !== id);
          setSelectedChannel(next || null);
        }
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      alert('Failed to delete channel.');
    }
  }

  async function handleUpdateMessage(messageId: string) {
    if (!editingMessageText.trim() || !isAdmin) return;

    try {
      if (!isSupabaseAvailable()) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: editingMessageText.trim() } : m));
      } else {
        const { error } = await supabase!
          .from('chat_messages')
          .update({ message: editingMessageText.trim() })
          .eq('id', messageId);

        if (error) throw error;
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: editingMessageText.trim() } : m));
      }
      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Failed to update message.');
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!isAdmin || !messageId) return;
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      if (!isSupabaseAvailable()) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        const { error } = await supabase!
          .from('chat_messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message.');
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

  async function getFirstAdminId(): Promise<string | null> {
    if (!isSupabaseAvailable()) return null;
    if (!profile) return null;

    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data.id;
    } catch (e) {
      console.error('Error fetching admin:', e);
      return null;
    }
  }

  async function handleUpdatePrivateMessage(messageId: string) {
    if (!editingMessageText.trim() || !isAdmin) return;

    try {
      if (!isSupabaseAvailable()) {
        setPrivateMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: editingMessageText.trim() } : m));
      } else {
        const { error } = await supabase!
          .from('private_messages')
          .update({ message: editingMessageText.trim() })
          .eq('id', messageId);

        if (error) throw error;
        setPrivateMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: editingMessageText.trim() } : m));
      }
      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (error) {
      console.error('Error updating private message:', error);
      alert('Failed to update message.');
    }
  }

  async function handleDeletePrivateMessage(messageId: string) {
    if (!isAdmin || !messageId) return;
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      if (!isSupabaseAvailable()) {
        setPrivateMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        const { error } = await supabase!
          .from('private_messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;
        setPrivateMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting private message:', error);
      alert('Failed to delete message.');
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

      if (data) {
        setMessages(data);
        hydrateChatReactions(data.map(m => m.id));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  async function hydrateChatReactions(messageIds: string[]) {
    if (!isSupabaseAvailable()) return;
    const { data, error } = await supabase!
      .from('chat_reactions')
      .select('message_id,user_id,reaction')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error loading chat reactions:', error);
      return;
    }

    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};

    for (const row of (data as any[]) || []) {
      if (!counts[row.message_id]) counts[row.message_id] = {};
      counts[row.message_id][row.reaction] = (counts[row.message_id][row.reaction] || 0) + 1;

      if (profile?.id && row.user_id === profile.id) {
        mine[row.message_id] = row.reaction;
      }
    }
    setChatReactionCounts(counts);
    setUserChatReactions(mine);
  }

  async function hydratePrivateReactions(messageIds: string[]) {
    if (!isSupabaseAvailable()) return;
    const { data, error } = await supabase!
      .from('private_message_reactions')
      .select('message_id,user_id,reaction')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error loading private reactions:', error);
      return;
    }

    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};

    for (const row of (data as any[]) || []) {
      if (!counts[row.message_id]) counts[row.message_id] = {};
      counts[row.message_id][row.reaction] = (counts[row.message_id][row.reaction] || 0) + 1;

      if (profile?.id && row.user_id === profile.id) {
        mine[row.message_id] = row.reaction;
      }
    }
    setPrivateReactionCounts(counts);
    setUserPrivateReactions(mine);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSupabaseAvailable() || !profile?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase!.storage
        .from('community')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase!.storage
        .from('community')
        .getPublicUrl(filePath);

      const url = data.publicUrl;
      let type = 'link';
      if (isImageUrl(url)) type = 'image';
      else if (isVideoUrl(url)) type = 'video';

      setComposerAttachments(prev => [...prev, { type, url }]);
    } catch (e) {
      console.error('Error uploading file:', e);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addAttachment = () => {
    const url = composerAttachmentUrl.trim();
    if (!url) return;
    let type = 'link';
    if (isImageUrl(url)) type = 'image';
    else if (isVideoUrl(url)) type = 'video';

    setComposerAttachments(prev => [...prev, { type, url }]);
    setComposerAttachmentUrl('');
  };

  async function handleChatReaction(messageId: string, reaction: string) {
    if (!isSupabaseAvailable() || !profile?.id) return;
    if (togglingReaction[messageId]) return;
    setTogglingReaction(prev => ({ ...prev, [messageId]: true }));
    try {
      const currentReaction = userChatReactions[messageId];

      if (currentReaction === reaction) {
        const { error } = await supabase!
          .from('chat_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', profile.id)
          .eq('reaction', reaction);
        if (error) throw error;

        setUserChatReactions(prev => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        setChatReactionCounts(prev => {
          const next = { ...prev };
          if (next[messageId] && next[messageId][reaction]) {
            next[messageId] = { ...next[messageId], [reaction]: Math.max(0, next[messageId][reaction] - 1) };
          }
          return next;
        });
      } else {
        if (currentReaction) {
          const { error } = await supabase!
            .from('chat_reactions')
            .update({ reaction })
            .eq('message_id', messageId)
            .eq('user_id', profile.id);
          if (error) throw error;

          setUserChatReactions(prev => ({ ...prev, [messageId]: reaction }));
          setChatReactionCounts(prev => {
            const next = { ...prev };
            if (next[messageId]) {
              next[messageId] = { ...next[messageId] };
              if (next[messageId][currentReaction]) {
                next[messageId][currentReaction] = Math.max(0, next[messageId][currentReaction] - 1);
              }
              next[messageId][reaction] = (next[messageId][reaction] || 0) + 1;
            }
            return next;
          });
        } else {
          const { error } = await supabase!
            .from('chat_reactions')
            .insert({ message_id: messageId, user_id: profile.id, reaction });
          if (error) throw error;

          setUserChatReactions(prev => ({ ...prev, [messageId]: reaction }));
          setChatReactionCounts(prev => {
            const next = { ...prev };
            if (!next[messageId]) next[messageId] = {};
            next[messageId] = { ...next[messageId], [reaction]: (next[messageId][reaction] || 0) + 1 };
            return next;
          });
        }
      }
    } catch (e) {
      console.error('Error handling chat reaction:', e);
    } finally {
      setTogglingReaction(prev => ({ ...prev, [messageId]: false }));
    }
  }

  async function handlePrivateReaction(messageId: string, reaction: string) {
    if (!isSupabaseAvailable() || !profile?.id) return;
    if (togglingReaction[messageId]) return;
    setTogglingReaction(prev => ({ ...prev, [messageId]: true }));
    try {
      const currentReaction = userPrivateReactions[messageId];

      if (currentReaction === reaction) {
        const { error } = await supabase!
          .from('private_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', profile.id)
          .eq('reaction', reaction);
        if (error) throw error;

        setUserPrivateReactions(prev => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        setPrivateReactionCounts(prev => {
          const next = { ...prev };
          if (next[messageId] && next[messageId][reaction]) {
            next[messageId] = { ...next[messageId], [reaction]: Math.max(0, next[messageId][reaction] - 1) };
          }
          return next;
        });
      } else {
        if (currentReaction) {
          const { error } = await supabase!
            .from('private_message_reactions')
            .update({ reaction })
            .eq('message_id', messageId)
            .eq('user_id', profile.id);
          if (error) throw error;

          setUserPrivateReactions(prev => ({ ...prev, [messageId]: reaction }));
          setPrivateReactionCounts(prev => {
            const next = { ...prev };
            if (next[messageId]) {
              next[messageId] = { ...next[messageId] };
              if (next[messageId][currentReaction]) {
                next[messageId][currentReaction] = Math.max(0, next[messageId][currentReaction] - 1);
              }
              next[messageId][reaction] = (next[messageId][reaction] || 0) + 1;
            }
            return next;
          });
        } else {
          const { error } = await supabase!
            .from('private_message_reactions')
            .insert({ message_id: messageId, user_id: profile.id, reaction });
          if (error) throw error;

          setUserPrivateReactions(prev => ({ ...prev, [messageId]: reaction }));
          setPrivateReactionCounts(prev => {
            const next = { ...prev };
            if (!next[messageId]) next[messageId] = {};
            next[messageId] = { ...next[messageId], [reaction]: (next[messageId][reaction] || 0) + 1 };
            return next;
          });
        }
      }
    } catch (e) {
      console.error('Error handling private reaction:', e);
    } finally {
      setTogglingReaction(prev => ({ ...prev, [messageId]: false }));
    }
  }

  const renderMessageAttachments = (attachments?: any[]) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="mt-2 space-y-2">
        {attachments.map((att: any, idx: number) => {
          const url = att?.url || att?.href || '';
          if (!url) return null;

          if (isImageUrl(url)) {
            return (
              <img
                key={idx}
                src={url}
                alt="attachment"
                className="max-w-full max-h-[300px] object-cover rounded-lg border border-white/10"
              />
            );
          }

          if (isVideoUrl(url)) {
            const ytId = getYouTubeId(url);
            const vimId = getVimeoId(url);

            if (ytId) {
              return (
                <div key={idx} className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    className="absolute top-0 left-0 w-full h-full"
                    allowFullScreen
                  />
                </div>
              );
            }

            if (vimId) {
              return (
                <div key={idx} className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                  <iframe
                    src={`https://player.vimeo.com/video/${vimId}`}
                    className="absolute top-0 left-0 w-full h-full"
                    allowFullScreen
                  />
                </div>
              );
            }

            return (
              <video
                key={idx}
                src={url}
                controls
                className="max-w-xs rounded-lg border border-white/10"
              />
            );
          }

          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#59a1e5] text-sm transition-colors truncate max-w-xs"
            >
              {url}
            </a>
          );
        })}
      </div>
    );
  };

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

    if (data && data.length > 0) {
      hydratePrivateReactions(data.map(m => m.id));
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() && composerAttachments.length === 0) return;

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
            user_id: currentUserProfile.id,
            message: newMessage.trim(),
            created_at: new Date().toISOString(),
            profiles: {
              full_name: currentUserProfile.full_name || 'User',
              avatar_url: currentUserProfile.avatar_url,
              role: currentUserProfile.role
            },
            attachments: composerAttachments
          };

          const currentMsgs = localMessagesRef.current[selectedChannel.id] || [];
          localMessagesRef.current = {
            ...localMessagesRef.current,
            [selectedChannel.id]: [...currentMsgs, newMsg]
          };

          setLocalUpdate(prev => prev + 1); // Trigger re-render
          setNewMessage('');
          setComposerAttachments([]);
          setComposerAttachmentUrl('');
        } else {
          if (profile) {
            // Optimistic update
            const optimisticMsg: Message = {
              id: `temp-${Date.now()}`,
              user_id: profile.id,
              message: newMessage.trim(),
              created_at: new Date().toISOString(),
              profiles: {
                full_name: profile.full_name || 'User',
                avatar_url: profile.avatar_url,
                role: profile.role
              },
              attachments: composerAttachments
            };
            setMessages(prev => [...prev, optimisticMsg]);

            const content = newMessage.trim();
            setNewMessage('');
            setComposerAttachments([]);
            setComposerAttachmentUrl('');

            const { error } = await supabase!.from('chat_messages').insert({
              channel_id: selectedChannel.id,
              user_id: profile.id,
              message: content,
              attachments: composerAttachments
            });

            if (error) {
              setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
              throw error;
            }

            fetchMessages(); // Refresh to get the real ID and metadata
          }
        }
      } else if (view === 'private' && selectedUser) {
        if (!isSupabaseAvailable()) {
          // Mock private message sending - just adding to local state for display would require more mock structure
          // For now, let's just clear the input to simulate sending
          setNewMessage('');
          setComposerAttachments([]);
          setComposerAttachmentUrl('');
        } else if (profile) {
          let recipientId = selectedUser.id;

          // If current user is NOT admin/staff, route message to admin
          if (!isAdmin) {
            const adminId = await getFirstAdminId();
            if (!adminId) {
              alert('Cannot send message: No admin available.');
              setSending(false);
              return;
            }
            recipientId = adminId;
          } else {
            // Admin/staff sending message - check if selectedUser is a client
            const client = clients.find(c => c.id === selectedUser.id);

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
          }

          // Optimistic update - add message to UI immediately
          const optimisticMessage = {
            id: `temp-${Date.now()}`,
            sender_id: profile.id,
            recipient_id: recipientId,
            message: newMessage.trim(),
            created_at: new Date().toISOString(),
            read: false,
            attachments: composerAttachments
          };

          setPrivateMessages(prev => [...prev, optimisticMessage]);
          setNewMessage('');
          setComposerAttachments([]);
          setComposerAttachmentUrl('');

          // Then send to server
          const { error } = await supabase!.from('private_messages').insert({
            sender_id: profile.id,
            recipient_id: recipientId,
            message: newMessage.trim(),
            attachments: composerAttachments
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
        }
      }
      setNewMessage('');
      setComposerAttachments([]);
      setComposerAttachmentUrl('');
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

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'text-red-400';
      case 'elite': return 'text-yellow-400';
      case 'pro': return 'text-[#59a1e5]'; // Updated blue
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col gap-6 chat-no-hover">

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 flex-shrink-0">
          <GlassCard disableHover className="h-full flex flex-col">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setView('channels')}
                className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium border ${view === 'channels'
                  ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
              >
                <Hash className="inline mr-2" size={16} />
                Channels
              </button>
              <button
                onClick={() => setView('private')}
                className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium border ${view === 'private'
                  ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/50 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
              >
                <MessageSquare className="inline mr-2" size={16} />
                Direct
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {view === 'channels' ? (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateChannelModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 p-2 mb-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white transition-all text-sm font-medium"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <Plus size={16} />
                      Create Channel
                    </button>
                  )}
                  {channels.map((channel) => (
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
                  ))}
                </>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="gradient-text font-bold text-xl flex items-center gap-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                      <Hash size={24} className="text-[#59a1e5]" />
                      {selectedChannel.name}
                    </h2>
                    {selectedChannel.description && (
                      <p className="text-gray-400 text-sm mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {selectedChannel.description}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingChannel(selectedChannel);
                          setNewChannelName(selectedChannel.name);
                          setNewChannelDescription(selectedChannel.description || '');
                          setIsEditChannelModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Edit Channel"
                      >
                        <Settings size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(selectedChannel.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Delete Channel"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
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
                    <h2 className="gradient-text font-bold text-xl" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                      {getConversationName(selectedUser)}
                    </h2>
                    <p className={`text-sm font-bold ${getRoleBadgeColor(selectedUser.role)}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {selectedUser.role.toUpperCase()}
                    </p>
                  </div>
                </div>
              ) : (
                <h2 className="gradient-text font-bold text-xl" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                  Select a {view === 'channels' ? 'channel' : 'conversation'}
                </h2>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-12 pb-4 px-1 space-y-4 custom-scrollbar">
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
                        {formatAppDateTime(msg.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 group/msg-row">
                      <div className="flex-1">
                        <div className="flex justify-between items-start group/msg-content">
                          <div className="flex-1">
                            {editingMessageId === msg.id ? (
                              <div className="flex gap-2 items-center mt-1">
                                <input
                                  type="text"
                                  value={editingMessageText}
                                  onChange={(e) => setEditingMessageText(e.target.value)}
                                  className="flex-1 px-3 py-1 bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:border-[#59a1e5]"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateMessage(msg.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingMessageText('');
                                  }}
                                  className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-gray-300 break-words whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                                {msg.message}
                              </p>
                            )}
                            {renderMessageAttachments(msg.attachments)}

                            {/* Reaction Chips */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {chatReactionCounts[msg.id] && Object.entries(chatReactionCounts[msg.id]).map(([emoji, count]) => {
                                if (count === 0) return null;
                                const isMine = userChatReactions[msg.id] === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleChatReaction(msg.id, emoji)}
                                    className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all border duration-200 ${isMine
                                      ? 'bg-[#59a1e5]/20 border-[#59a1e5]/50 text-white shadow-[0_0_12px_rgba(89,161,229,0.2)] scale-105'
                                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                                      }`}
                                  >
                                    <span className="text-sm">{emoji}</span>
                                    <span className="font-bold">{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {isAdmin && msg.user_id === profile?.id && !editingMessageId && (
                            <div className="opacity-0 group-hover/msg-content:opacity-100 flex gap-1 ml-2 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingMessageText(msg.message);
                                }}
                                className="p-1 text-gray-500 hover:text-white rounded"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 text-gray-500 hover:text-red-400 rounded"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Centered Reaction Picker Button */}
                      <div className="relative group/picker opacity-0 group-hover/msg-row:opacity-100 transition-all duration-200 flex-shrink-0 mr-1">
                        <button
                          className="p-1.5 text-gray-500 hover:text-[#59a1e5] rounded-full hover:bg-[#59a1e5]/10 transition-all duration-200"
                          title="Add reaction"
                        >
                          <SmilePlus size={20} />
                        </button>
                        <div className="absolute bottom-full mb-2 right-0 opacity-0 invisible group-hover/picker:opacity-100 group-hover/picker:visible transition-all duration-300 z-[100] transform translate-y-2 group-hover/picker:translate-y-0">
                          <div className="flex items-center gap-1 p-1.5 bg-[#1a1c1e]/95 border border-white/20 rounded-full shadow-[0_8_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                            {COMMON_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleChatReaction(msg.id, emoji)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all hover:scale-125 active:scale-90 ${userChatReactions[msg.id] === emoji ? 'bg-[#59a1e5]/30' : ''}`}
                              >
                                <span className="text-lg">{emoji}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
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
                      <div className={`flex items-center gap-2 group/msg-row ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1 max-w-lg">
                          <div className="group/msg-content relative">
                            <div className={`p-3 rounded-lg ${isMyMessage
                              ? 'bg-[#59a1e5] text-white shadow-lg'
                              : 'bg-white/10 text-gray-300'
                              }`}>
                              {editingMessageId === msg.id ? (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={editingMessageText}
                                    onChange={(e) => setEditingMessageText(e.target.value)}
                                    className="flex-1 px-3 py-1 bg-black/30 border border-white/10 rounded text-white focus:outline-none focus:border-white"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleUpdatePrivateMessage(msg.id)}
                                    className="p-1 text-emerald-400 hover:bg-white/10 rounded"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditingMessageText('');
                                    }}
                                    className="p-1 text-red-400 hover:bg-white/10 rounded"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <p className="break-words whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                                  {msg.message}
                                </p>
                              )}
                              {renderMessageAttachments(msg.attachments)}
                            </div>

                            {/* Reaction Chips */}
                            <div className={`flex flex-wrap gap-1.5 mt-2 ${isMyMessage ? 'justify-end' : ''}`}>
                              {privateReactionCounts[msg.id] && Object.entries(privateReactionCounts[msg.id]).map(([emoji, count]) => {
                                if (count === 0) return null;
                                const isMine = userPrivateReactions[msg.id] === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handlePrivateReaction(msg.id, emoji)}
                                    className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all border duration-200 ${isMine
                                      ? 'bg-[#59a1e5]/20 border-[#59a1e5]/50 text-white shadow-[0_0_12px_rgba(89,161,229,0.2)] scale-105'
                                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                                      }`}
                                  >
                                    <span className="text-sm">{emoji}</span>
                                    <span className="font-bold">{count}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {isAdmin && isMyMessage && !editingMessageId && (
                              <div className={`absolute top-0 ${isMyMessage ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover/msg-content:opacity-100 flex gap-1 transition-opacity`}>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingMessageText(msg.message);
                                  }}
                                  className="p-1 text-gray-500 hover:text-white rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeletePrivateMessage(msg.id)}
                                  className="p-1 text-gray-500 hover:text-red-400 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Centered Reaction Picker Button */}
                        <div className={`relative group/picker opacity-0 group-hover/msg-row:opacity-100 transition-all duration-200 flex-shrink-0 ${isMyMessage ? 'ml-1' : 'mr-1'}`}>
                          <button
                            className="p-1.5 text-gray-500 hover:text-[#59a1e5] rounded-full hover:bg-[#59a1e5]/10 transition-all duration-200"
                            title="Add reaction"
                          >
                            <SmilePlus size={20} />
                          </button>
                          <div className={`absolute bottom-full mb-2 ${isMyMessage ? 'left-0' : 'right-0'} opacity-0 invisible group-hover/picker:opacity-100 group-hover/picker:visible transition-all duration-300 z-[100] transform translate-y-2 group-hover/picker:translate-y-0`}>
                            <div className="flex items-center gap-1 p-1.5 bg-[#1a1c1e]/95 border border-white/20 rounded-full shadow-[0_8_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                              {COMMON_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handlePrivateReaction(msg.id, emoji)}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all hover:scale-125 active:scale-90 ${userPrivateReactions[msg.id] === emoji ? 'bg-[#59a1e5]/30' : ''}`}
                                >
                                  <span className="text-lg">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {formatAppDateTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {((view === 'channels' && selectedChannel) || (view === 'private' && selectedUser)) && (
              <div className="pt-4 border-t border-white/10">
                {/* Attachment Preview */}
                {composerAttachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {composerAttachments.map((att, idx) => (
                      <div key={idx} className="relative group">
                        {att.type === 'image' ? (
                          <img src={att.url} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                        ) : (
                          <div className="w-16 h-16 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center text-gray-400">
                            <Paperclip size={20} />
                          </div>
                        )}
                        <button
                          onClick={() => setComposerAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${view === 'channels' ? `#${selectedChannel?.name}` : getConversationName(selectedUser)}...`}
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#59a1e5] focus:ring-2 focus:ring-[#59a1e5]/50 focus:outline-none transition-all"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                        disabled={sending}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all border border-white/10"
                      title="Upload file"
                    >
                      <Upload size={20} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,video/*"
                    />
                    <button
                      type="submit"
                      disabled={sending || (!newMessage.trim() && composerAttachments.length === 0)}
                      className="px-6 py-3 bg-[#59a1e5] hover:bg-[#4a90d5] disabled:bg-[#59a1e5]/50 text-white rounded-lg transition-all font-medium shadow-[0_0_15px_rgba(89,161,229,0.3)] hover:shadow-[0_0_25px_rgba(89,161,229,0.5)] flex items-center gap-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <Send size={20} />
                      Send
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={composerAttachmentUrl}
                      onChange={(e) => setComposerAttachmentUrl(e.target.value)}
                      placeholder="Paste Link/Video URL..."
                      className="flex-1 px-3 py-1.5 bg-black/20 border border-white/5 rounded text-xs text-gray-400 focus:border-[#59a1e5] focus:outline-none transition-all"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    />
                    <button
                      type="button"
                      onClick={addAttachment}
                      disabled={!composerAttachmentUrl.trim()}
                      className="p-1 text-gray-500 hover:text-[#59a1e5] transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <Modal
        isOpen={isCreateChannelModalOpen || isEditChannelModalOpen}
        onClose={() => {
          setIsCreateChannelModalOpen(false);
          setIsEditChannelModalOpen(false);
          setEditingChannel(null);
          setNewChannelName('');
          setNewChannelDescription('');
        }}
        title={isEditChannelModalOpen ? "Edit Channel" : "Create New Channel"}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Channel Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">#</span>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="announcements"
                className="w-full pl-8 pr-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              />
            </div>
            <p className="text-[10px] text-gray-500">Names must be lowercase, without spaces or special characters.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>Description</label>
            <textarea
              value={newChannelDescription}
              onChange={(e) => setNewChannelDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={3}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsCreateChannelModalOpen(false);
                setIsEditChannelModalOpen(false);
                setEditingChannel(null);
                setNewChannelName('');
                setNewChannelDescription('');
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Cancel
            </button>
            <button
              onClick={isEditChannelModalOpen ? handleUpdateChannel : handleCreateChannel}
              disabled={creatingChannel || !newChannelName.trim()}
              className="px-6 py-2 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/50 text-white rounded-lg transition-all font-bold text-sm shadow-[0_4px_15_rgba(58,163,235,0.3)] hover:shadow-[0_6px_20px_rgba(58,163,235,0.4)]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {creatingChannel ? (isEditChannelModalOpen ? 'Updating...' : 'Creating...') : (isEditChannelModalOpen ? 'Update Channel' : 'Create Channel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
