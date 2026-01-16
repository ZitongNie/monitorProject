import api from './api';

interface Wrapper<T> { code: number; message: string; data: T | null }

async function request<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  const body: Wrapper<T> = res.data;
  if (body.code !== 200) {
    throw new Error(body.message || 'serverError');
  }
  return body.data as T;
}

export interface UpdateAlertStatusBody {
  handled: boolean;
  handler?: string;
}

/**
 * 变更预警处理状态
 * PUT /api/alerts/{id}/status
 */
export async function updateAlertStatus(id: number, body: UpdateAlertStatusBody): Promise<void> {
  await request<void>(api.put(`/alerts/${id}/status`, body));
}
