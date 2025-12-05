import React from 'react';
import { DocumentTextIcon, CreditCardIcon, TruckIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const orders = [
  { id: 'ORD-1024', client: 'Acme Corp', total: '$4,200', status: 'Processing', date: '2025-05-04', method: 'Stripe' },
  { id: 'ORD-1023', client: 'Nova Labs', total: '$1,180', status: 'Paid', date: '2025-05-02', method: 'PayPal' },
  { id: 'ORD-1022', client: 'Pixel Studio', total: '$890', status: 'Shipped', date: '2025-05-01', method: 'Card' },
  { id: 'ORD-1021', client: 'Orion Media', total: '$2,430', status: 'Pending', date: '2025-04-29', method: 'Invoice' },
];

const statusStyles: Record<string, string> = {
  Paid: 'text-emerald-300 bg-emerald-500/10 border border-emerald-400/30',
  Processing: 'text-blue-300 bg-blue-500/10 border border-blue-400/30',
  Shipped: 'text-indigo-200 bg-indigo-500/10 border border-indigo-400/30',
  Pending: 'text-amber-200 bg-amber-500/10 border border-amber-400/30',
};

export default function Orders() {
  return (
    <div className="p-6 space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#8AB5EB] font-medium">Sales</p>
            <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
              Orders & Payments
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Track order status, confirm payments, and review the payment method used by each client.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
            <CheckBadgeIcon className="h-5 w-5 text-emerald-300" />
            <span className="text-sm">Secure payments</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <p className="text-sm text-gray-400">Open orders</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">12</span>
            <span className="text-xs text-emerald-300">+3 today</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <p className="text-sm text-gray-400">Weekly revenue</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">$18,420</span>
            <span className="text-xs text-emerald-300">+12%</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <p className="text-sm text-gray-400">Pending payments</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">$3,180</span>
            <span className="text-xs text-amber-200">4 orders</span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-white/5 border-b border-white/10">
          <div className="col-span-2">ID</div>
          <div className="col-span-3">Client</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Method</div>
        </div>
        <div className="divide-y divide-white/10">
          {orders.map(order => (
            <div key={order.id} className="grid grid-cols-12 px-4 py-4 items-center text-sm text-white/90 hover:bg-white/5 transition">
              <div className="col-span-2 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-[#8AB5EB]" />
                <span className="font-semibold">{order.id}</span>
              </div>
              <div className="col-span-3 text-gray-200">{order.client}</div>
              <div className="col-span-2 text-gray-200">{order.total}</div>
              <div className="col-span-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[order.status] || 'bg-white/5 text-gray-300'}`}>
                  {order.status}
                </span>
              </div>
              <div className="col-span-2 text-gray-300">{order.date}</div>
              <div className="col-span-1 flex justify-end text-gray-300">
                {order.method === 'Stripe' ? <CreditCardIcon className="h-5 w-5" /> : order.method === 'Invoice' ? <TruckIcon className="h-5 w-5" /> : <CreditCardIcon className="h-5 w-5" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
