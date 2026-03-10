"use client";
import Link from "next/link";
import { navItems } from "@/data/data";
import { RiCloseLine, RiMenuLine, RiShoppingBag2Line } from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeToggle } from "./Theme-toggle";
import {
  getMenuButtonLabel,
  getMobileMenuVisibilityClass,
} from "@/lib/header-utils";
import { useCartStore } from "../store/cartStore";
import { signOut, useSession } from "next-auth/react";

const Header = () => {
  const [openMenu, setOpenMenu] = useState<boolean>(false);
  const pathName = usePathname();
  const { data: session, status } = useSession();
  const hydrateFromServer = useCartStore((state) => state.hydrateFromServer);

  const handleClick = () => {
    setOpenMenu((prevState) => !prevState);
  };

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    void hydrateFromServer();
  }, [status, session?.user?.id, hydrateFromServer]);

  const items = useCartStore((state) => state.items);
  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const isLoggedIn = Boolean(session?.user?.id);
  const userLabel = session?.user?.name ?? session?.user?.email ?? "Usuario";
  const canAccessKitchen =
    session?.user?.role === "ADMIN" || session?.user?.role === "PREPARER";
 

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 py-3 font-cunia backdrop-blur dark:border-slate-700 dark:bg-gray-900/95">
      <div className="page-container flex items-center justify-between">
        <Link className="text-3xl font-semibold text-amber-600" href="/">
          Logo
        </Link>

        <nav
          className="hidden w-full items-center justify-between lg:flex"
          aria-label="Navegación principal"
        >
          <ul className="mx-auto flex items-center justify-center gap-9 text-slate-800 dark:text-slate-100">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={clsx(
                    "transition-colors hover:text-amber-600 focus:text-amber-600",
                    {
                      "text-amber-600": pathName === item.href,
                    },
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3.5">
            {canAccessKitchen ? (
              <Link href="/kitchen" className="btn-primary">
                Kitchen
              </Link>
            ) : null}
            {status === "loading" ? (
              <div className="h-9 w-24" aria-hidden="true" />
            ) : isLoggedIn ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  Hola, {userLabel}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary">
                Iniciar sesión
              </Link>
            )}
            <Link
              href="/shopping-cart"
              aria-label="Abrir carrito de compras"
              className="relative inline-flex size-10 items-center justify-center rounded-md text-slate-800 transition-colors hover:bg-slate-100 hover:text-amber-600 focus:bg-slate-100 focus:text-amber-600 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
            >
              <RiShoppingBag2Line
                size={26}
                className={clsx("transition-all", {
                  "text-amber-600": pathName === "/shopping-cart",
                })}
              />
              {totalItems > 0 && (
                <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        <nav className="relative lg:hidden" aria-label="Navegación móvil">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Link
              href="/shopping-cart"
              aria-label="Abrir carrito de compras"
              className="relative inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-amber-600 focus:bg-slate-100 focus:text-amber-600 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
            >
              <RiShoppingBag2Line
                size={26}
                className={clsx("transition-all", {
                  "text-amber-600": pathName === "/shopping-cart",
                })}
              />

              {totalItems > 0 && (
                <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              aria-label={getMenuButtonLabel(openMenu)}
              aria-expanded={openMenu}
              aria-controls="mobile-menu"
              className="rounded-md p-1.5 transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              onClick={handleClick}
            >
              {openMenu ? <RiCloseLine size={28} /> : <RiMenuLine size={28} />}
            </button>
          </div>
          <div
            id="mobile-menu"
            className={`absolute right-0 top-full mt-2.5 w-full min-w-52 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow ${getMobileMenuVisibilityClass(openMenu)} transition dark:border-slate-700 dark:bg-slate-800`}
          >
            <ul className="space-y-1.5 text-slate-800 dark:text-slate-100">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "block rounded px-2 py-1 transition-colors hover:text-amber-600 focus:text-amber-600",
                      {
                        "text-amber-600": pathName === item.href,
                      },
                    )}
                    onClick={handleClick}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {canAccessKitchen ? (
                <li>
                  <Link
                    href="/kitchen"
                    className={clsx(
                      "block rounded px-2 py-1 transition-colors hover:text-amber-600 focus:text-amber-600",
                      {
                        "text-amber-600": pathName === "/kitchen",
                      },
                    )}
                    onClick={handleClick}
                  >
                    Kitchen
                  </Link>
                </li>
              ) : null}
            </ul>
            {status === "loading" ? (
              <div className="h-10 w-full" aria-hidden="true" />
            ) : isLoggedIn ? (
              <button
                className="btn-primary block w-full text-center"
                onClick={() => {
                  setOpenMenu(false);
                  void signOut({ callbackUrl: "/" });
                }}
              >
                Cerrar sesión
              </button>
            ) : (
              <Link
                href="/login"
                className="btn-primary block w-full text-center"
                onClick={handleClick}
              >
                Iniciar sesión
              </Link>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
