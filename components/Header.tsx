"use client";
import Link from "next/link";
import { navItems } from "@/data/data";
import { RiCloseLine, RiMenuLine, RiShoppingBag2Line } from "@remixicon/react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeToggle } from "./Theme-toggle";
const Header = () => {
  const [openMenu, setOpenMenu] = useState<boolean>(false);
  const pathName = usePathname();
  const handleClick = () => {
    setOpenMenu(!openMenu);
  };

  return (
    <header className="sticky top-0 border-b border-gray-200 w-full py-3 bg-white dark:bg-gray-900 z-50 font-cunia">
      <div className="container flex items-center justify-between ">
        {/* Logo  */}
        <Link className="text-3xl font-semibold text-amber-600" href="/">
          Logo
        </Link>

        {/* Desktop menu  */}

        <nav className="hidden lg:flex items-center justify-between w-full">
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
          {/* btns  */}
          <div className="flex items-center gap-3.5">
            {/* Shopping cart icon  */}
            <Link
              href={"/shopping-cart"}
              className={`size-10 relative inline-flex items-center justify-center rounded-sm`}
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
            {/* log in btn  */}
            <button className="btn-primary">Log In</button>
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile menu  */}
        <nav className="relative lg:hidden">
          {/* btns  */}

          <div className="flex items-center gap-2">
            {/* Cart icon  */}
            <Link
              href={"/shopping-cart"}
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
            {/* Manu btn */}
            <button className="" onClick={handleClick}>
              {openMenu ? <RiCloseLine size={28} /> : <RiMenuLine size={28} />}
            </button>
          </div>
          <div
            className={`absolute top-full right-0 bg-white p-3 min-w-52 w-full shadow mt-2.5 rounded-lg space-y-2.5 ${openMenu ? "visible grid" : "invisible hidden"} transition`}
          >
            {/* List  */}
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
            {/* Log in btn  */}
            <button className="btn-primary w-full" onClick={handleClick}>
              Log In
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
