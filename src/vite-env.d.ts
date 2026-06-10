/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 环境变量
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}