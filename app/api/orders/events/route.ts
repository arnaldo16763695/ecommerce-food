import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { subscribeKitchenEvents } from "@/lib/kitchen-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const viewerUserId = session.user.id;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (message: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(message));
      };

      send(`event: connected\ndata: {"ok":true}\n\n`);

      unsubscribe = subscribeKitchenEvents((event) => {
        void (async () => {
          if (closed) return;
          if (event.type !== "ORDER_CREATED" && event.type !== "ORDER_STATUS_CHANGED") {
            return;
          }

          const order = await prisma.order.findUnique({
            where: { id: event.orderId },
            select: {
              id: true,
              userId: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
            },
          });

          if (!order || order.userId !== viewerUserId) return;

          send(
            `event: orders\ndata: ${JSON.stringify({
              type: event.type,
              orderId: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              at: event.at,
            })}\n\n`,
          );
        })();
      });

      keepAliveTimer = setInterval(() => {
        send(`: keepalive\n\n`);
      }, 20000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (unsubscribe) unsubscribe();
        controller.close();
      });
    },
    cancel() {
      closed = true;
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
