// 调试助手
export const DEBUG = true;

export function logError(component: string, error: any) {
  if (DEBUG) {
    console.error(`[${component}] 错误:`, error);
  }
}

export function logInfo(component: string, message: string) {
  if (DEBUG) {
    console.log(`[${component}] ${message}`);
  }
}

export function logWarn(component: string, warning: string) {
  if (DEBUG) {
    console.warn(`[${component}] 警告:`, warning);
  }
}