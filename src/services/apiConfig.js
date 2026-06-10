const API_CONFIG = {
  siliconflow: {
    baseURL: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-ocgudjeychnfratpdlupcorjnawqorjqgiqventdbksglsk',
    model: 'deepseek-ai/DeepSeek-V3',
    timeout: 120000, // 120秒超时（协作任务需要更长时间）
    maxRetries: 3
  }
};

export default API_CONFIG;