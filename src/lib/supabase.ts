import { createClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'staff' | 'user' | 'elite' | 'pro' | 'free';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  subscription_type?: string | null;
  location?: string | null;
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  created_at?: string;
  updated_at?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const forceDemoMode = import.meta.env.VITE_FORCE_DEMO_MODE === 'true';
const enableClientUserCreation = import.meta.env.VITE_ENABLE_CLIENT_USER_CREATION === 'true';

// Check if Supabase is configured
const isSupabaseConfigured = !forceDemoMode && supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_url' &&
  supabaseAnonKey !== 'your_supabase_anon_key' &&
  supabaseUrl.includes('supabase.co');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return supabase !== null;
};

const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
};

// Avatar upload service
export const avatarService = {
  async uploadAvatar(file: File, userId: string): Promise<string> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await sb.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = sb.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteAvatar(avatarUrl: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const path = avatarUrl.split('/avatars/').pop();
    if (!path) return;

    const { error } = await sb.storage
      .from('avatars')
      .remove([`avatars/${path}`]);

    if (error) {
      console.error('Error deleting avatar:', error);
    }
  }
};

// Authentication functions
export const authService = {
  async signUp(email: string, password: string, userData: { name: string, phone?: string, role?: 'admin' | 'user' }) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    // Automatically make icodywise@gmail.com an admin
    const userRole = email.toLowerCase() === 'icodywise@gmail.com' ? 'admin' : (userData.role || 'user');

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          phone: userData.phone || '',
          role: userRole
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = getSupabaseClient();
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    if (!isSupabaseAvailable()) {
      return { data: { subscription: null } };
    }

    const sb = getSupabaseClient();
    return sb.auth.onAuthStateChange((event, session) => {
      // Skip events that shouldn't trigger UI updates when switching tabs
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        return;
      }
      callback(session?.user || null);
    });
  }
};

// Mock data for demo mode only (when Supabase is not configured)
let mockClients: Client[] = JSON.parse(localStorage.getItem('wise_media_clients') || '[]');
let mockProjects: Project[] = JSON.parse(localStorage.getItem('wise_media_projects') || '[]');
let nextMockId = 1;

// Generate unique ID for mock data
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Save data to localStorage
const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Database types
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  tiktok?: string;
  notes?: string;
  status: 'prospect' | 'active' | 'vip' | 'inactive' | 'archived';
  service_type?: 'Website' | 'Branding' | 'Retainer' | 'Ads' | 'Other';
  client_tier?: string; // Deprecated: replaced by status
  source?: 'Referral' | 'Instagram' | 'X' | 'Repeat' | 'Other';
  first_name?: string;
  category?: 'Personal Care' | 'Real Estate' | 'Art' | 'Web3' | 'Hospitality' | 'Travel Agency' | 'E-Commerce' | 'Law' | 'Investing' | 'Finance' | 'Forex';
  location?: string;
  avatar?: string;
  services_requested?: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'in_review' | 'completed';
  progress: number;
  budget?: number;
  start_date?: string;
  due_date?: string;
  team_size: number;
  project_type?: string;
  priority?: string;
  billing_type?: string;
  invoice_link?: string;
  owner?: string;
  assigned_members?: string[];
  deliverables?: string[];
  internal_tags?: string[];
  milestones?: any[];
  asset_count?: number;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Invoice {
  id: string;
  client_id: string;
  proposal_id?: string;
  amount: number;
  description: string;
  status: 'draft' | 'ready' | 'pending' | 'unpaid' | 'paid' | 'overdue' | 'void';
  due_date: string;
  due_at?: string; // Some parts of the app use due_at
  locked_from_send?: boolean;
  activation_source?: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export type CreateInvoice = Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'client'>;

export interface Proposal {
  id: string;
  client_id: string;
  title: string;
  description: string;
  value: number;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired' | 'archived';
  services: string[];
  expiry_date?: string;
  expires_at?: string; // Used in proposalService
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Appointment {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration: string;
  type: 'video' | 'phone' | 'in-person';
  status: 'confirmed' | 'pending' | 'cancelled';
  location?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

// Meeting system types
export type MeetingStatus = 'scheduled' | 'live' | 'processing' | 'ready' | 'shared' | 'archived';
export type MeetingType = 'video' | 'phone' | 'in-person';

export interface MeetingParticipant {
  user_id: string;
  name: string;
  email?: string;
  role: 'host' | 'participant' | 'client';
  joined_at?: string;
  left_at?: string;
}

export interface MeetingRecording {
  id: string;
  meeting_id: string;
  file_path: string;
  file_url?: string;
  duration_seconds?: number;
  size_bytes?: number;
  recording_started_at: string;
  recording_ended_at?: string;
  has_screen_share: boolean;
  screen_share_segments?: Array<{ start: number; end: number }>;
  status: 'recording' | 'processing' | 'ready' | 'failed';
  created_at: string;
}

export interface MeetingTranscript {
  id: string;
  meeting_id: string;
  entries: Array<{
    timestamp: string;
    speaker: string;
    speaker_role: 'admin' | 'staff' | 'client';
    text: string;
  }>;
  language: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingSummarySection {
  content: string;
  is_shared: boolean;
  last_edited_at?: string;
  last_edited_by?: string;
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  internal_summary: MeetingSummarySection;
  client_safe_summary: MeetingSummarySection;
  decisions: MeetingSummarySection;
  action_items: Array<{
    text: string;
    assigned_to?: string;
    due_date?: string;
    completed: boolean;
  }>;
  risks_and_flags: MeetingSummarySection;
  scope_change_detected: boolean;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  client_id?: string;
  project_id?: string;
  title: string;
  description?: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  actual_duration_seconds?: number;
  type: MeetingType;
  status: MeetingStatus;
  location?: string;
  meeting_url?: string;
  participants: MeetingParticipant[];
  notes_id?: string; // Link to notes table
  recording_id?: string;
  transcript_id?: string;
  summary_id?: string;
  is_recording: boolean;
  recording_started_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  client?: Client;
  project?: Project;
  recording?: MeetingRecording;
  transcript?: MeetingTranscript;
  summary?: MeetingSummary;
  notes?: Note;
}

export type CreateMeeting = Omit<Meeting, 'id' | 'created_at' | 'updated_at' | 'client' | 'project' | 'recording' | 'transcript' | 'summary' | 'notes'>;

export interface SupportTicket {
  id: string;
  client_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface NoteAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export type NoteCategory = 'idea' | 'meeting' | 'sales_call' | 'sop' | 'task' | 'general';
export type NoteVisibility = 'internal' | 'client_visible';

export interface NoteBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'bullets' | 'numbered' | 'todo' | 'toggle' | 'quote' | 'callout' | 'divider' | 'code';
  content?: string;
  level?: number;
  items?: string[];
  todos?: { text: string; done: boolean }[];
  children?: NoteBlock[];
  lang?: string;
  tone?: 'info' | 'warning' | 'error' | 'success';
  indent?: number;
}

export interface Note {
  id: string;
  title: string;
  content: NoteBlock[] | string; // Support both for transition
  plainText?: string;
  category: NoteCategory;
  tags: string[];
  pinned: boolean; // Renamed from is_pinned in request but I'll support both for transition
  is_pinned?: boolean;
  visibility: NoteVisibility;
  orgId?: string;
  authorUserId?: string;
  clientId?: string;
  projectId?: string;
  meetingId?: string;
  proposalId?: string;
  invoiceId?: string;
  attachments: NoteAttachment[];
  created_at: string;
  updated_at: string;
  client?: Client;
  project?: Project;
}

export interface NoteAudit {
  id: string;
  note_id: string;
  actor_id: string;
  action: 'note_created' | 'note_updated' | 'note_deleted' | 'note_shared' | 'note_unshared' | 'note_pinned' | 'note_unpinned';
  metadata: any;
  created_at: string;
}

export type FileStatus = 'draft' | 'in_review' | 'awaiting_client' | 'approved' | 'archived';

export type FileVisibility = 'private' | 'shared';

export interface FileRecord {
  id: string;
  bucket_id: string;
  path: string;
  filename: string;
  content_type?: string | null;
  size_bytes?: number | null;
  status: FileStatus;
  visibility: FileVisibility;
  owner_id: string;
  client_id?: string | null;
  project_id?: string | null;
  meeting_id?: string | null;
  note_id?: string | null;
  created_at: string;
  updated_at: string;
  // Optional populated relations
  client?: Client;
  project?: Project;
  meeting?: Appointment; // Assuming meeting is appointment
  note?: Note;
  versions?: FileVersion[];
  audit_log?: FileAuditEntry[];
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  path: string;
  size_bytes: number;
  created_at: string;
  created_by: string;
}

export interface FileAuditEntry {
  id: string;
  file_id: string;
  action: 'uploaded' | 'shared' | 'viewed' | 'downloaded' | 'version_restored' | 'archived' | 'deleted';
  performed_by: string;
  timestamp: string;
  details?: string;
}

// Support operations
export const supportService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('support_tickets')
      .select(`
        *,
        client:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SupportTicket[];
  },

  async getByClientId(clientId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('support_tickets')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SupportTicket[];
  },

  async create(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'client'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('support_tickets')
      .insert([ticket])
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as SupportTicket;
  },

  async update(id: string, updates: Partial<SupportTicket>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('support_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as SupportTicket;
  },

  async delete(id: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { error } = await sb
      .from('support_tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
// Client operations
export const clientService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      console.log('Demo mode - Supabase not configured');
      return mockClients;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Client[];
  },

  async getByEmail(email: string) {
    if (!email) return null;

    if (!isSupabaseAvailable()) {
      return mockClients.find(c => c.email?.toLowerCase() === email.toLowerCase()) || null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error) throw error;
    return (data as Client) || null;
  },

  async getById(id: string) {
    if (!isSupabaseAvailable()) {
      const client = mockClients.find(c => c.id === id);
      if (!client) throw new Error('Client not found');
      return client;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Client;
  },

  async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    if (!isSupabaseAvailable()) {
      const newClient: Client = {
        ...client,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockClients.push(newClient);
      saveToStorage('wise_media_clients', mockClients);
      console.log('Mock client created:', newClient);
      return newClient;
    }

    const sb = getSupabaseClient();

    try {
      // Check if user is authenticated
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated. Please log in to create clients.');
      }

      // Optionally create the user account via Edge Function
      if (enableClientUserCreation) {
        const { data: { session } } = await sb.auth.getSession();
        const token = session?.access_token;

        if (token) {
          try {
            const createUserResponse = await fetch(
              `${supabaseUrl}/functions/v1/create-client-user`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: client.email,
                  name: client.name,
                  phone: client.phone || ''
                })
              }
            );

            if (!createUserResponse.ok) {
              const errorData = await createUserResponse.json();
              console.warn('Failed to create user account:', errorData);
              // Continue anyway - the client record will still be created
            } else {
              const userData = await createUserResponse.json();
              console.log('User account created:', userData);
            }
          } catch (userError) {
            console.warn('Error creating user account:', userError);
            // Continue anyway
          }
        }
      }

      const parseMissingColumn = (message: string | undefined | null) => {
        if (!message) return null;
        const match = message.match(/Could not find the '([^']+)' column/i);
        return match?.[1] || null;
      };

      const upsertWithFallback = async (payload: Record<string, any>) => {
        let currentPayload = { ...payload };
        const removedColumns: string[] = [];

        for (let attempt = 0; attempt < 10; attempt++) {
          const { data, error } = await sb
            .from('clients')
            .upsert([currentPayload], { onConflict: 'email' })
            .select()
            .single();

          if (!error) {
            if (removedColumns.length > 0) {
              console.warn('Client created, but some fields were not saved because DB columns are missing:', removedColumns);
            }
            return { data, error: null };
          }

          if (error.code === 'PGRST204') {
            const missing = parseMissingColumn(error.message);
            if (missing && Object.prototype.hasOwnProperty.call(currentPayload, missing)) {
              removedColumns.push(missing);
              delete currentPayload[missing];
              continue;
            }
          }

          return { data: null, error };
        }

        return {
          data: null,
          error: {
            code: 'PGRST204',
            message: 'Too many missing columns while creating client. Please run DB migrations and try again.'
          } as any
        };
      };

      // Then create the client record
      const insertPayload = {
        name: client.name,
        email: client.email,
        phone: client.phone || null,
        company: client.company || null,
        address: client.address || null,
        website: client.website || null,
        linkedin: client.linkedin || null,
        twitter: client.twitter || null,
        instagram: client.instagram || null,
        youtube: client.youtube || null,
        facebook: client.facebook || null,
        tiktok: client.tiktok || null,
        notes: client.notes || null,
        status: client.status || 'active',
        service_type: client.service_type || null,
        client_tier: client.client_tier || null,
        source: client.source || null,
        first_name: client.first_name || null,
        category: client.category || null,
        location: client.location || null,
        services_requested: client.services_requested || []
      };

      const { data, error } = await upsertWithFallback(insertPayload);

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === '42501') {
          throw new Error('Permission denied. Please ensure you have the necessary permissions to create clients.');
        }
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Client created successfully:', data);
      return data as Client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Client>) {
    if (!isSupabaseAvailable()) {
      const clientIndex = mockClients.findIndex(c => c.id === id);
      if (clientIndex === -1) throw new Error('Client not found');

      const updatedClient = {
        ...mockClients[clientIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      mockClients[clientIndex] = updatedClient;
      saveToStorage('wise_media_clients', mockClients);
      console.log('Mock client updated:', updatedClient);
      return updatedClient;
    }

    const sb = getSupabaseClient();

    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(payload, 'source')) {
      const allowedSources = ['Referral', 'Instagram', 'X', 'Repeat', 'Other'];
      const value = payload.source;
      if (value === '' || value === undefined || value === null) {
        payload.source = null;
      } else if (!allowedSources.includes(value)) {
        payload.source = null;
      }
    }

    const { data, error } = await sb
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async delete(id: string) {
    if (!isSupabaseAvailable()) {
      const clientIndex = mockClients.findIndex(c => c.id === id);
      if (clientIndex === -1) throw new Error('Client not found');
      mockClients.splice(clientIndex, 1);
      saveToStorage('wise_media_clients', mockClients);
      console.log('Mock client deleted:', id);
      return;
    }

    const sb = getSupabaseClient();
    const { error } = await sb
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateByEmail(email: string, updates: Partial<Client>) {
    if (!isSupabaseAvailable()) {
      const clientIndex = mockClients.findIndex(c => c.email === email);
      if (clientIndex === -1) throw new Error('Client not found');

      const updatedClient = {
        ...mockClients[clientIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      mockClients[clientIndex] = updatedClient;
      saveToStorage('wise_media_clients', mockClients);
      console.log('Mock client updated by email:', updatedClient);
      return updatedClient;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Client | null;
  }
};

// Project operations
export const projectService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      // Return mock projects with client data
      const clients = await clientService.getAll();
      return mockProjects.map(project => ({
        ...project,
        client: clients.find(c => c.id === project.client_id)
      }));
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('projects')
      .select(`
        *,
        client:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  },

  async getByClientId(clientId: string) {
    if (!isSupabaseAvailable()) {
      const clients = await clientService.getAll();
      return mockProjects
        .filter(project => project.client_id === clientId)
        .map(project => ({
          ...project,
          client: clients.find(c => c.id === project.client_id)
        }));
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('projects')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  },

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) {
    if (!isSupabaseAvailable()) {
      const newProject: Project = {
        ...project,
        id: `project_${nextMockId++}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockProjects.push(newProject);
      saveToStorage('wise_media_projects', mockProjects);

      // Return with client data
      const clients = await clientService.getAll();
      return {
        ...newProject,
        client: clients.find(c => c.id === newProject.client_id)
      };
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('projects')
      .insert([project])
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Project;
  },

  async update(id: string, updates: Partial<Project>) {
    if (!isSupabaseAvailable()) {
      const projectIndex = mockProjects.findIndex(p => p.id === id);
      if (projectIndex === -1) throw new Error('Project not found');

      const updatedProject = {
        ...mockProjects[projectIndex],
        ...updates,
        id: mockProjects[projectIndex].id, // Ensure ID is preserved
        updated_at: new Date().toISOString()
      };
      mockProjects[projectIndex] = updatedProject;
      saveToStorage('wise_media_projects', mockProjects);

      // Return with client data
      const clients = await clientService.getAll();
      return {
        ...updatedProject,
        client: clients.find(c => c.id === updatedProject.client_id)
      };
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Project;
  },

  async delete(id: string) {
    if (!isSupabaseAvailable()) {
      const projectIndex = mockProjects.findIndex(p => p.id === id);
      if (projectIndex === -1) throw new Error('Project not found');
      mockProjects.splice(projectIndex, 1);
      saveToStorage('wise_media_projects', mockProjects);
      return;
    }

    const sb = getSupabaseClient();
    const { error } = await sb
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Invoice operations
export const invoiceService = {
  async getForCurrentUser() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('invoices')
      .select(`
        *,
        client:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  },

  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('invoices')
      .select(`
        *,
        client:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  },

  async getByClientId(clientId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('invoices')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  },

  async create(invoice: CreateInvoice) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('invoices')
      .insert([invoice])
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  async update(id: string, updates: Partial<Invoice>) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('invoices')
      .update({ ...updates })
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  async delete(id: string) {
    const sb = getSupabaseClient();
    const { error } = await sb
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// @deprecated Use proposalService from src/lib/proposalService.ts for better feature support
export const proposalService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('proposals')
      .select(`
        *,
        client:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Proposal[];
  },

  async getByClientId(clientId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('proposals')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Proposal[];
  },

  async create(proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'client'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('proposals')
      .insert([proposal])
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Proposal;
  },

  async update(id: string, updates: Partial<Proposal>) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('proposals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Proposal;
  },

  async delete(id: string) {
    const sb = getSupabaseClient();
    const { error } = await sb
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Appointment operations
export const appointmentService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('appointments')
      .select(`
        *,
        client:clients(*)
      `)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return data as Appointment[];
  },

  async getByClientId(clientId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('appointments')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return data as Appointment[];
  },

  async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'client'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('appointments')
      .insert([appointment])
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async update(id: string, updates: Partial<Appointment>) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('appointments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async delete(id: string) {
    const sb = getSupabaseClient();
    const { error } = await sb
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Meeting operations
export const meetingService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .order('meeting_date', { ascending: false });

    if (error) throw error;
    return data as Meeting[];
  },

  async getById(id: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Meeting;
  },

  async getByClientId(clientId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .eq('client_id', clientId)
      .order('meeting_date', { ascending: false });

    if (error) throw error;
    return data as Meeting[];
  },

  async getByProjectId(projectId: string) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false });

    if (error) throw error;
    return data as Meeting[];
  },

  async getByStatus(status: MeetingStatus) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .eq('status', status)
      .order('meeting_date', { ascending: false });

    if (error) throw error;
    return data as Meeting[];
  },

  async getLiveMeetings() {
    return this.getByStatus('live');
  },

  async getUpcoming() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const now = new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('meetings')
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .eq('status', 'scheduled')
      .gte('meeting_date', now)
      .order('meeting_date', { ascending: true });

    if (error) throw error;
    return data as Meeting[];
  },

  async create(meeting: CreateMeeting) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .insert([meeting])
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    return data as Meeting;
  },

  async update(id: string, updates: Partial<Meeting>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meetings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    return data as Meeting;
  },

  async updateStatus(id: string, status: MeetingStatus) {
    return this.update(id, { status });
  },

  async startRecording(id: string) {
    return this.update(id, {
      is_recording: true,
      recording_started_at: new Date().toISOString(),
      status: 'live'
    });
  },

  async stopRecording(id: string) {
    return this.update(id, {
      is_recording: false,
      status: 'processing'
    });
  },

  async delete(id: string) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { error } = await sb
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Recording operations
  async getRecording(meetingId: string) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meeting_recordings')
      .select('*')
      .eq('meeting_id', meetingId)
      .maybeSingle();

    if (error) throw error;
    return data as MeetingRecording | null;
  },

  // Transcript operations
  async getTranscript(meetingId: string) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .maybeSingle();

    if (error) throw error;
    return data as MeetingTranscript | null;
  },

  async createTranscript(transcript: Omit<MeetingTranscript, 'id' | 'created_at' | 'updated_at'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meeting_transcripts')
      .insert([transcript])
      .select('*')
      .single();

    if (error) throw error;
    return data as MeetingTranscript;
  },

  // Summary operations
  async getSummary(meetingId: string) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meeting_summaries')
      .select('*')
      .eq('meeting_id', meetingId)
      .maybeSingle();

    if (error) throw error;
    return data as MeetingSummary | null;
  },

  async createSummary(summary: Omit<MeetingSummary, 'id' | 'created_at' | 'updated_at'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meeting_summaries')
      .insert([summary])
      .select('*')
      .single();

    if (error) throw error;
    return data as MeetingSummary;
  },

  async updateSummary(id: string, updates: Partial<MeetingSummary>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('meeting_summaries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as MeetingSummary;
  },

  // Permission helpers
  canUserAccessMeeting(userRole: UserRole, meeting: Meeting): boolean {
    // Admin and Staff can access all meetings
    if (userRole === 'admin' || userRole === 'staff') {
      return true;
    }

    // Clients can only access meetings where they are participants or linked client
    // This would need to check if the current user's email matches a participant
    // For now, returning false for non-admin/staff
    return false;
  },

  canUserGenerateSummary(userRole: UserRole): boolean {
    // Only admins can trigger AI summary generation
    return userRole === 'admin';
  },

  canUserShare(userRole: UserRole): boolean {
    // Only admins can share content with clients
    return userRole === 'admin';
  },

  canUserRecord(userRole: UserRole): boolean {
    // Only admins can record meetings
    return userRole === 'admin';
  }
};

export const noteService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('notes')
      .select(`
        *,
        client:clients!clientId(*),
        project:projects!projectId(*)
      `)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as Note[]) || [];
  },

  async getById(id: string) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('notes')
      .select(`
        *,
        client:clients!clientId(*),
        project:projects!projectId(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Note | null;
  },

  async getByClient(clientId: string) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('notes')
      .select(`
        *,
        client:clients!clientId(*),
        project:projects!projectId(*)
      `)
      .eq('clientId', clientId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as Note[]) || [];
  },

  async getByProject(projectId: string) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('notes')
      .select(`
        *,
        client:clients!clientId(*),
        project:projects!projectId(*)
      `)
      .eq('projectId', projectId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as Note[]) || [];
  },

  async create(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
    const sb = getSupabaseClient();
    const { data: userData } = await sb.auth.getUser();

    const { data, error } = await sb
      .from('notes')
      .insert({
        ...note,
        authorUserId: userData?.user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        client:clients!clientId(*),
        project:projects!projectId(*)
      `)
      .single();

    if (error) throw error;

    // Log audit event
    await noteAuditService.log({
      note_id: data.id,
      actor_id: userData?.user?.id || '',
      action: 'note_created',
      metadata: { title: data.title }
    });

    return data as Note;
  },

  async update(id: string, updates: Partial<Note>) {
    const sb = getSupabaseClient();
    const { data: userData } = await sb.auth.getUser();

    const { data, error } = await sb
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        client:clients!clientId(*),
        project:projects!projectId(*)
      `)
      .single();

    if (error) throw error;

    // Log audit event
    await noteAuditService.log({
      note_id: id,
      actor_id: userData?.user?.id || '',
      action: 'note_updated',
      metadata: { fields: Object.keys(updates) }
    });

    return data as Note;
  },

  async delete(id: string) {
    const sb = getSupabaseClient();
    const { data: userData } = await sb.auth.getUser();

    const { error } = await sb
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log audit event
    await noteAuditService.log({
      note_id: id,
      actor_id: userData?.user?.id || '',
      action: 'note_deleted',
      metadata: {}
    });
  },

  async togglePin(id: string, pinned: boolean) {
    return this.update(id, { pinned });
  }
};

export const noteAuditService = {
  async log(entry: Omit<NoteAudit, 'id' | 'created_at'>) {
    if (!isSupabaseAvailable()) return;

    const sb = getSupabaseClient();
    const { error } = await sb
      .from('note_audit_log')
      .insert([entry]);

    if (error) {
      console.error('Error logging note audit event:', error);
    }
  },

  async getByNoteId(noteId: string) {
    if (!isSupabaseAvailable()) return [];

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('note_audit_log')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as NoteAudit[];
  }
};

// Documents (Supabase Storage + metadata)
let mockDocuments: DocumentRecord[] = JSON.parse(localStorage.getItem('wise_media_documents') || '[]');

export const documentsService = {
  async list() {
    if (!isSupabaseAvailable()) {
      return mockDocuments;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as DocumentRecord[]) || [];
  },

  async upload(file: File, meta?: { owner_team?: string; status?: string }) {
    if (!isSupabaseAvailable()) {
      const id = generateId();
      const now = new Date().toISOString();
      const record: DocumentRecord = {
        id,
        bucket_id: 'documents',
        path: id,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        owner_team: meta?.owner_team || null,
        status: meta?.status || null,
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      mockDocuments = [record, ...mockDocuments];
      saveToStorage('wise_media_documents', mockDocuments);
      return record;
    }

    const sb = getSupabaseClient();
    const fileExt = file.name.split('.').pop();
    const randomPart = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as Crypto).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileName = fileExt ? `${randomPart}.${fileExt}` : randomPart;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await sb.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await sb
      .from('documents')
      .insert([
        {
          bucket_id: 'documents',
          path: filePath,
          filename: file.name,
          content_type: file.type || null,
          size_bytes: file.size,
          owner_team: meta?.owner_team || null,
          status: meta?.status || null,
        },
      ])
      .select('*')
      .single();

    if (insertError) throw insertError;
    return inserted as DocumentRecord;
  },

  async update(id: string, patch: Partial<Pick<DocumentRecord, 'status' | 'owner_team' | 'filename'>>) {
    if (!id) throw new Error('Document id is required');

    if (!isSupabaseAvailable()) {
      mockDocuments = mockDocuments.map(d =>
        d.id === id
          ? {
            ...d,
            ...patch,
            updated_at: new Date().toISOString(),
          }
          : d
      );
      saveToStorage('wise_media_documents', mockDocuments);
      return mockDocuments.find(d => d.id === id) || null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('documents')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return (data as DocumentRecord) || null;
  },

  async getSignedUrl(path: string, expiresInSeconds = 60) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb.storage.from('documents').createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async delete(record: Pick<DocumentRecord, 'id' | 'path'>) {
    if (!isSupabaseAvailable()) {
      mockDocuments = mockDocuments.filter(d => d.id !== record.id);
      saveToStorage('wise_media_documents', mockDocuments);
      return;
    }

    const sb = getSupabaseClient();

    const { error: storageError } = await sb.storage.from('documents').remove([record.path]);
    if (storageError) throw storageError;

    const { error: dbError } = await sb.from('documents').delete().eq('id', record.id);
    if (dbError) throw dbError;
  },
};

// Files (New system with context linking)
let mockFiles: FileRecord[] = JSON.parse(localStorage.getItem('wise_media_files') || '[]');

export const filesService = {
  async list() {
    if (!isSupabaseAvailable()) {
      return mockFiles;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('files')
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        meeting:appointments(*),
        note:notes(*)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as FileRecord[]) || [];
  },

  async upload(file: File, meta: {
    client_id?: string;
    project_id?: string;
    meeting_id?: string;
    note_id?: string;
    visibility?: FileVisibility;
    status?: FileStatus;
  }) {
    if (!isSupabaseAvailable()) {
      const id = generateId();
      const now = new Date().toISOString();
      const record: FileRecord = {
        id,
        bucket_id: 'files',
        path: id,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        status: meta.status || 'draft',
        visibility: meta.visibility || 'private',
        owner_id: 'current_user', // Mock
        client_id: meta.client_id || null,
        project_id: meta.project_id || null,
        meeting_id: meta.meeting_id || null,
        note_id: meta.note_id || null,
        created_at: now,
        updated_at: now,
      };
      mockFiles = [record, ...mockFiles];
      saveToStorage('wise_media_files', mockFiles);
      return record;
    }

    const sb = getSupabaseClient();
    const { data: { user } } = await sb.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const randomPart = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as Crypto).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileName = fileExt ? `${randomPart}.${fileExt}` : randomPart;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await sb.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await sb
      .from('files')
      .insert([
        {
          bucket_id: 'files',
          path: filePath,
          filename: file.name,
          content_type: file.type || null,
          size_bytes: file.size,
          status: meta.status || 'draft',
          visibility: meta.visibility || 'private',
          created_by: user?.id || '',
          client_id: meta.client_id || null,
          project_id: meta.project_id || null,
          meeting_id: meta.meeting_id || null,
          note_id: meta.note_id || null,
        },
      ])
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        meeting:appointments(*),
        note:notes(*)
      `)
      .single();

    if (insertError) throw insertError;
    return inserted as FileRecord;
  },

  async update(id: string, patch: Partial<FileRecord>) {
    if (!isSupabaseAvailable()) {
      mockFiles = mockFiles.map(f =>
        f.id === id
          ? {
            ...f,
            ...patch,
            updated_at: new Date().toISOString(),
          }
          : f
      );
      saveToStorage('wise_media_files', mockFiles);
      return mockFiles.find(f => f.id === id) || null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('files')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        meeting:appointments(*),
        note:notes(*)
      `)
      .single();

    if (error) throw error;
    return (data as FileRecord) || null;
  },

  async getById(id: string) {
    if (!isSupabaseAvailable()) {
      return mockFiles.find(f => f.id === id) || null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('files')
      .select(`
        *,
        client:clients(*),
        project:projects(*),
        meeting:appointments(*),
        note:notes(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return (data as FileRecord) || null;
  },

  async getSignedUrl(path: string, expiresInSeconds = 60) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const sb = getSupabaseClient();
    const { data, error } = await sb.storage.from('files').createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async delete(record: Pick<FileRecord, 'id' | 'path'>) {
    if (!isSupabaseAvailable()) {
      mockFiles = mockFiles.filter(f => f.id !== record.id);
      saveToStorage('wise_media_files', mockFiles);
      return;
    }

    const sb = getSupabaseClient();

    const { error: storageError } = await sb.storage.from('files').remove([record.path]);
    if (storageError) throw storageError;

    const { error: dbError } = await sb.from('files').delete().eq('id', record.id);
    if (dbError) throw dbError;
  },
};
