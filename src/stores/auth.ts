import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LoginResponse, User } from '../types';

const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_user';

function loadUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<User | null>(loadUser());

  function setAuth(data: LoginResponse['data']): void {
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function setUser(data: User): void {
    user.value = data;
    localStorage.setItem(USER_KEY, JSON.stringify(data));
  }

  function clearAuth(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return { token, user, setAuth, setUser, clearAuth };
});
