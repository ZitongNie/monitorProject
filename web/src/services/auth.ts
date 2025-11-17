import api from './api';
import { useAuthStore } from '../store/auth';

type LoginResp = {
  code: number;
  message: string;
  data: {
    token: string;
    tokenType: 'Bearer' | string;
    expiresIn: number;
    expireAt: string;
    userInfo: {
      userId: number;
      username: string;
      roleType: 1 | 2;
      roleDesc?: string;
      realName?: string;
      phone?: string;
      status: number;
      createTime?: string;
      updateTime?: string;
    };
  } | null;
};

export async function login(username: string, password: string) {
  const MOCK = (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
  if (MOCK) {
    const users = getMockUsers();
    if (!username?.trim() || !password?.trim()) throw wrapError(400, '用户名或密码不能为空');
    if (password.length < 6) throw wrapError(400, '密码至少6位');
    const u = users.find(u => u.username === username);
    if (!u || u.password !== password) throw wrapError(401, '用户名或密码错误');
    const token = `mock.${btoa(`${u.userId}:${u.username}:${Date.now()}`)}`;
    const auth = useAuthStore();
    auth.setAuth(token, { id: u.userId, username: u.username, role: (u.roleType === 1 ? 'admin' : 'user') });
    return;
  }

  const resp = await api.post<LoginResp>('/sys/auth/login', { username, password });
  const body = resp.data as any;

  // 兼容两种风格：包装器与旧 Mock
  let token = '';
  let user: { id: number; username: string; role: 'admin'|'user' };

  if (typeof body?.code === 'number') {
    if (body.code !== 200) {
      const err: any = new Error(body?.message || '登录失败');
      err.response = { data: body };
      throw err;
    }
    token = body.data?.token || '';
    const u = body.data?.userInfo;
    user = { id: u.userId, username: u.username, role: (u.roleType === 1 ? 'admin' : 'user') };
  } else {
    // 旧 Mock：{ token, user: { id, username, role } }
    token = body?.token;
    user = body?.user;
  }

  const auth = useAuthStore();
  auth.setAuth(token, user);
}

export async function logout() {
  const auth = useAuthStore();
  const MOCK = (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
  if (MOCK) { auth.logout(); return; }
  const token = auth.token;
  try {
    if (token) {
      await api.post('/sys/auth/logout', { token });
    }
  } catch {}
  auth.logout();
}

export async function register(payload: { username: string; password: string; realName?: string; phone?: string }) {
  const MOCK = (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
  if (MOCK) {
    if (!payload.username?.trim()) throw wrapError(501, 'usernameError');
    if (!payload.password?.trim()) throw wrapError(506, 'passwordRequired');
    if (payload.password.length < 3) throw wrapError(422, '参数校验失败: 长度或格式非法');
    if (payload.phone && !/^1\d{10}$/.test(payload.phone)) throw wrapError(400, 'phone:手机号格式不正确');
    const users = getMockUsers();
    if (users.some(u => u.username === payload.username)) throw wrapError(505, 'userNameUsed');
    const newUser = {
      userId: users.length ? Math.max(...users.map(u => u.userId)) + 1 : 3,
      username: payload.username,
      password: payload.password,
      roleType: 2 as 1|2,
      roleDesc: '普通用户',
      realName: payload.realName || payload.username,
      phone: payload.phone,
      status: 1
    };
    setMockUsers([...users, newUser]);
    return { code: 200, message: 'success', data: null };
  }
  const { data } = await api.post('/sys/auth/register', payload);
  if (typeof (data?.code) === 'number' && data.code !== 200) {
    const err: any = new Error(data?.message || '注册失败');
    err.response = { data };
    throw err;
  }
  return data;
}

function wrapError(code: number, message: string) {
  const e: any = new Error(message);
  e.response = { data: { code, message, data: null } };
  return e;
}

type MockUser = { userId: number; username: string; password: string; roleType: 1|2; roleDesc?: string; realName?: string; phone?: string; status: number };
function getMockUsers(): MockUser[] {
  try {
    const raw = localStorage.getItem('mock_users');
    if (raw) return JSON.parse(raw);
  } catch {}
  const init: MockUser[] = [
    { userId: 1, username: 'admin', password: '123456', roleType: 1, roleDesc: '系统管理员', realName: '管理员', phone: '13900000000', status: 1 },
    { userId: 2, username: 'user01', password: '123456', roleType: 2, roleDesc: '普通用户', realName: '张三', phone: '13900000001', status: 1 },
    { userId: 3, username: 'user02', password: '123456', roleType: 2, roleDesc: '普通用户', realName: '李四', phone: '13900000002', status: 0 }
  ];
  setMockUsers(init);
  return init;
}
function setMockUsers(list: MockUser[]) {
  try { localStorage.setItem('mock_users', JSON.stringify(list)); } catch {}
}
