import test from "node:test";
import assert from "node:assert/strict";

import { getMenuButtonLabel, getMobileMenuVisibilityClass } from "../lib/header-utils.ts";

test("getMenuButtonLabel returns the right accessible label", () => {
  assert.equal(getMenuButtonLabel(true), "Close menu");
  assert.equal(getMenuButtonLabel(false), "Open menu");
});

test("getMobileMenuVisibilityClass returns the expected class combination", () => {
  assert.equal(getMobileMenuVisibilityClass(true), "visible grid");
  assert.equal(getMobileMenuVisibilityClass(false), "invisible hidden");
});
