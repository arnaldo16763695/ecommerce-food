import { describe, expect, it } from "vitest";

import {
  getMenuButtonLabel,
  getMobileMenuVisibilityClass,
} from "../lib/header-utils";

describe("header utils", () => {
  it("returns the right accessible label", () => {
    expect(getMenuButtonLabel(true)).toBe("Cerrar menu");
    expect(getMenuButtonLabel(false)).toBe("Abrir menu");
  });

  it("returns the expected menu visibility class combination", () => {
    expect(getMobileMenuVisibilityClass(true)).toBe("visible grid");
    expect(getMobileMenuVisibilityClass(false)).toBe("invisible hidden");
  });
});
