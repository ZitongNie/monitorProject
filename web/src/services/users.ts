import api from './api';

export interface User { id: number; username: string; role: 'admin'|'user' }

export async function listUsers() {
  const { data } = await api.get('/users');
  return data as User[];
}

export async function createUser(payload: Partial<User> & { password?: string }) {
  const { data } = await api.post('/users', payload);
  return data as User;
}

export async function updateUser(id: number, payload: Partial<User>) {
  const { data } = await api.put(`/users/${id}`, payload);
  return data as User;
}

export async function deleteUser(id: number) {
  await api.delete(`/users/${id}`);
}
