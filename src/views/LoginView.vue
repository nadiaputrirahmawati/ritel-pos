<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api, isAxiosError } from '../services/api';
import type { LoginResponse } from '../types';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const router = useRouter();
const auth = useAuthStore();

async function handleLogin(): Promise<void> {
  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan Password wajib diisi';
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const res = await api.post<LoginResponse>('/api/auth/login', {
      email: email.value,
      password: password.value,
    });

    if (res.data.success) {
      auth.setAuth(res.data.data);
      router.push('/');
    }
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      if (err.response?.status === 401) {
        errorMessage.value = 'Email atau Password Salah';
      } else {
        errorMessage.value = err.response?.data?.message || 'Login gagal';
      }
    } else {
      errorMessage.value = 'Tidak dapat terhubung ke server';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="bg-[#f6fbf5] min-h-screen flex items-center justify-center p-6">
    <main class="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#E2E8F0] overflow-hidden">
      <!-- Error Banner -->
      <div
        v-if="errorMessage"
        class="bg-[#DC2626] text-white p-4 flex items-center justify-center gap-2 text-[18px] font-bold"
      >
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMessage }}</span>
      </div>

      <div class="p-8 space-y-6">
        <!-- Header -->
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#047857] text-white mb-4">
            <span class="material-symbols-outlined text-[32px]">storefront</span>
          </div>
          <h1 class="text-[20px] font-bold text-[#181d1a]">Masuk ke Warung Pintar</h1>
          <p class="text-[14px] text-[#475569] font-medium mt-1">Kasir POS untuk warung Anda</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label class="text-[18px] font-bold text-[#181d1a]" for="email">
              Email / ID
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-[#3e4943]">
                <span class="material-symbols-outlined">person</span>
              </span>
              <input
                v-model="email"
                id="email"
                type="email"
                placeholder="Contoh: kasir@warung.com"
                required
                class="w-full h-[60px] pl-12 pr-4 rounded-lg border-2 border-[#bdc9c1] bg-[#f6fbf5] focus:border-[#047857] focus:ring-0 text-[18px] font-bold text-[#181d1a] placeholder:text-[#3e4943] transition-colors"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[18px] font-bold text-[#181d1a]" for="password">
              Password
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-[#3e4943]">
                <span class="material-symbols-outlined">lock</span>
              </span>
              <input
                v-model="password"
                id="password"
                type="password"
                placeholder="Masukkan password"
                required
                class="w-full h-[60px] pl-12 pr-4 rounded-lg border-2 border-[#bdc9c1] bg-[#f6fbf5] focus:border-[#047857] focus:ring-0 text-[18px] font-bold text-[#181d1a] placeholder:text-[#3e4943] transition-colors"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-[56px] bg-[#047857] text-white text-[17px] font-bold rounded-xl shadow-md hover:bg-[#005d42] active:scale-95 transition-all duration-200 mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {{ isLoading ? 'MEMPROSES...' : 'MASUK' }}
            <span v-if="!isLoading" class="material-symbols-outlined text-[22px]">login</span>
          </button>
        </form>
      </div>
    </main>
  </div>
</template>
