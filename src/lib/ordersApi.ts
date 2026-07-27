import { apiFetch } from './api';

export type PaymentMethod = 'orange_money' | 'mtn_momo' | 'wave';

export type Order = {
  id: string;
  user_id: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  total_amount_xof: number;
  payment_method: PaymentMethod;
  transaction_id: string | null;
  delivery_full_name: string;
  delivery_phone: string;
  delivery_commune: string;
  delivery_landmark: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateOrderInput = {
  kit_id: string;
  quantity: number;
  payment_method: PaymentMethod;
  delivery_full_name: string;
  delivery_phone: string;
  delivery_commune: string;
  delivery_landmark?: string;
};

export function createOrder(token: string, input: CreateOrderInput) {
  return apiFetch<Order>('/orders', { method: 'POST', token, body: input });
}
