"use client";

import { footerList } from "@/data/data";
import {
  RiFacebookFill,
  RiInstagramLine,
  RiTwitterLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const footerHrefMap: Record<string, string> = {
  Inicio: "/",
  Tienda: "/shop",
  "Sobre nosotros": "/",
  Contacto: "/",
  "Preguntas frecuentes": "/orders",
  "Envios y devoluciones": "/shop",
  "Política de privacidad": "/",
  "Términos y condiciones": "/",
};

export const Footer = () => {
  const pathname = usePathname();
  const hideOnMobile = pathname === "/shopping-cart" || pathname === "/checkout";

  return (
    <footer
      className={`bg-neutral-900 pt-10 pb-6 text-white ${hideOnMobile ? "hidden md:block" : ""}`}
    >
      <div className="page-container space-y-6 divide-y divide-neutral-800">
        {/* Footer top */}
        <div className="grid gap-8 pb-8 sm:pb-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="mb-4 inline-flex text-2xl font-bold font-cuina">
              Logo
            </span>
            <p className="text-gray-300">
              Sabores frescos, pedidos rapidos y una experiencia simple para
              disfrutar tu comida favorita todos los dias.
            </p>
          </div>

          <div className="space-y-3 sm:hidden">
            <p className="text-xl font-cunia">Accesos rapidos</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-gray-300">
              <Link href="/" className="hover:underline">
                Inicio
              </Link>
              <Link href="/shop" className="hover:underline">
                Tienda
              </Link>
              <Link href="/" className="hover:underline">
                Contacto
              </Link>
            </div>
          </div>

          {footerList.map((item) => (
            <div key={item.id} className="hidden sm:block">
              <p className="text-xl font-cunia">{item.title}</p>
              <ul className="mt-4 space-y-2">
                {item.links.map((link) => (
                  <li key={link}>
                    <Link
                      href={footerHrefMap[link] ?? "/"}
                      className="text-gray-300 hover:underline"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="mb-3 text-xl font-cunia">Contactanos</p>
            <p>
              Correo:
              <a
                href="mailto:info@example.com"
                className="text-gray-300 hover:underline"
              >
                info@example.com
              </a>
            </p>
            <p>
              Telefono:
              <a
                href="tel:+1234567890"
                className="text-gray-300 hover:underline"
              >
                +1234567890
              </a>
            </p>

            <div className="mt-7 flex items-center gap-2">
              {[RiFacebookFill, RiInstagramLine, RiTwitterLine].map(
                (Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="text-gray-300 transition-colors hover:text-primary-500 focus:text-primary-500"
                  >
                    <Icon />
                  </a>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <p className="text-center sm:text-left">
          &copy; 2025 Foodie. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
