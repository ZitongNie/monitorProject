/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}

// 可选：如需更严格的类型定义，可取消注释并按需扩展
// interface ImportMetaEnv {
//   readonly VITE_API_BASE: string
//   readonly VITE_WS_URL: string
//   readonly VITE_BAIDU_AK?: string
//   readonly VITE_BYPASS_LOGIN?: string
// }
// interface ImportMeta {
//   readonly env: ImportMetaEnv
// }
