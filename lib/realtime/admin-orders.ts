const ADMIN_ORDERS_TOPIC = "admin-orders";
const ADMIN_ORDERS_EVENT = "orders-changed";

type AdminOrdersRealtimePayload = {
  type: "ORDER_CREATED" | "ORDER_STATUS_CHANGED" | "ORDER_ITEM_PREPARATION_CHANGED";
  orderId: string;
  orderNumber?: number;
  at: string;
};

export function getAdminOrdersRealtimeTopic() {
  return ADMIN_ORDERS_TOPIC;
}

export function getAdminOrdersRealtimeEvent() {
  return ADMIN_ORDERS_EVENT;
}

export async function broadcastAdminOrdersChanged(
  payload: Omit<AdminOrdersRealtimePayload, "at">,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const response = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: ADMIN_ORDERS_TOPIC,
          event: ADMIN_ORDERS_EVENT,
          payload: {
            ...payload,
            at: new Date().toISOString(),
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown_error");
    console.error("[realtime] failed to broadcast admin orders update", {
      topic: ADMIN_ORDERS_TOPIC,
      event: ADMIN_ORDERS_EVENT,
      status: response.status,
      error: errorText,
    });
  }
}
