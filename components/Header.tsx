"use client";
import Link from "next/link";
import { navItems } from "@/data/data";
import { RiCloseLine, RiMenuLine, RiShoppingBag2Line } from "@remixicon/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeToggle } from "./Theme-toggle";
import { getMenuButtonLabel, getMobileMenuVisibilityClass } from "@/lib/header-utils";

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

  return (
    <header className="sticky top-0 border-b border-gray-200 w-full py-3 bg-white dark:bg-gray-900 z-50 font-cunia">
      <div className="page-container flex items-center justify-between ">
        <Link className="text-3xl font-semibold text-amber-600" href="/">
          Logo
        </Link>

        <nav className="hidden lg:flex items-center justify-between w-full" aria-label="Primary navigation">
          <ul className="mx-auto flex items-center gap-9 justify-center">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={clsx(
                    "focus:text-amber-600 hover:text-amber-600 transition-colors",
                    { "text-amber-600": pathName === item.href },
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
              className="size-10 relative inline-flex items-center justify-center rounded-sm"
            >
              <RiShoppingBag2Line
                size={26}
                className={clsx(
                  "hover:text-amber-600 focus:text-amber-600 transition-all",
                  {
                    "text-amber-600": pathName === "/shopping-cart",
                  },
                )}
              />
              <span className="absolute top-0 right-0 size-5 bg-amber-600 text-white flex items-center justify-center rounded-full text-xs">
                2
              </span>
            </Link>
            <Link href='/login' className="btn-primary">Log In</Link>
            <ThemeToggle />
          </div>
        </nav>

        <nav className="relative lg:hidden" aria-label="Mobile navigation">
          <div className="flex items-center gap-2">
            <Link
              href="/shopping-cart"
              aria-label="Open shopping cart"
              className="size-10 inline-flex items-center justify-center rounded-sm relative"
            >
              <RiShoppingBag2Line
                size={26}
                className={clsx(
                  "hover:text-amber-600 focus:text-amber-600 transition-all",
                  {
                    "text-amber-600": pathName === "/shopping-cart",
                  },
                )}
              />
              <span className="size-5 bg-amber-600 text-white flex items-center justify-center rounded-full text-xs absolute top-0 right-0">
                2
              </span>
            </Link>
            <button
              aria-label={getMenuButtonLabel(openMenu)}
              aria-expanded={openMenu}
              aria-controls="mobile-menu"
              onClick={handleClick}
            >
              {openMenu ? <RiCloseLine size={28} /> : <RiMenuLine size={28} />}
            </button>
          </div>
          <div
            id="mobile-menu"
            className={`absolute top-full right-0 bg-white p-3 min-w-52 w-full shadow mt-2.5 rounded-lg space-y-2.5 ${getMobileMenuVisibilityClass(openMenu)} transition`}
          >
            <ul>
              {navItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "hover:text-amber-600 focus:text-amber-600 transition-colors",
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
            <Link href='/login' className="btn-primary w-full text-center" onClick={handleClick}>
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
