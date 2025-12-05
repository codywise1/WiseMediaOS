import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';

interface PayPalButtonProps {
  amount: number;
  invoiceId: string;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
}

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';

export default function PayPalButton({ amount, invoiceId, onSuccess, onError }: PayPalButtonProps) {
  const initialOptions = {
    clientId: PAYPAL_CLIENT_ID,
    currency: 'USD',
    intent: 'capture',
  };

  return (
    <PayPalScriptProvider options={initialOptions}>
      <PayPalButtons
        style={{
          layout: 'horizontal',
          color: 'blue',
          shape: 'rect',
          label: 'pay',
          height: 40,
        }}
        createOrder={(_data, actions) => {
          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  value: amount.toString(),
                  currency_code: 'USD',
                },
                description: `Invoice Payment - ${invoiceId}`,
                invoice_id: invoiceId,
                custom_id: invoiceId,
              },
            ],
            application_context: {
              brand_name: 'Wise Media',
              landing_page: 'NO_PREFERENCE',
              user_action: 'PAY_NOW',
            },
          });
        }}
        onApprove={async (data, actions) => {
          try {
            const details = await actions.order?.capture();
            const captureId = (details as any)?.id;
            const orderId = (data as any)?.orderID;
            onSuccess({
              details,
              orderId,
              captureId,
            });
          } catch (error) {
            onError(error);
          }
        }}
        onError={(error) => {
          console.error('PayPal Error:', error);
          onError(error);
        }}
        onCancel={() => {
          console.log('PayPal payment cancelled');
        }}
      />
    </PayPalScriptProvider>
  );
}