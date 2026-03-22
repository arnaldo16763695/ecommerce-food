// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("../store/cartStore", () => ({
  useCartStore: (selector: (state: { addItem: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ addItem: vi.fn() }),
}));

vi.mock("../components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

import ProductCard from "../components/ProductCard";
import QuickAddProductSheet from "../components/QuickAddProductSheet";

const baseProduct = {
  id: "prod_1",
  name: "Hamburguesa especial",
  slug: "hamburguesa-especial",
  description: "Con queso y salsa de la casa",
  basePriceCents: 2500,
  isFeatured: false,
  trackStock: true,
  stockQuantity: 0,
  isSoldOut: true,
  prepTimeMin: 15,
  categoryId: "cat_1",
  category: { name: "Hamburguesas" },
  images: [{ url: "/burger.png", alt: "Burger" }],
  optionGroups: [],
};

describe("product availability UI", () => {
  it("shows sold-out state in product cards", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Configurar Hamburguesa especial y agregar al pedido" }),
    ).toBeDisabled();
    expect(screen.getByText("Producto agotado")).toBeInTheDocument();
  });

  it("prevents quick add when the product is sold out", () => {
    render(
      <QuickAddProductSheet
        open
        onOpenChange={vi.fn()}
        product={baseProduct}
      />,
    );

    expect(screen.getByText("Agotado temporalmente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Producto agotado" })).toBeDisabled();
  });
});
