import { useState, useEffect } from 'react';
import { Plus, Search, Pin, Tag, Edit2, Trash2, Save, X } from 'lucide-react';
import GlassCard from '../GlassCard';
import { supabase } from '../../lib/supabase';
import { formatAppDate } from '../../lib/dateFormat';
import { useAuth } from '../../contexts/AuthContext';

interface Note {
  id: string;
  title: string;
  content: string;
  notebook: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export default function NotesModule() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    notebook: 'General',
    tags: [] as string[],
    is_pinned: false
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchNotes();
    }
  }, [profile]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes(notes);
    }
  }, [searchQuery, notes]);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('admin_id', profile!.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes(data || []);
  }

  async function handleSaveNote() {
    if (!editForm.title || !profile?.id) return;

    try {
      if (selectedNote) {
        const { error } = await supabase
          .from('notes')
          .update({
            title: editForm.title,
            content: editForm.content,
            notebook: editForm.notebook,
            tags: editForm.tags,
            is_pinned: editForm.is_pinned,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .insert({
            admin_id: profile.id,
            title: editForm.title,
            content: editForm.content,
            notebook: editForm.notebook,
            tags: editForm.tags,
            is_pinned: editForm.is_pinned
          });

        if (error) throw error;
      }

      await fetchNotes();
      handleCancelEdit();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    await fetchNotes();
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  }

  function handleNewNote() {
    setSelectedNote(null);
    setEditForm({
      title: '',
      content: '',
      notebook: 'General',
      tags: [],
      is_pinned: false
    });
    setIsEditing(true);
  }

  function handleEditNote(note: Note) {
    setSelectedNote(note);
    setEditForm({
      title: note.title,
      content: note.content,
      notebook: note.notebook,
      tags: note.tags,
      is_pinned: note.is_pinned
    });
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditForm({
      title: '',
      content: '',
      notebook: 'General',
      tags: [],
      is_pinned: false
    });
    setSelectedNote(null);
  }

  function handleAddTag() {
    if (tagInput && !editForm.tags.includes(tagInput)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, tagInput] });
      setTagInput('');
    }
  }

  function handleRemoveTag(tag: string) {
    setEditForm({ ...editForm, tags: editForm.tags.filter(t => t !== tag) });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notes
          </h1>
          <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
            Private admin-only notes and documentation
          </p>
        </div>
        <button
          onClick={handleNewNote}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/30"
          style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
        >
          <Plus size={20} />
          New Note
        </button>
      </div>

      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, content, or tags..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <GlassCard
                key={note.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedNote?.id === note.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => !isEditing && setSelectedNote(note)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-medium text-lg" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    {note.title}
                  </h3>
                  {note.is_pinned && <Pin className="text-blue-400" size={16} />}
                </div>
                <p className="text-gray-400 mb-2 line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  {note.content || 'No content'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-blue-400">
                    {note.notebook}
                  </span>
                  {note.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </GlassCard>
            ))
          ) : (
            <GlassCard className="p-6 text-center">
              <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {searchQuery ? 'No notes found' : 'No notes yet. Create your first note!'}
              </p>
            </GlassCard>
          )}
        </div>

        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase' }}>
                    {selectedNote ? 'Edit Note' : 'New Note'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNote}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Note title"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-xl font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                />

                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={editForm.notebook}
                    onChange={(e) => setEditForm({ ...editForm, notebook: e.target.value })}
                    placeholder="Notebook"
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                  />
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_pinned}
                      onChange={(e) => setEditForm({ ...editForm, is_pinned: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/10 border-white/20"
                    />
                    <Pin size={16} />
                    Pin
                  </label>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tags..."
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      <Tag size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white text-sm"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  placeholder="Start writing..."
                  rows={12}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}
                />
              </div>
            ) : selectedNote ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {selectedNote.title}
                    </h2>
                    <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      Last updated: {formatAppDate(selectedNote.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditNote(selectedNote)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-400 text-sm">
                    {selectedNote.notebook}
                  </span>
                  {selectedNote.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white/10 rounded-full text-gray-300">
                      {tag}
                    </span>
                  ))}
                  {selectedNote.is_pinned && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-gray-300">
                      <Pin size={14} />
                      Pinned
                    </span>
                  )}
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 whitespace-pre-wrap" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', lineHeight: '1.8' }}>
                    {selectedNote.content || 'No content'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-gray-400 text-lg mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                    Select a note to view or create a new one
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
