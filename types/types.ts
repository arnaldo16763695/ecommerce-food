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
  id: string;
  quantity: number;
};
export type CartStore = {
  items: CartItem[];
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

export type SortOption = "Sort By" | "Price:Low to Hight" | "name:A to Z";