import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import PosView from '../views/PosView.vue';
import LoginView from '../views/LoginView.vue';
import ProductCreateView from '../views/ProductCreateView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'Pos',
    component: PosView,
    meta: { requiresAuth: true },
  },
  {
    path: '/products/create',
    name: 'ProductCreate',
    component: ProductCreateView,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const isAuthenticated = !!auth.token;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login';
  }
  if (to.meta.requiresGuest && isAuthenticated) {
    return '/';
  }
  return true;
});
