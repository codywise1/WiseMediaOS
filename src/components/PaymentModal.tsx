import React, { useState } from 'react';
import Modal from './Modal';
import PayPalButton from './PayPalButton';
import { 
  CreditCardIcon, 
  BanknotesIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: string;
  createdDate: string;
  description: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess: (paymentDetails: any) => void;
}

export default function PaymentModal({ isOpen, onClose, invoice, onPaymentSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | 'bank'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handlePayPalSuccess = (details: any) => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentComplete(true);
      setIsProcessing(false);
      
      // Call parent success handler
      onPaymentSuccess({
        ...details,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: 'PayPal'
      });
      
      // Close modal after showing success
      setTimeout(() => {
        onClose();
        setPaymentComplete(false);
      }, 2000);
    }, 1500);
  };

  const handlePayPalError = (error: any) => {
    console.error('Payment failed:', error);
    alert('Payment failed. Please try again or contact support.');
  };

  const handleCardPayment = () => {
    // Simulate card payment processing
    setIsProcessing(true);
    
    setTimeout(() => {
      setPaymentComplete(true);
      setIsProcessing(false);
      
      onPaymentSuccess({
        id: `CARD_${Date.now()}`,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: 'Credit Card',
        status: 'COMPLETED'
      });
      
      setTimeout(() => {
        onClose();
        setPaymentComplete(false);
      }, 2000);
    }, 2000);
  };

  const handleBankTransfer = () => {
    alert(`Bank Transfer Instructions:\n\nAccount: Wise Media LLC\nRouting: 123456789\nAccount: 987654321\nAmount: $${invoice.amount.toLocaleString()}\nReference: ${invoice.id}\n\nPlease include the invoice ID in your transfer reference.`);
  };

  if (paymentComplete) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Payment Successful">
        <div className="text-center py-8">
          <div className="p-4 rounded-full bg-green-900/30 inline-block mb-4">
            <CheckCircleIcon className="h-12 w-12 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
          <p className="text-gray-300 mb-4">
            Your payment of ${invoice.amount.toLocaleString()} has been processed successfully.
          </p>
          <p className="text-sm text-gray-400">
            Invoice {invoice.id} is now marked as paid.
          </p>
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
              onClick={() => setPaymentMethod('bank')}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'bank'
                  ? 'border-[#3aa3eb] bg-[#3aa3eb]/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-600">
                  <BanknotesIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Bank Transfer</p>
                  <p className="text-gray-400 text-sm">Direct bank transfer</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Payment Processing */}
        {isProcessing && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3aa3eb] mx-auto mb-2"></div>
            <p className="text-gray-300">Processing payment...</p>
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

            {paymentMethod === 'bank' && (
              <div>
                <p className="text-gray-300 mb-4">Get bank transfer instructions:</p>
                <button
                  onClick={handleBankTransfer}
                  className="w-full btn-secondary font-medium"
                >
                  Get Bank Transfer Details
                </button>
              </div>
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