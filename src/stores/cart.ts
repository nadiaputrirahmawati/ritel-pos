import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CartItem, Product } from '../types';

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  );

  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity * item.product.price, 0)
  );

  function addItem(product: Product, quantity = 1): void {
    const existing = items.value.find((i) => i.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.value.push({ product, quantity });
    }
  }

  function increment(productId: number): void {
    const item = items.value.find((i) => i.product.id === productId);
    if (item) item.quantity += 1;
  }

  function decrement(productId: number): void {
    const item = items.value.find((i) => i.product.id === productId);
    if (!item) return;
    item.quantity -= 1;
    if (item.quantity <= 0) removeItem(productId);
  }

  function setQuantity(productId: number, quantity: number): void {
    const item = items.value.find((i) => i.product.id === productId);
    if (!item) return;
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      item.quantity = quantity;
    }
  }

  function removeItem(productId: number): void {
    items.value = items.value.filter((i) => i.product.id !== productId);
  }

  function clear(): void {
    items.value = [];
  }

  return { items, totalItems, total, addItem, increment, decrement, setQuantity, removeItem, clear };
});
