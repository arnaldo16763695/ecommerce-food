export type LoginCardProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
};
export type productCardProps = {
  id: number;
  name: string;
  price: number;
  img: string;
  star: number;
};

export type CartItem = {
  id: number;
  quantity: number;
};
export type CartStore = {
  items: CartItem[];
  addItem: (productId: number, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

export type SortOption = "Sort By" | "Price:Low to Hight" | "name:A to Z";