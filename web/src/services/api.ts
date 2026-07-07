import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api'
});

export const rootApi = axios.create({
  baseURL: import.meta.env.VITE_API_ROOT || import.meta.env.VITE_API_BASE || '/api'
});

const apiDebugFlag = (import.meta as any).env?.VITE_API_DEBUG;
const enableApiDebug =
  import.meta.env.DEV || apiDebugFlag === '1' || apiDebugFlag === 'true';

function installInterceptors(client: typeof api) {
  client.interceptors.request.use((config) => {
    const raw = localStorage.getItem('token') || import.meta.env.VITE_API_TOKEN;
    if (raw) {
      const value = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
      config.headers.set('Authorization', value);
    }
    if (enableApiDebug) {
      console.log('[api] 发送请求:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        params: config.params,
        fullUrl: `${config.baseURL || ''}${config.url || ''}`
      });
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      if (enableApiDebug) {
        console.log('[api] 响应成功:', {
          url: response.config.url,
          status: response.status
        });
      }
      return response;
    },
    (error) => {
      if (enableApiDebug) {
        console.error('[api] 响应失败:', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      return Promise.reject(error);
    }
  );
}

installInterceptors(api);
installInterceptors(rootApi);

export default api;
