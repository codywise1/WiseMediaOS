import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import PayPalButton from './PayPalButton';
import { useToast } from '../contexts/ToastContext';
import { 
  CreditCardIcon, 
  BanknotesIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface Invoice {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: string;
  createdDate: string;
  description: string;
  client_id?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: (paymentDetails: any) => void;
}

export default function PaymentModal({ isOpen, onClose, invoice, onPaymentSuccess }: PaymentModalProps) {
  const { error: toastError, info: toastInfo } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | 'bank' | 'solana'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationPhase, setVerificationPhase] = useState<'verifying' | 'pending' | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [completedMethod, setCompletedMethod] = useState<'paypal' | 'card' | 'bank' | 'solana' | null>(null);
  const [paymentMeta, setPaymentMeta] = useState<{
    signature?: string;
    wallet?: string;
    network?: 'mainnet' | 'devnet';
    methodLabel?: string;
    solAmount?: number;
  } | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [solPriceUSD, setSolPriceUSD] = useState<number | null>(null);
  const treasuryAddress = import.meta.env.VITE_SOLANA_TREASURY || '';
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL;
  const [availableWallets, setAvailableWallets] = useState<{ id: string; label: string }[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const solanaNetwork: 'mainnet' | 'devnet' = (import.meta.env.VITE_SOLANA_NETWORK || 'mainnet') === 'devnet' ? 'devnet' : 'mainnet';

  const walletLogos: Record<string, string> = {
    phantom: 'https://wiseos.s3.us-east-2.amazonaws.com/Phantom_SVG_Icon.svg',
    solflare: 'https://www.solflare.com/wp-content/uploads/2024/11/App-Icon.svg',
    backpack: 'https://backpack.app/favicon.ico',
    glow: 'https://glow.app/favicon-32x32.png',
    exodus: 'https://www.exodus.com/favicon-32x32.png',
    coinbase: 'https://www.coinbase.com/favicon.ico'
  };

  const renderWalletIcon = (id: string, label: string) => {
    const src = walletLogos[id];
    if (src) {
      return (
        <img
          src={src}
          alt={label}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/10 object-contain p-2 shadow-lg shadow-blue-500/10"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3aa3eb] to-purple-500 text-white flex items-center justify-center font-semibold">
        {label[0]}
      </div>
    );
  };

  const handleSuccessClose = () => {
    setPaymentComplete(false);
    setCompletedMethod(null);
    setPaymentMeta(null);
    setIsVerifying(false);
    setVerificationPhase(null);
    setVerificationError(null);
    onClose();
  };

  const pollingRef = useRef<{ timeoutId: number | null; attempts: number }>(
    { timeoutId: null, attempts: 0 }
  );

  const clearPolling = () => {
    if (pollingRef.current.timeoutId) {
      window.clearTimeout(pollingRef.current.timeoutId);
      pollingRef.current.timeoutId = null;
    }
    pollingRef.current.attempts = 0;
  };

  const verifyPayPalPayment = async (payload: any) => {
    if (!isSupabaseAvailable() || !supabase) {
      throw new Error('Supabase not configured');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      throw new Error('Missing access token');
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-paypal-payment`;
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const msg = json?.error || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json;
  };

  useEffect(() => {
    if (!isOpen) {
      clearPolling();
      setIsVerifying(false);
      setVerificationPhase(null);
      setVerificationError(null);
      setIsWalletModalOpen(false);
      return;
    }

    return () => {
      clearPolling();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isVerifying || verificationPhase !== 'pending') {
      return;
    }

    const maxAttempts = 24; // ~2 minutes at 5s interval
    const intervalMs = 5000;

    const tick = async () => {
      pollingRef.current.attempts += 1;

      if (pollingRef.current.attempts > maxAttempts) {
        setIsVerifying(false);
        setVerificationPhase(null);
        setIsProcessing(false);
        setVerificationError('The payment is still PENDING. Please try again in a few minutes.');
        toastInfo('The payment is still PENDING. Please try again in a few minutes.');
        clearPolling();
        return;
      }

      try {
        const json = await verifyPayPalPayment({ invoiceId: invoice.id, amount: invoice.amount, currency: 'USD' });
        if (json?.status === 'paid') {
          setIsVerifying(false);
          setVerificationPhase(null);
          setVerificationError(null);
          setIsProcessing(false);

          setCompletedMethod('paypal');
          setPaymentMeta({ methodLabel: 'PayPal' });
          setPaymentComplete(true);

          onPaymentSuccess({
            invoiceId: invoice.id,
            amount: invoice.amount,
            method: 'PayPal',
            status: 'COMPLETED',
          });

          clearPolling();
          return;
        }

        setVerificationPhase('pending');
      } catch (e: any) {
        setIsVerifying(false);
        setVerificationPhase(null);
        setIsProcessing(false);
        setVerificationError(e?.message || 'Error verificando el pago.');
        toastError(e?.message || 'Error verificando el pago.');
        clearPolling();
        return;
      }

      pollingRef.current.timeoutId = window.setTimeout(tick, intervalMs);
    };

    pollingRef.current.timeoutId = window.setTimeout(tick, intervalMs);
    return () => {
      clearPolling();
    };
  }, [isOpen, isVerifying, verificationPhase, invoice.id, invoice.amount, onPaymentSuccess, toastError, toastInfo]);

  const generateReceiptContent = () => {
    const date = new Date().toLocaleString();
    const receiptId = `RCP-${Date.now()}`;
    let content = `
════════════════════════════════════════
           PAYMENT RECEIPT
════════════════════════════════════════

Receipt ID: ${receiptId}
Date: ${date}

────────────────────────────────────────
INVOICE DETAILS
────────────────────────────────────────
Invoice ID: ${invoice.id}
Client: ${invoice.client}
Description: ${invoice.description}
Due Date: ${invoice.dueDate}

────────────────────────────────────────
PAYMENT DETAILS
────────────────────────────────────────
Amount: $${invoice.amount.toLocaleString()} USD
Method: ${paymentMeta?.methodLabel || 'N/A'}
Status: PAID ✓
`;
    if (completedMethod === 'solana') {
      content += `
────────────────────────────────────────
BLOCKCHAIN DETAILS
────────────────────────────────────────
Network: ${paymentMeta?.network?.toUpperCase()}
Wallet: ${paymentMeta?.wallet}
Signature: ${paymentMeta?.signature}
Amount: ${(paymentMeta?.solAmount || 0).toFixed(6)} SOL
`;
    }
    content += `
════════════════════════════════════════
        Thank you for your payment!
           Wise Media LLC
════════════════════════════════════════
`;
    return { content, receiptId };
  };

  const handleViewReceipt = () => {
    const { content } = generateReceiptContent();
    const newWindow = window.open('', '_blank', 'width=600,height=700');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Payment Receipt - ${invoice.id}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                background: #0F172A;
                color: #E2E8F0;
                padding: 40px;
                margin: 0;
                min-height: 100vh;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                background: #1E293B;
                padding: 30px;
                border-radius: 12px;
                border: 1px solid #334155;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                background: linear-gradient(135deg, #3AA3EB, #10B981);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              .print-btn {
                display: block;
                margin: 20px auto;
                padding: 12px 24px;
                background: #3AA3EB;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
              }
              .print-btn:hover { background: #2B8ACB; }
              @media print {
                .print-btn { display: none; }
                body { background: white; color: black; }
                pre { background: #f5f5f5; border-color: #ddd; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">WISE MEDIA</div>
            </div>
            <pre>${content}</pre>
            <button class="print-btn" onclick="window.print()">Print Receipt</button>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleDownloadReceipt = () => {
    const { content, receiptId } = generateReceiptContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatHash = (value?: string, chars = 4) => {
    if (!value) return '—';
    return `${value.slice(0, chars)}…${value.slice(-chars)}`;
  };

  const handlePayPalSuccess = async (details: any) => {
    setIsProcessing(true);
    setIsVerifying(true);
    setVerificationPhase('verifying');
    setVerificationError(null);
    try {
      const orderId = details?.orderId;
      const captureId = details?.captureId;

      const payload = {
        invoiceId: invoice.id,
        amount: invoice.amount,
        currency: 'USD',
        orderId,
        captureId,
      };

      console.log('[PayPal] verify-paypal-payment payload', payload);

      const json = await verifyPayPalPayment(payload);
      if (!json?.success) {
        throw new Error(json?.error || 'Verification failed');
      }

      if (json?.status === 'pending') {
        setVerificationPhase('pending');
        setIsProcessing(true);
        return;
      }

      setIsProcessing(false);
      setIsVerifying(false);
      setVerificationPhase(null);
      setVerificationError(null);
      setCompletedMethod('paypal');
      setPaymentMeta({ methodLabel: 'PayPal' });
      setPaymentComplete(true);

      onPaymentSuccess({
        ...details,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: 'PayPal'
      });

    } catch (e) {
      console.error('Error verifying PayPal payment:', e);
      setIsProcessing(false);
      setIsVerifying(false);
      setVerificationPhase(null);
      setVerificationError((e as any)?.message || 'Ocurrió un error al verificar el pago.');
      toastError((e as any)?.message || 'Ocurrió un error al verificar el pago.');
    }
  };

  const handlePayPalError = (error: any) => {
    console.error('Payment failed:', error);
    toastError('Payment failed. Please try again or contact support.');
  };

  const detectWallets = () => {
    const w: any = window as any;
    const list: { id: string; label: string }[] = [];
    const seen = new Set<string>();
    const addWallet = (id: string, label: string) => {
      if (!seen.has(id)) {
        list.push({ id, label });
        seen.add(id);
      }
    };

    const candidates = Array.isArray(w.solana?.providers) ? w.solana.providers : (w.solana ? [w.solana] : []);
    for (const p of candidates) {
      const name = (p?.name || p?.wallet?.adapter?.name || '').toLowerCase();
      if (p?.isPhantom || name === 'phantom') addWallet('phantom', 'Phantom');
      if (p?.isSolflare || name === 'solflare' || w.solflare) addWallet('solflare', 'Solflare');
      if (p?.isBackpack || name === 'backpack') addWallet('backpack', 'Backpack');
      if (p?.isExodus || name === 'exodus') addWallet('exodus', 'Exodus');
      if (p?.isCoinbaseWallet || name === 'coinbase') addWallet('coinbase', 'Coinbase');
      if (w.glow?.solana || w.glow) addWallet('glow', 'Glow');
    }

    // Direct globals (covers multi-wallet adapters that hide default provider)
    if (w.phantom?.solana || w.solana?.isPhantom) addWallet('phantom', 'Phantom');
    if (!seen.has('phantom') && (w.phantom || w.solana?.provider?.isPhantom || w.solana?.wallet?.isPhantom)) {
      addWallet('phantom', 'Phantom');
    }
    if (w.solflare?.isSolflare || w.solflare) addWallet('solflare', 'Solflare');
    if (w.backpack?.solana || w.solana?.isBackpack) addWallet('backpack', 'Backpack');
    if (w.glow?.solana || w.glow) addWallet('glow', 'Glow');
    if (w.exodus?.solana || w.solana?.isExodus) addWallet('exodus', 'Exodus');
    if (w.coinbaseWallet?.solana || w.solana?.isCoinbaseWallet) addWallet('coinbase', 'Coinbase');

    // If no wallets were found but Phantom might be installed late, show a manual option
    if (!seen.has('phantom')) {
      addWallet('phantom', 'Phantom');
    }

    // Sort by preferred order so Phantom appears first when present
    const priority = ['phantom', 'solflare', 'backpack', 'glow', 'exodus', 'coinbase'];
    list.sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id));

    setAvailableWallets(list);
    if (!selectedWallet && list.length) setSelectedWallet(list[0].id);
  };

  React.useEffect(() => {
    if (paymentMethod === 'solana') {
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        .then(r => r.json())
        .then(d => setSolPriceUSD(d?.solana?.usd || null))
        .catch(() => setSolPriceUSD(null));
      detectWallets();
      setTimeout(detectWallets, 300); // re-scan shortly after in case extensions inject late
      setIsWalletModalOpen(false);
    }
  }, [paymentMethod]);

  React.useEffect(() => {
    if (!isWalletModalOpen) return;
    detectWallets();
    const onFocus = () => detectWallets();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isWalletModalOpen]);

  const getSelectedProvider = (walletId?: string) => {
    const w: any = window as any;
    const providers = Array.isArray(w.solana?.providers) ? w.solana.providers : (w.solana ? [w.solana] : []);
    const pick = walletId || selectedWallet;
    if (pick === 'phantom') return w.phantom?.solana || providers.find((p: any) => p?.isPhantom) || null;
    if (pick === 'solflare') return w.solflare || providers.find((p: any) => p?.isSolflare) || null;
    if (pick === 'backpack') return w.backpack?.solana || providers.find((p: any) => p?.isBackpack) || null;
    if (pick === 'glow') return w.glow?.solana || w.glow || null;
    if (pick === 'exodus') return w.exodus?.solana || providers.find((p: any) => p?.isExodus) || null;
    if (pick === 'coinbase') return w.coinbaseWallet?.solana || providers.find((p: any) => p?.isCoinbaseWallet) || null;
    return w.solana || null;
  };

  const connectWallet = async (walletId?: string) => {
    if (walletId) {
      setSelectedWallet(walletId);
    }
    const provider = getSelectedProvider(walletId);
    if (!provider) {
      alert('No compatible Solana wallet found.');
      return;
    }
    try {
      const resp = await provider.connect();
      const pk = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.() || null;
      setWalletAddress(pk);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSolanaPayment = async () => {
    if (!walletAddress) {
      await connectWallet();
      if (!walletAddress) return;
    }
    if (!treasuryAddress) {
      alert('Treasury address not configured.');
      return;
    }
    try {
      setIsProcessing(true);
      const price = solPriceUSD || 0;
      if (!price) {
        alert('Could not load SOL price. Try again later.');
        setIsProcessing(false);
        return;
      }
      const amountSOL = invoice.amount / price;
      const connection = new Connection(rpcUrl, 'confirmed');
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(treasuryAddress);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPubkey });
      const lamportsToSend = Math.round(amountSOL * LAMPORTS_PER_SOL);
      tx.add(SystemProgram.transfer({ fromPubkey, toPubkey, lamports: lamportsToSend }));
      const provider = getSelectedProvider();
      const signed = await provider.signAndSendTransaction(tx);
      const signature = signed.signature || signed?.txid || signed;
      // Wait for on-chain confirmation to ensure the transaction is indexable by RPC
      try {
        // New confirmTransaction signature with blockhash context (prevents stale blockhash issues)
        // @ts-ignore
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      } catch (_) {
        // Fallback: basic confirmation
        // @ts-ignore
        await connection.confirmTransaction(signature, 'confirmed');
      }
      // Small delay to allow RPC to serve parsed transaction
      await new Promise((r) => setTimeout(r, 2000));
      const verificationPayload = {
        invoiceId: invoice.id,
        signature,
        from: walletAddress,
        to: treasuryAddress,
        amount: amountSOL,
        lamports: lamportsToSend,
        network: solanaNetwork,
      };

      console.log('[Solana] Sending verification payload', verificationPayload);

      const { data, error } = await supabase!.functions.invoke('verify-solana-payment', {
        body: verificationPayload
      });
      if (error || !data?.success) {
        console.error('[Solana] Verification failed', {
          invoiceId: invoice.id,
          error,
          response: data,
        });
        alert('No se pudo verificar el pago en Solana.');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      setCompletedMethod('solana');
      setPaymentMeta({
        signature,
        wallet: walletAddress ?? undefined,
        network: solanaNetwork,
        solAmount: amountSOL,
        methodLabel: 'Solana',
      });
      setPaymentComplete(true);
      onPaymentSuccess({ invoiceId: invoice.id, amount: invoice.amount, method: 'Solana', signature });
    } catch (e) {
      console.error('Solana payment error', e);
      alert('Error processing Solana payment.');
      setIsProcessing(false);
    }
  };

  const handleCardPayment = () => {
    // Simulate card payment processing
    setIsProcessing(true);
    
    setTimeout(() => {
      setPaymentComplete(true);
      setIsProcessing(false);
      setCompletedMethod('card');
      setPaymentMeta({ methodLabel: 'Credit Card' });
      
      onPaymentSuccess({
        id: `CARD_${Date.now()}`,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: 'Credit Card',
        status: 'COMPLETED'
      });
      
      setTimeout(() => {
        handleSuccessClose();
      }, 0);
    }, 2000);
  };

  if (paymentComplete) {
    const receiptDate = new Date().toLocaleString();
    const receiptId = `RCP-${Date.now()}`;

    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="">
        <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] border border-slate-700">
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-[#3AA3EB] to-emerald-500 px-6 py-4 text-center">
            <h2 className="text-2xl font-black text-white tracking-wide" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
              WISE MEDIA
            </h2>
            <p className="text-white/80 text-sm mt-1">Payment Receipt</p>
          </div>

          {/* Success Badge */}
          <div className="flex justify-center -mt-5">
            <div className="h-10 w-10 rounded-full bg-emerald-500 border-4 border-[#0F172A] flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Receipt Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Receipt Info */}
            <div className="text-center border-b border-dashed border-slate-600 pb-4">
              <p className="text-xs text-gray-500">Receipt #{receiptId}</p>
              <p className="text-xs text-gray-500">{receiptDate}</p>
            </div>

            {/* Amount */}
            <div className="text-center py-3">
              <p className="text-xs uppercase text-gray-400 tracking-widest">Amount Paid</p>
              <p className="text-4xl font-black text-white mt-1" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                ${invoice.amount.toLocaleString()}
              </p>
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                Paid ✓
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-600" />

            {/* Invoice Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Invoice ID</span>
                <span className="text-white font-mono text-xs">{formatHash(invoice.id, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Client</span>
                <span className="text-white">{invoice.client}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Description</span>
                <span className="text-white text-right max-w-[180px] truncate">{invoice.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Method</span>
                <span className="text-white">{paymentMeta?.methodLabel || 'N/A'}</span>
              </div>
            </div>

            {/* Solana Details */}
            {completedMethod === 'solana' && (
              <>
                <div className="border-t border-dashed border-slate-600" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network</span>
                    <span className="text-[#3AA3EB] font-semibold">{paymentMeta?.network?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet</span>
                    <span className="text-white font-mono text-xs">{formatHash(paymentMeta?.wallet, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Signature</span>
                    <span className="text-white font-mono text-xs">{formatHash(paymentMeta?.signature, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">SOL Amount</span>
                    <span className="text-emerald-400 font-semibold">{(paymentMeta?.solAmount || 0).toFixed(6)} SOL</span>
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-slate-600" />

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 py-2">
              <p>Thank you for your payment!</p>
              <p className="mt-1">Wise Media LLC • wisemedia.io</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 space-y-3">
            <div className="flex gap-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#3AA3EB] text-[#3AA3EB] font-semibold py-2.5 hover:bg-[#3AA3EB]/10 transition text-sm"
                onClick={handleViewReceipt}
              >
                <EyeIcon className="h-4 w-4" />
                Print
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-400 text-emerald-400 font-semibold py-2.5 hover:bg-emerald-400/10 transition text-sm"
                onClick={handleDownloadReceipt}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download
              </button>
            </div>
            <button
              className="w-full rounded-xl bg-white text-slate-900 font-semibold py-2.5 hover:bg-slate-100 transition text-sm"
              onClick={handleSuccessClose}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay Invoice">
      <div className="space-y-6">
        {/* Invoice Details */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Invoice:</span>
            <span className="text-white font-medium">{invoice.id}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Amount Due:</span>
            <span className="text-2xl font-bold text-white">${invoice.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Due Date:</span>
            <span className="text-white">{invoice.dueDate}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'paypal'
                  ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-600">
                  <CreditCardIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">PayPal</p>
                  <p className="text-gray-400 text-sm">Pay securely with PayPal</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'card'
                  ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-600">
                  <CreditCardIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Credit Card</p>
                  <p className="text-gray-400 text-sm">Visa, MasterCard, American Express</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('solana')}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'solana'
                  ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-yellow-600">
                  <BanknotesIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Solana (Crypto)</p>
                  <p className="text-gray-400 text-sm">Pay with SOL</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {verificationError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {verificationError}
          </div>
        )}

        {/* Payment Processing */}
        {isProcessing && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3aa3eb] mx-auto mb-3"></div>
            {isVerifying && verificationPhase === 'verifying' && (
              <p className="text-gray-200">Verifying payment...</p>
            )}
            {isVerifying && verificationPhase === 'pending' && (
              <p className="text-gray-200">Payment pending. Waiting for confirmation...</p>
            )}
            {!isVerifying && (
              <p className="text-gray-300">Processing payment...</p>
            )}
            {isVerifying && verificationPhase === 'pending' && (
              <p className="text-xs text-gray-400 mt-2">This may take a moment (PayPal PENDING).</p>
            )}
          </div>
        )}

        {/* Payment Method Content */}
        {!isProcessing && (
          <div>
            {paymentMethod === 'paypal' && (
              <div>
                <p className="text-gray-300 mb-4">Click the PayPal button below to complete your payment:</p>
                <PayPalButton
                  amount={invoice.amount}
                  invoiceId={invoice.id}
                  onSuccess={handlePayPalSuccess}
                  onError={handlePayPalError}
                />
              </div>
            )}

            {paymentMethod === 'card' && (
              <div>
                <p className="text-gray-300 mb-4">Credit card payment processing:</p>
                <button
                  onClick={handleCardPayment}
                  className="w-full btn-primary font-medium"
                >
                  Pay ${invoice.amount.toLocaleString()} with Credit Card
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  * This is a demo. In production, this would integrate with Stripe or similar.
                </p>
              </div>
            )}

            
            {paymentMethod === 'solana' && (
              <div>
                {!walletAddress ? (
                  <div className="space-y-3">
                    {availableWallets.length > 0 ? (
                      <button
                        onClick={() => setIsWalletModalOpen(true)}
                        className="w-full btn-primary font-medium"
                      >
                        Select Wallet
                      </button>
                    ) : (
                      <div className="text-gray-400 text-sm text-center">No compatible wallet detected</div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-gray-300 break-all">Wallet: {walletAddress}</div>
                    <div className="text-gray-300">Estimated: {solPriceUSD ? (invoice.amount / solPriceUSD).toFixed(6) : '...'} SOL</div>
                    <button onClick={handleSolanaPayment} className="w-full btn-primary font-medium" disabled={!solPriceUSD || !treasuryAddress}>
                      Pay with Solana
                    </button>
                    <button
                      onClick={() => {
                        setWalletAddress(null);
                        setIsWalletModalOpen(true);
                      }}
                      className="w-full btn-secondary font-medium shrink-glow-button"
                    >
                      Change Wallet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Wallet Selection Modal */}
        {isWalletModalOpen && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-semibold">Select Wallet</p>
                <p className="text-gray-400 text-sm">Choose a wallet to continue with Solana payments.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={detectWallets}
                  className="text-xs px-3 py-1 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsWalletModalOpen(false)}
                  className="text-xs px-3 py-1 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {availableWallets.map((w) => (
                <button
                  key={w.id}
                  onClick={async () => {
                    await connectWallet(w.id);
                    setIsWalletModalOpen(false);
                  }}
                  className="w-full flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md px-4 py-4 hover:border-[#3aa3eb]/70 hover:bg-[#3aa3eb]/10 hover:shadow-[0_10px_40px_-12px_rgba(58,163,235,0.45)] transition-all duration-200 text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/60 focus:ring-offset-0 active:scale-[0.99]"
                >
                  {renderWalletIcon(w.id, w.label)}
                  <div className="text-left">
                    <div className="font-semibold">{w.label}</div>
                    <div className="text-xs text-gray-400">Connect with {w.label}</div>
                  </div>
                </button>
              ))}
            </div>

            {availableWallets.length === 0 && (
              <div className="text-center text-gray-400 text-sm">No wallets detected. Open your Solana wallet extension and try again.</div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-gray-400 text-center">
            Your payment is secured with 256-bit SSL encryption
          </p>
        </div>
      </div>
    </Modal>
  );
}