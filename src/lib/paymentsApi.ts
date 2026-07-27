import { apiFetch } from './api';

// 'processing' n'existe qu'au niveau de cette réponse API (jamais stocké
// tel quel côté backend) — voir src/services/payments.ts côté serveur.
export type PaymentStatusValue = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export type PaymentStatus = {
  order_id: string;
  status: PaymentStatusValue;
  total_amount_xof: number;
  transaction_id: string | null;
};

export function initiatePayment(token: string, orderId: string, phoneNumber: string) {
  return apiFetch<{ status: PaymentStatusValue; transaction_id: string }>('/payments/initiate', {
    method: 'POST',
    token,
    body: { order_id: orderId, phone_number: phoneNumber },
  });
}

export function getPaymentStatus(token: string, orderId: string) {
  return apiFetch<PaymentStatus>(`/payments/${orderId}/status`, { token });
}
