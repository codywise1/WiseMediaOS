import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const forceDemoMode = import.meta.env.VITE_FORCE_DEMO_MODE === 'true';

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

// Authentication functions
export const authService = {
  async signUp(email: string, password: string, userData: { name: string, phone?: string, role?: 'admin' | 'user' }) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    // Automatically make icodywise@gmail.com an admin
    const userRole = email.toLowerCase() === 'icodywise@gmail.com' ? 'admin' : (userData.role || 'user');

    const { data, error } = await supabase.auth.signUp({
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

    const { data, error } = await supabase.auth.signInWithPassword({
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

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    if (!isSupabaseAvailable()) {
      return { data: { subscription: null } };
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
};

// Mock data for demo mode only (when Supabase is not configured)
let mockClients: Client[] = JSON.parse(localStorage.getItem('wise_media_clients') || '[]');
let mockProjects: Project[] = JSON.parse(localStorage.getItem('wise_media_projects') || '[]');
let mockInvoices: Invoice[] = JSON.parse(localStorage.getItem('wise_media_invoices') || '[]');
let mockProposals: Proposal[] = JSON.parse(localStorage.getItem('wise_media_proposals') || '[]');
let mockAppointments: Appointment[] = JSON.parse(localStorage.getItem('wise_media_appointments') || '[]');
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
  notes?: string;
  status: 'active' | 'inactive' | 'prospect' | 'archived';
  service_type?: 'Website' | 'Branding' | 'Retainer' | 'Ads' | 'Other';
  client_tier?: 'Lead' | 'Active' | 'Past' | 'VIP';
  source?: 'Referral' | 'Instagram' | 'X' | 'Repeat' | 'Other';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
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
  amount: number;
  description: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Proposal {
  id: string;
  client_id: string;
  title: string;
  description: string;
  value: number;
  status: 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected';
  services: string[];
  expiry_date: string;
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

// Support operations
export const supportService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Client[];
  },

  async getById(id: string) {
    if (!isSupabaseAvailable()) {
      const client = mockClients.find(c => c.id === id);
      if (!client) throw new Error('Client not found');
      return client;
    }

    const { data, error } = await supabase
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

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated. Please log in to create clients.');
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: client.name,
          email: client.email,
          phone: client.phone || null,
          company: client.company || null,
          address: client.address || null,
          website: client.website || null,
          notes: client.notes || null,
          status: client.status || 'active',
          service_type: client.service_type || null,
          client_tier: client.client_tier || null,
          source: client.source || null
        }])
        .select()
        .single();
      
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

    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Invoice operations
export const invoiceService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

  async create(invoice: Omit<Invoice, 'created_at' | 'updated_at' | 'client'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Proposal operations
export const proposalService = {
  async getAll() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

  async create(proposal: Omit<Proposal, 'created_at' | 'updated_at' | 'client'>) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
