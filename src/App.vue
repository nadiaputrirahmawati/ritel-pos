<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const isAuthPage = computed(() => route.name === 'Login');
const activeTab = computed(() => {
  if (route.path.startsWith('/products/create')) return 'tambah';
  if (route.path.startsWith('/settings')) return 'pengaturan';
  return 'kasir';
});

function go(path: string): void {
  router.push(path);
}
</script>

<template>
  <router-view />

  <!-- Mobile Bottom Navigation (hidden on login) -->
  <nav
    v-if="!isAuthPage"
    class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#e5e9e4] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
    aria-label="Navigasi utama"
  >
    <div class="grid grid-cols-3">
      <button
        @click="go('/')"
        class="flex flex-col items-center justify-center gap-0.5 py-2.5"
        :class="activeTab === 'kasir' ? 'text-[#005d42]' : 'text-[#6e7a73]'"
      >
        <span class="material-symbols-outlined text-[26px] leading-none">point_of_sale</span>
        <span class="text-[12px] font-bold">Kasir</span>
      </button>

      <button
        @click="go('/products/create')"
        class="flex flex-col items-center justify-center gap-0.5 py-2.5"
        :class="activeTab === 'tambah' ? 'text-[#005d42]' : 'text-[#6e7a73]'"
      >
        <span class="material-symbols-outlined text-[26px] leading-none">add_circle</span>
        <span class="text-[12px] font-bold">Produk</span>
      </button>

      <button
        @click="go('/settings')"
        class="flex flex-col items-center justify-center gap-0.5 py-2.5"
        :class="activeTab === 'pengaturan' ? 'text-[#005d42]' : 'text-[#6e7a73]'"
      >
        <span class="material-symbols-outlined text-[26px] leading-none">settings</span>
        <span class="text-[12px] font-bold">Pengaturan</span>
      </button>
    </div>
  </nav>
</template>
