import { apiFetch } from './api';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'preparing'
  | 'shipped'
  | 'delivered';

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount_xof: number;
  payment_method: string;
  transaction_id: string | null;
  delivery_full_name: string;
  delivery_phone: string;
  delivery_commune: string;
  delivery_landmark: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  kit_id: string;
  quantity: number;
  unit_price_xof: number;
  kit: { name: string };
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

// payment_method n'est plus fourni par le client : la Checkout hébergée
// Bictorys gère elle-même ce choix (voir plan Bictorys §8).
export type CreateOrderInput = {
  kit_id: string;
  quantity: number;
  delivery_full_name: string;
  delivery_phone: string;
  delivery_commune: string;
  delivery_landmark?: string;
};

export function createOrder(token: string, input: CreateOrderInput) {
  return apiFetch<Order>('/orders', { method: 'POST', token, body: input });
}

export function getOrders(token: string) {
  return apiFetch<{ orders: OrderWithItems[] }>('/orders', { token });
}

export function getOrder(token: string, orderId: string) {
  return apiFetch<OrderWithItems>(`/orders/${orderId}`, { token });
}
