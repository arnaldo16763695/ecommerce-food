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
const Header = () => {
  const [openMenu, setOpenMenu] = useState<boolean>(false);
  const pathName = usePathname();

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

  const items = useCartStore((state) => state.items);
  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 py-3 font-cunia backdrop-blur dark:border-slate-700 dark:bg-gray-900/95">
      <div className="page-container flex items-center justify-between">
        <Link className="text-3xl font-semibold text-amber-600" href="/">
          Logo
        </Link>

        <nav
          className="hidden w-full items-center justify-between lg:flex"
          aria-label="Primary navigation"
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
            <Link
              href="/shopping-cart"
              aria-label="Open shopping cart"
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
            <Link href="/login" className="btn-primary">
              Log In
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        <nav className="relative lg:hidden" aria-label="Mobile navigation">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Link
              href="/shopping-cart"
              aria-label="Open shopping cart"
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
            </ul>
            <Link
              href="/login"
              className="btn-primary block w-full text-center"
              onClick={handleClick}
            >
              Log In
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
