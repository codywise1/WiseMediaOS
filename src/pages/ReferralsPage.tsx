import GlassCard from '../components/GlassCard';
import { TrendingUp, Users, DollarSign, Copy } from 'lucide-react';

export default function ReferralsPage() {
  const referralLink = 'https://wisemedia.io/ref/your-code';

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Referrals
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-white">24</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="text-blue-400" size={24} />
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Earnings</p>
              <p className="text-2xl font-bold text-white">$1,240</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">This Month</p>
              <p className="text-2xl font-bold text-white">8</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Referral Link</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
          />
          <button className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
            <Copy size={20} />
            Copy
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recent Referrals</h2>
        <div className="space-y-3">
          {[
            { name: 'John Doe', status: 'Active', earnings: '$52', date: '2025-10-10' },
            { name: 'Jane Smith', status: 'Active', earnings: '$52', date: '2025-10-08' },
            { name: 'Bob Johnson', status: 'Pending', earnings: '$0', date: '2025-10-05' },
          ].map((referral, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {referral.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-white font-medium">{referral.name}</p>
                  <p className="text-gray-400">{referral.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{referral.earnings}</p>
                <span className={`text-sm ${referral.status === 'Active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {referral.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
