import { auth } from "@/auth";
import { subscribeKitchenEvents } from "@/lib/kitchen-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "PREPARER") {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (message: string) => {
        controller.enqueue(encoder.encode(message));
      };

      send(`event: connected\ndata: {"ok":true}\n\n`);

      unsubscribe = subscribeKitchenEvents((event) => {
        send(`event: kitchen\ndata: ${JSON.stringify(event)}\n\n`);
      });

      keepAliveTimer = setInterval(() => {
        send(`: keepalive\n\n`);
      }, 20000);

      req.signal.addEventListener("abort", () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (unsubscribe) unsubscribe();
        controller.close();
      });
    },
    cancel() {
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

