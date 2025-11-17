import api from './api';

export interface User {
  id: number;
  username: string;
  role: 'admin'|'user';
  realName?: string;
  phone?: string;
  roleDesc?: string;
  status?: 0|1;
}

export interface UserListResult {
  total: number;
  pages: number;
  pageNum: number;
  pageSize: number;
  list: User[];
}

type Wrapper<T> = { code: number; message: string; data: T };

// 将后端的 roleType 转为前端 'admin'|'user'
function mapRole(roleType: number): 'admin'|'user' { return roleType === 1 ? 'admin' : 'user'; }
function toRoleType(role: 'admin'|'user'): 1|2 { return role === 'admin' ? 1 : 2; }

function isMock(): boolean {
  return (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
}

type MockUser = { userId: number; username: string; password: string; roleType: 1|2; roleDesc?: string; realName?: string; phone?: string; status: 0|1 };

function getMockUsers(): MockUser[] {
  try {
    const raw = localStorage.getItem('mock_users');
    if (raw) return JSON.parse(raw);
  } catch {}
  // 默认测试用户数据
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

// GET /sys/user/list
export async function listUsers(params?: { username?: string; role?: 'admin'|'user'; status?: 0|1; pageNum?: number; pageSize?: number }): Promise<UserListResult> {
  if (isMock()) {
    const users = getMockUsers();
    let filtered = users;
    if (params?.username) {
      filtered = filtered.filter(u => u.username.includes(params.username!));
    }
    if (params?.role) {
      filtered = filtered.filter(u => mapRole(u.roleType) === params.role);
    }
    if (params?.status !== undefined) {
      filtered = filtered.filter(u => u.status === params.status);
    }
    const pageNum = params?.pageNum ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);
    return {
      total: filtered.length,
      pages: Math.ceil(filtered.length / pageSize),
      pageNum,
      pageSize,
      list: paged.map(u => ({
        id: u.userId,
        username: u.username,
        role: mapRole(u.roleType),
        realName: u.realName,
        phone: u.phone,
        roleDesc: u.roleDesc,
        status: u.status
      }))
    };
  }

  const query: any = {
    username: params?.username,
    roleType: params?.role ? toRoleType(params.role) : undefined,
    status: params?.status,
    pageNum: params?.pageNum ?? 1,
    pageSize: params?.pageSize ?? 50
  };
  const resp = await api.get<Wrapper<{ total: number; pages: number; pageNum: number; pageSize: number; list: any[] }>>('/sys/user/list', { params: query });
  const body = resp.data;
  if (typeof body?.code === 'number' && body.code !== 200) throw wrap(body);
  const list = body.data?.list || [];
  const users: User[] = list.map((u: any) => ({
    id: u.userId,
    username: u.username,
    role: mapRole(u.roleType),
    realName: u.realName,
    phone: u.phone,
    roleDesc: u.roleDesc,
    status: u.status
  }));
  return {
    total: body.data?.total || 0,
    pages: body.data?.pages || 0,
    pageNum: body.data?.pageNum || 1,
    pageSize: body.data?.pageSize || 10,
    list: users
  };
}

// GET /sys/user/detail （管理员可查任意，普通用户仅查自身）
export async function getUserDetail(userId: number): Promise<User> {
  if (isMock()) {
    const users = getMockUsers();
    const u = users.find(u => u.userId === userId);
    if (!u) {
      const err: any = new Error('用户不存在');
      err.response = { data: { code: 404, message: '用户不存在', data: null } };
      throw err;
    }
    return {
      id: u.userId,
      username: u.username,
      role: mapRole(u.roleType),
      realName: u.realName,
      phone: u.phone,
      roleDesc: u.roleDesc,
      status: u.status
    };
  }

  const resp = await api.get<Wrapper<any>>('/sys/user/detail', { params: { userId } });
  const body = resp.data;
  if (typeof body?.code === 'number' && body.code !== 200) throw wrap(body);
  const u = body.data;
  return {
    id: u.userId,
    username: u.username,
    role: mapRole(u.roleType),
    realName: u.realName,
    phone: u.phone,
    roleDesc: u.roleDesc,
    status: u.status
  };
}

// POST /sys/user/add （仅管理员）
export async function createUser(payload: { username: string; password: string; role?: 'admin'|'user'; realName?: string; phone?: string; status?: 0|1; roleDesc?: string }) {
  if (isMock()) {
    const users = getMockUsers();
    if (users.some(u => u.username === payload.username)) {
      const err: any = new Error('用户名已存在');
      err.response = { data: { code: 400, message: '用户名已存在', data: null } };
      throw err;
    }
    const newUser: MockUser = {
      userId: users.length ? Math.max(...users.map(u => u.userId)) + 1 : 1,
      username: payload.username,
      password: payload.password,
      roleType: toRoleType(payload.role || 'user'),
      roleDesc: payload.roleDesc ?? ((payload.role || 'user') === 'admin' ? '系统管理员' : '普通用户'),
      realName: payload.realName ?? payload.username,
      phone: payload.phone,
      status: payload.status ?? 1
    };
    setMockUsers([...users, newUser]);
    return;
  }

  const body = {
    username: payload.username,
    password: payload.password,
    roleType: toRoleType(payload.role || 'user'),
    roleDesc: payload.roleDesc ?? ((payload.role || 'user') === 'admin' ? '系统管理员' : '普通用户'),
    realName: payload.realName ?? payload.username,
    phone: payload.phone,
    status: payload.status ?? 1
  };
  const resp = await api.post<Wrapper<null>>('/sys/user/add', body);
  const data = resp.data;
  if (data.code !== 200) throw wrap(data);
}

// PUT /sys/user/update （仅管理员）
export async function updateUser(id: number, payload: { password?: string; role?: 'admin'|'user'; roleDesc?: string; realName?: string; phone?: string; status?: 0|1; username?: string }) {
  if (isMock()) {
    const users = getMockUsers();
    const idx = users.findIndex(u => u.userId === id);
    if (idx === -1) {
      const err: any = new Error('用户不存在');
      err.response = { data: { code: 404, message: '用户不存在', data: null } };
      throw err;
    }
    const updated = { ...users[idx] };
    if (payload.password) updated.password = payload.password;
    if (payload.role) updated.roleType = toRoleType(payload.role);
    if (payload.roleDesc !== undefined) updated.roleDesc = payload.roleDesc;
    if (payload.realName !== undefined) updated.realName = payload.realName;
    if (payload.phone !== undefined) updated.phone = payload.phone;
    if (payload.status !== undefined) updated.status = payload.status;
    users[idx] = updated;
    setMockUsers(users);
    return;
  }

  const body: any = { userId: id };
  if (payload.username) body.username = payload.username; // 用于一致性校验（必须等于原用户名，否则后端会报错）
  if (payload.password) body.password = payload.password;
  if (payload.role) body.roleType = toRoleType(payload.role);
  if (payload.roleDesc !== undefined) body.roleDesc = payload.roleDesc;
  if (payload.realName !== undefined) body.realName = payload.realName;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.status !== undefined) body.status = payload.status;
  const resp = await api.put<Wrapper<null>>('/sys/user/update', body);
  const data = resp.data; if (data.code !== 200) throw wrap(data);
}

// DELETE /sys/user/delete?userId=xx （仅管理员）
export async function deleteUser(id: number) {
  if (isMock()) {
    const users = getMockUsers();
    const filtered = users.filter(u => u.userId !== id);
    if (filtered.length === users.length) {
      const err: any = new Error('用户不存在');
      err.response = { data: { code: 404, message: '用户不存在', data: null } };
      throw err;
    }
    setMockUsers(filtered);
    return;
  }

  const resp = await api.delete<Wrapper<null>>('/sys/user/delete', { params: { userId: id } });
  const data = resp.data; if (data.code !== 200) throw wrap(data);
}

function wrap(body: any) { const e: any = new Error(body?.message || 'request error'); e.response = { data: body }; return e; }
