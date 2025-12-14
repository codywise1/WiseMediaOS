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

  const createUniquePayPalInvoiceId = () => {
    const uniqueSuffix =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `WM-${invoiceId}-${Date.now()}-${uniqueSuffix}`;
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
          const paypalInvoiceId = createUniquePayPalInvoiceId();
          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  value: amount.toString(),
                  currency_code: 'USD',
                },
                description: `Invoice Payment - ${invoiceId}`,
                invoice_id: paypalInvoiceId,
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
            const captureId =
              (details as any)?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
              (details as any)?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id ||
              null;
            const orderId = (data as any)?.orderID;
            onSuccess({
              details,
              orderId,
              captureId,
            });
          } catch (error) {
            console.error('PayPal capture error:', error);
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