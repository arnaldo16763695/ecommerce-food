import { redirect } from "next/navigation";
import { auth } from "@/auth";
import KitchenBoard from "@/components/KitchenBoard";

export default async function KitchenPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "PREPARER") {
    redirect("/");
  }

  return (
    <section className="bg-neutral-50 py-10 dark:bg-slate-900 md:py-16">
      <div className="page-container space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Kitchen Board
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Gestion operativa para preparacion de pedidos.
          </p>
        </div>

        <KitchenBoard />
      </div>
    </section>
  );
}
