import { broadcastAdminOrdersChanged } from "@/lib/realtime/admin-orders";

type KitchenEventType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_ITEM_PREPARATION_CHANGED";

type KitchenEvent = {
  type: KitchenEventType;
  orderId: string;
  orderNumber?: number;
  at: string;
};

type Listener = (event: KitchenEvent) => void;

const globalStore = globalThis as unknown as {
  kitchenEventListeners?: Set<Listener>;
};

function getListeners() {
  if (!globalStore.kitchenEventListeners) {
    globalStore.kitchenEventListeners = new Set<Listener>();
  }
  return globalStore.kitchenEventListeners;
}

export function subscribeKitchenEvents(listener: Listener) {
  const listeners = getListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishKitchenEvent(event: Omit<KitchenEvent, "at">) {
  const payload: KitchenEvent = {
    ...event,
    at: new Date().toISOString(),
  };

  getListeners().forEach((listener) => {
    listener(payload);
  });

  void broadcastAdminOrdersChanged(event);
}

