import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MAX_QUANTITY_PER_LINE } from './order-limits';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  productId: string;
}

/** A change the server made to a cart line when the cart was refreshed. */
export interface CartAdjustment {
  name: string;
  type: 'price_changed' | 'quantity_reduced' | 'removed';
  oldPrice?: number;
  newPrice?: number;
  oldQuantity?: number;
  newQuantity?: number;
}

interface CartLineCheck {
  product_id: number;
  name: string;
  price: number;
  available: number;
  requested: number;
  isAvailable: boolean;
}

/** A coupon the customer has applied for display. The server re-resolves the code
 * at checkout, so this is a preview - never the charged discount. */
export interface AppliedCoupon {
  code: string;
  percent: number;
}

interface CartStore {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  clearCoupon: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  /** Apply server truth to the cart, returning what changed so it can be shown. */
  applyServerCheck: (lines: CartLineCheck[]) => CartAdjustment[];
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface WishlistStore {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const items = get().items;
        if (items.some((i) => i.id === item.id)) {
          set({ items: items.filter((i) => i.id !== item.id) });
        } else {
          set({ items: [...items, item] });
        }
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      has: (id) => get().items.some((i) => i.id === id),
    }),
    { name: 'ab-essentia-wishlist' }
  )
);

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,

      addItem: (item) => {
        const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
        set((state) => {
          const existingItem = state.items.find((i) => i.productId === item.productId);
          if (existingItem) {
            // Clamp the merged line to the per-order ceiling the server enforces,
            // so re-adding an item cannot build a basket checkout will reject.
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QUANTITY_PER_LINE) }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE) }],
          };
        });
      },
      
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const capped = Math.min(quantity, MAX_QUANTITY_PER_LINE);
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: capped } : i
          ),
        }));
      },
      
      clearCart: () => set({ items: [], coupon: null }),

      applyCoupon: (coupon) => set({ coupon }),
      clearCoupon: () => set({ coupon: null }),
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      applyServerCheck: (lines) => {
        const adjustments: CartAdjustment[] = [];
        const byId = new Map(lines.map((l) => [String(l.product_id), l]));

        const nextItems: CartItem[] = [];

        for (const item of get().items) {
          const line = byId.get(String(item.productId));

          // Not reported on (shouldn't happen) - leave the line untouched rather than
          // silently deleting something the customer chose.
          if (!line) {
            nextItems.push(item);
            continue;
          }

          if (!line.isAvailable || line.available <= 0) {
            adjustments.push({ name: line.name || item.name, type: 'removed' });
            continue;
          }

          let quantity = item.quantity;
          if (quantity > line.available) {
            adjustments.push({
              name: line.name || item.name,
              type: 'quantity_reduced',
              oldQuantity: quantity,
              newQuantity: line.available,
            });
            quantity = line.available;
          }

          if (line.price !== item.price) {
            adjustments.push({
              name: line.name || item.name,
              type: 'price_changed',
              oldPrice: item.price,
              newPrice: line.price,
            });
          }

          nextItems.push({
            ...item,
            name: line.name || item.name,
            price: line.price,
            quantity,
          });
        }

        set({ items: nextItems });
        return adjustments;
      },
    }),
    {
      name: 'ab-essentia-cart',
    }
  )
);
