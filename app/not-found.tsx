import Link from "next/link";
import React from "react";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-white px-4">
      <h1 className="text-6xl text-amber-500 mb-4">404</h1>
      <h2 className="text-3xl md:text-4xl mb-2 text-center">Oops! Page not found</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md w-full">
        The resource you are looking for might have been removed, had its name
        changed, or is temporaarily unavailable.
      </p>
      <Link className="btn-primary" href={'/'}>Return home</Link>
    </div>
  );
}

export default NotFound;
