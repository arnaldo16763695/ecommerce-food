// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Footer from "../components/Footer";

describe("Footer", () => {
  it("uses non-empty href values for storefront links", () => {
    render(<Footer />);

    const storefrontLinks = [
      ...screen.getAllByRole("link", { name: "Inicio" }),
      ...screen.getAllByRole("link", { name: "Tienda" }),
      ...screen.getAllByRole("link", { name: "Contacto" }),
      screen.getByRole("link", { name: "Preguntas frecuentes" }),
    ];

    storefrontLinks.forEach((link) => {
      expect(link).toHaveAttribute("href");
      expect(link.getAttribute("href")).not.toBe("");
    });

    expect(screen.getAllByRole("link", { name: "Inicio" })[0]).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Tienda" })[0]).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Preguntas frecuentes" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  it("keeps direct contact links available", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "info@example.com" })).toHaveAttribute(
      "href",
      "mailto:info@example.com",
    );
    expect(screen.getByRole("link", { name: "+1234567890" })).toHaveAttribute(
      "href",
      "tel:+1234567890",
    );
  });
});
