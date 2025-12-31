import GlassCard from '../components/GlassCard';
import { Users, Plus, Mail, Phone } from 'lucide-react';

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Clients
        </h1>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
          <Plus size={20} />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'John Doe', company: 'Tech Corp', email: 'john@techcorp.com', phone: '+1 234 567 8900' },
          { name: 'Jane Smith', company: 'Design Studio', email: 'jane@design.com', phone: '+1 234 567 8901' },
          { name: 'Bob Johnson', company: 'Marketing Inc', email: 'bob@marketing.com', phone: '+1 234 567 8902' },
        ].map((client, i) => (
          <GlassCard key={i}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{client.name}</h3>
                  <p className="text-gray-400">{client.company}</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail size={14} />
                  {client.email}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone size={14} />
                  {client.phone}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
