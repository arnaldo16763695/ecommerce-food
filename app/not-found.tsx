import Link from "next/link";
import React from "react";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-white px-4">
      <h1 className="text-6xl text-amber-500 mb-4">404</h1>
      <h2 className="text-3xl md:text-4xl mb-2 text-center">Oops! Página no encontrada</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md w-full">
        El recurso que buscas pudo ser eliminado, haber cambiado de nombre o
        estar temporalmente no disponible.
      </p>
      <Link className="btn-primary" href={'/'}>Volver al inicio</Link>
    </div>
  );
}

export default NotFound;
