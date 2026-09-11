import { ref, watch, type Ref } from 'vue';

export function useDebounce<T>(value: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref(value.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | null = null;

  watch(value, (newValue) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      debounced.value = newValue;
    }, delay);
  });

  return debounced;
}
