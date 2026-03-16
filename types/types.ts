export type LoginCardProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
};
export type productCardProps = {
  id: string;
  name: string;
  price: number;
  img: string;
  star: number;
};

export type CartItem = {
  // Unique key per cart line (product + selected options + notes)
  id: string;
  // Base product id. For legacy local data this may be missing.
  productId?: string;
  name?: string;
  quantity: number;
  unitPriceCents?: number;
  notes?: string;
  options?: CartItemOption[];
};

export type CartItemOption = {
  optionId: string;
  groupName: string;
  optionName: string;
  priceDeltaCents: number;
};

export type AddCartItemInput = {
  productId: string;
  quantity?: number;
  lineKey?: string;
  unitPriceCents?: number;
  notes?: string;
  options?: CartItemOption[];
};

export type UpdateCartItemConfigurationInput = {
  lineKey: string;
  unitPriceCents: number;
  notes?: string;
  options: CartItemOption[];
};

export type CartStore = {
  items: CartItem[];
  isHydratedFromServer: boolean;
  addItem: (item: string | AddCartItemInput, quantity?: number) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  updateItemConfiguration: (
    currentLineKey: string,
    input: UpdateCartItemConfigurationInput,
  ) => void;
  clearCart: () => void;
  hydrateFromServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
};

export type SortOption = "Sort By" | "Price:Low to Hight" | "name:A to Z";
