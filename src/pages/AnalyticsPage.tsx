import GlassCard from '../components/GlassCard';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Integral CF, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Analytics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Revenue</p>
              <p className="text-2xl font-bold text-white">$45,231</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="text-green-400" size={16} />
                <span className="text-green-400 text-sm">+12.5%</span>
              </div>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">New Clients</p>
              <p className="text-2xl font-bold text-white">23</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="text-green-400" size={16} />
                <span className="text-green-400 text-sm">+8.2%</span>
              </div>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="text-blue-400" size={24} />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Active Projects</p>
              <p className="text-2xl font-bold text-white">12</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown className="text-red-400" size={16} />
                <span className="text-red-400 text-sm">-3.1%</span>
              </div>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <BarChart3 className="text-purple-400" size={24} />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 mb-1">Avg. Project Value</p>
              <p className="text-2xl font-bold text-white">$3,769</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="text-green-400" size={16} />
                <span className="text-green-400 text-sm">+5.4%</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <DollarSign className="text-yellow-400" size={24} />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-xl font-semibold text-white mb-4">Revenue Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {[40, 65, 45, 80, 55, 75, 90, 70, 85, 95, 88, 100].map((height, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg" style={{ height: `${height}%` }}></div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-gray-400 text-xs">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
          <span>Jul</span>
          <span>Aug</span>
          <span>Sep</span>
          <span>Oct</span>
          <span>Nov</span>
          <span>Dec</span>
        </div>
      </GlassCard>
    </div>
  );
}
