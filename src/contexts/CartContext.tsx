import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  vendorId: string;
  vendorName: string;
  variantId?: string;
  variantLabel?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const loadCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem("marketplace_cart");
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const saveCart = (items: CartItem[]) => {
  localStorage.setItem("marketplace_cart", JSON.stringify(items));
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  const addItem = useCallback((item: Omit<CartItem, "id" | "quantity">, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) =>
        i.productId === item.productId &&
        (i.variantId || null) === (item.variantId || null)
      );
      let next: CartItem[];
      if (existing) {
        next = prev.map((i) =>
          i.productId === item.productId && (i.variantId || null) === (item.variantId || null)
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        next = [...prev, { ...item, id: crypto.randomUUID(), quantity }];
      }
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      const next = quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i));
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
