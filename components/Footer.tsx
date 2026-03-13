import { footerList } from "@/data/data";
import {
  RiFacebookFill,
  RiInstagramLine,
  RiTwitterLine,
} from "@remixicon/react";
import Link from "next/link";
export const Footer = () => {
  return (
    <footer className="bg-neutral-900 text-white pt-10 pb-6">
      <div className="page-container space-y-6 divide-y divide-neutral-800">
        {/* Footer top  */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-11 sm:pb-16">
          {/** Desc */}
          <div>
            {/* Logo  */}
            <span className="text-2xl font-bold font-cuina inline-flex mb-4">
              Logo
            </span>
            <p className="text-gray-300">
              Sabores frescos, pedidos rápidos y una experiencia simple para
              disfrutar tu comida favorita todos los días.
            </p>
          </div>
          {/* Footer list  */}
          {footerList.map((item) => (
            <div key={item.id}>
              <p className="text-xl font-cunia">{item.title}</p>
              <ul className="space-y-2 mt-4">
                {item.links.map((link) => (
                  <li key={link}>
                    <Link href={""} className="text-gray-300 hover:underline">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Get in touch  */}
          <div>
            <p className="text-xl font-cunia mb-3">Contáctanos</p>
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
              Teléfono:
              <a
                href="tel:+1234567890"
                className="text-gray-300 hover:underline"
              >
                +1234567890
              </a>
            </p>

            {/* Social links  */}
            <div className="flex items-center gap-2 mt-7">
              {[RiFacebookFill, RiInstagramLine, RiTwitterLine].map(
                (Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="text-gray-300 hover:text-primary-500 focus:text-primary-500 transition-colors"
                  >
                    <Icon className="" />
                  </a>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <p>&copy; 2025 Foodie. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
