import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../store/auth';

const Login = () => import('../pages/Login.vue');
const Dashboard = () => import('../pages/Dashboard.vue');
const MapView = () => import('../pages/MapView.vue');
const Stations = () => import('../pages/Stations.vue');
const Piles = () => import('../pages/Piles.vue');
const Analytics = () => import('../pages/Analytics.vue');
const AdminUsers = () => import('../pages/AdminUsers.vue');
const AdminAssets = () => import('../pages/AdminAssets.vue');

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/',
    component: () => import('../pages/_Layout.vue'),
    children: [
      { path: 'dashboard', name: 'dashboard', component: Dashboard },
      { path: 'map', name: 'map', component: MapView },
      { path: 'stations', name: 'stations', component: Stations },
      { path: 'piles', name: 'piles', component: Piles },
      { path: 'analytics', name: 'analytics', component: Analytics },
      { path: 'admin/users', name: 'admin-users', component: AdminUsers, meta: { role: 'admin' } },
      { path: 'admin/assets', name: 'admin-assets', component: AdminAssets, meta: { role: 'admin' } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const BYPASS = (import.meta as any).env?.VITE_BYPASS_LOGIN === '1' || (import.meta as any).env?.VITE_BYPASS_LOGIN === 'true';

router.beforeEach((to, _from, next) => {
  if (BYPASS) {
    if (to.name === 'login') return next({ name: 'dashboard' });
    return next();
  }
  const auth = useAuthStore();
  if (to.meta.public) return next();
  if (!auth.isAuthed) return next({ name: 'login', query: { redirect: to.fullPath } });
  if (to.meta.role && !auth.hasRole(to.meta.role as any)) return next({ name: 'dashboard' });
  next();
});

export default router;
