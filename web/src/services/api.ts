import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  console.log('[api] 发送请求:', {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    params: config.params,
    headers: config.headers,
    fullUrl: `${config.baseURL}${config.url}`
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[api] 响应成功:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    // 打印完整的 JSON 数据
    console.log('[api] 响应 data 完整内容:', JSON.stringify(response.data, null, 2));
    return response;
  },
  (error) => {
    console.error('[api] 响应失败:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default api;
