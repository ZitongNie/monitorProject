import { defineStore } from 'pinia';
export type Role = 'admin' | 'user';

interface UserInfo {
  id: number;
  username: string;
  role: Role;
}

interface State {
  token: string | null;
  user: UserInfo | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): State => ({
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null
  }),
  getters: {
    isAuthed: (s) => !!s.token,
  },
  actions: {
    setAuth(token: string, user: UserInfo) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
      this.token = null; this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    hasRole(role: Role) {
      return this.user?.role === role;
    }
  }
});
