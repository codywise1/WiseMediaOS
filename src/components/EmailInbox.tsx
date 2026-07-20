import React from 'react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { formatAppDateTime } from '../lib/dateFormat';
import { renderMessageBody } from '../lib/messageEmbeds';
import {
  Mail,
  Star,
  Archive,
  Trash2,
  Send,
  Inbox,
  Reply,
  Forward,
  Search,
  Paperclip,
  ChevronLeft,
  Circle,
  CircleDot,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Email {
  id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  received_at: string;
  attachments: any[];
}

const INBOX_ADDRESS = 'info@wisemedia.io';

export default function EmailInbox() {
  const [emails, setEmails] = React.useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = React.useState<Email | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [folder, setFolder] = React.useState<'inbox' | 'sent' | 'archive' | 'trash'>('inbox');
  const [search, setSearch] = React.useState('');
  const [composing, setComposing] = React.useState(false);
  const [composeTo, setComposeTo] = React.useState('');
  const [composeSubject, setComposeSubject] = React.useState('');
  const [composeBody, setComposeBody] = React.useState('');
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    fetchEmails();
  }, [folder]);

  React.useEffect(() => {
    if (!isSupabaseAvailable()) return;
    const sub = supabase!
      .channel('emails_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
        fetchEmails();
      })
      .subscribe();
    return () => { supabase!.removeChannel(sub); };
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      if (!isSupabaseAvailable()) {
        setEmails([]);
        return;
      }
      const { data, error } = await supabase!
        .from('emails')
        .select('*')
        .eq('folder', folder)
        .order('received_at', { ascending: false });
      if (error) throw error;
      setEmails((data || []) as Email[]);
    } catch (e) {
      console.error('Error fetching emails:', e);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.from_address?.toLowerCase().includes(q) ||
      e.from_name?.toLowerCase().includes(q) ||
      e.body_text?.toLowerCase().includes(q)
    );
  });

  const unreadCount = emails.filter((e) => !e.is_read).length;

  const openEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read && isSupabaseAvailable()) {
      try {
        await supabase!.from('emails').update({ is_read: true }).eq('id', email.id);
        setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e)));
      } catch (e) { console.error(e); }
    }
  };

  const toggleStar = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSupabaseAvailable()) return;
    try {
      await supabase!.from('emails').update({ is_starred: !email.is_starred }).eq('id', email.id);
      setEmails((prev) => prev.map((em) => (em.id === email.id ? { ...em, is_starred: !em.is_starred } : em)));
      if (selectedEmail?.id === email.id) setSelectedEmail({ ...email, is_starred: !email.is_starred });
    } catch (err) { console.error(err); }
  };

  const moveEmail = async (email: Email, target: 'archive' | 'trash') => {
    if (!isSupabaseAvailable()) return;
    try {
      await supabase!.from('emails').update({ folder: target }).eq('id', email.id);
      setEmails((prev) => prev.filter((e) => e.id !== email.id));
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
    } catch (err) { console.error(err); }
  };

  const sendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    setSending(true);
    try {
      if (isSupabaseAvailable()) {
        const { error } = await supabase!.from('emails').insert({
          from_address: INBOX_ADDRESS,
          from_name: 'Wise Media',
          to_address: composeTo.trim(),
          subject: composeSubject.trim(),
          body_text: composeBody.trim(),
          direction: 'outbound',
          is_read: true,
          folder: 'sent',
          received_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      setComposing(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      if (folder === 'sent') fetchEmails();
    } catch (e) {
      console.error('Error sending email:', e);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const folders = [
    { key: 'inbox' as const, label: 'Inbox', icon: Inbox },
    { key: 'sent' as const, label: 'Sent', icon: Send },
    { key: 'archive' as const, label: 'Archive', icon: Archive },
    { key: 'trash' as const, label: 'Trash', icon: Trash2 },
  ];

  return (
    <div className="flex h-full">
      {/* Folder sidebar */}
      <div className="w-14 sm:w-48 shrink-0 border-r border-white/10 flex flex-col">
        <button
          onClick={() => { setComposing(true); setSelectedEmail(null); }}
          className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#3aa3eb] hover:bg-[#59a1e5] text-white text-sm font-medium transition-colors justify-center sm:justify-start"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Compose</span>
        </button>
        <div className="flex-1 px-2 space-y-0.5">
          {folders.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                folder === f.key
                  ? 'bg-[#3aa3eb]/15 text-[#3aa3eb]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <f.icon size={16} className="shrink-0" />
              <span className="hidden sm:inline">{f.label}</span>
              {f.key === 'inbox' && unreadCount > 0 && (
                <span className="ml-auto hidden sm:inline text-xs bg-[#3aa3eb] text-white px-1.5 py-0.5 rounded-full font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Email list or detail */}
      {selectedEmail ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Detail header */}
          <div className="flex items-center gap-2 p-3 border-b border-white/10">
            <button
              onClick={() => setSelectedEmail(null)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => toggleStar(selectedEmail, { stopPropagation: () => {} } as any)}
              className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${selectedEmail.is_starred ? 'text-amber-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Star size={18} fill={selectedEmail.is_starred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => moveEmail(selectedEmail, 'archive')}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Archive"
            >
              <Archive size={18} />
            </button>
            <button
              onClick={() => moveEmail(selectedEmail, 'trash')}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Email content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <h2 className="text-xl font-bold text-white tracking-tight mb-4">{selectedEmail.subject || '(no subject)'}</h2>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3aa3eb] to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(selectedEmail.from_name || selectedEmail.from_address)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-white font-medium truncate">
                    {selectedEmail.from_name || selectedEmail.from_address}
                  </p>
                  <span className="text-xs text-gray-500 shrink-0">{formatAppDateTime(new Date(selectedEmail.received_at))}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {selectedEmail.direction === 'inbound' ? 'to ' : 'from '}{INBOX_ADDRESS}
                </p>
              </div>
            </div>
            <div className="text-[15px] text-gray-200 leading-relaxed whitespace-pre-wrap">
              {renderMessageBody(selectedEmail.body_text || '', { maxEmbedWidth: 'max-w-md' })}
            </div>
            {selectedEmail.attachments?.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Attachments</p>
                {selectedEmail.attachments.map((att: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <Paperclip size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-300">{att.name || 'Attachment'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply bar */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={() => {
                setComposing(true);
                setComposeTo(selectedEmail.direction === 'inbound' ? selectedEmail.from_address : selectedEmail.to_address);
                setComposeSubject(`Re: ${selectedEmail.subject}`);
                setComposeBody('');
                setSelectedEmail(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
            >
              <Reply size={16} />
              Reply
            </button>
          </div>
        </div>
      ) : composing ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">New Message</h2>
            <button
              onClick={() => { setComposing(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto custom-scrollbar">
            <input
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="To:"
              className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3aa3eb]"
            />
            <input
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3aa3eb]"
            />
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
              className="w-full bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none resize-none flex-1"
            />
          </div>
          <div className="p-3 border-t border-white/10 flex justify-end">
            <button
              onClick={sendEmail}
              disabled={sending || !composeTo.trim() || !composeSubject.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3aa3eb] hover:bg-[#59a1e5] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mail"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3aa3eb]/50"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-[#3aa3eb]" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Mail size={32} className="text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">
                  {search ? 'No results' : `No ${folder === 'inbox' ? 'mail' : folder} yet`}
                </p>
                {!search && folder === 'inbox' && (
                  <p className="text-gray-600 text-xs mt-1">
                    Emails sent to {INBOX_ADDRESS} will appear here
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className="w-full flex items-start gap-3 p-3.5 hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {(email.from_name || email.from_address)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm truncate ${email.is_read ? 'text-gray-400 font-normal' : 'text-white font-semibold'}`}>
                          {email.direction === 'outbound' ? `To: ${email.to_address}` : (email.from_name || email.from_address)}
                        </span>
                        <span className="text-xs text-gray-600 shrink-0 ml-auto">
                          {formatAppDateTime(new Date(email.received_at))}
                        </span>
                      </div>
                      <p className={`text-sm truncate mt-0.5 ${email.is_read ? 'text-gray-500' : 'text-gray-300 font-medium'}`}>
                        {email.subject || '(no subject)'}
                      </p>
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {email.body_text?.slice(0, 80)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => toggleStar(email, e)}
                      className={`p-1 rounded transition-colors ${email.is_starred ? 'text-amber-400' : 'text-gray-700 hover:text-gray-400'}`}
                    >
                      <Star size={14} fill={email.is_starred ? 'currentColor' : 'none'} />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
