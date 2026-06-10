# ChargeBD 储能研发交互系统 - API 服务器

基于DeepSeek API的完整后端服务实现，支持问题分析、专家推荐、SSE流式输出和综合报告生成。

## 🚀 快速开始

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 配置环境变量
```bash
# 复制示例配置文件
cp .env.example .env

# 编辑.env文件，填入您的DeepSeek API密钥
DEEPSEEK_API_KEY=your_api_key_here
```

### 3. 启动服务器
```bash
# 开发模式（自动重载）
npm run dev

# 生产模式
npm start
```

## 📡 API端点说明

### 1. 健康检查端点
**GET** `/health`
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "agents_count": 16
}
```

### 2. 获取专家列表
**GET** `/api/agents`
```json
{
  "agents": [...16个MBTI专家配置],
  "count": 16,
  "categories": {
    "材料研发": ["INTJ", "INTP", "INFJ"],
    "电堆工程": ["ISTP", "ESTP", "ISFP", "ESFP"],
    "系统建模": ["INTJ", "INTP", "ISTJ", "ESTJ"],
    "安全分析": ["INFP", "INFJ", "ISFJ", "ESTJ"],
    "系统集成": ["ENFJ", "ENTJ", "ESFJ"]
  }
}
```

### 3. 问题分析和专家推荐
**POST** `/api/analyze`
```json
// 请求体
{
  "problem": "如何提高锂离子电池的安全性？"
}

// 响应
{
  "success": true,
  "analysis": {
    "technical_complexity": 8.5,
    "safety_requirement": 9.2,
    "innovation_level": 7.5,
    "economic_consideration": 8.0,
    "implementability": 8.3
  },
  "recommended_agents": {
    "primary": [
      {
        "id": "INTJ",
        "name": "INTJ-Architect",
        "role": "Architect",
        "match_score": 87,
        "optimal_scenarios": [...]
      }
    ],
    "alternative": [...]
  },
  "reasoning": "路径1（高复杂度优先）：推荐 INTJ-Architect，该组合在技术复杂度要求≥60%的情况下展现出色的综合能力和创新性。路径2（安全性优先）：备选 ENFJ-Coordinator，更注重工程实现和流程控制。",
  "analysis_timestamp": "2024-01-01T00:00:00Z"
}
```

### 4. SSE流式专家输出
**GET** `/api/stream`
```javascript
// 客户端连接示例
const eventSource = new EventSource('http://localhost:3001/api/stream?agents=INTJ,INTP,INFJ&problem=储能技术问题');

// 监听SSE事件
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.event) {
    case 'start':
      // 专家开始分析
      console.log(`${data.agent_name} 开始分析`);
      break;

    case 'progress':
      // 分析进度更新
      console.log(`${data.agent_name} 进度: ${data.progress}%`);
      console.log(`当前消息: ${data.current_message}`);
      break;

    case 'content':
      // 专家生成的内容
      console.log(`${data.agent_name} 生成内容: ${data.content}`);
      break;

    case 'completed':
      // 专家完成分析
      console.log(`${data.agent_name} 分析完成`);
      break;

    case 'error':
      // 专家分析出错
      console.error(`${data.agent_name} 分析失败: ${data.current_message}`);
      break;
  }
};

eventSource.addEventListener('complete', () => {
  console.log('所有专家分析完成');
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('SSE连接错误:', error);
};
```

### 5. 专家观点整合
**POST** `/api/integrate`
```json
// 请求体
{
  "problem": "如何优化储能系统管理？",
  "expert_responses": [
    {
      "agent_id": "INTJ",
      "agent_name": "INTJ-Architect",
      "content": "基于系统架构角度，我建议..."
    },
    {
      "agent_id": "INTP",
      "agent_name": "INTP-Theorist",
      "content": "从理论创新角度，我认为..."
    }
  ]
}

// 响应
{
  "success": true,
  "integrated_report": "完整的综合分析报告内容...",
  "integration_timestamp": "2024-01-01T00:00:00Z",
  "expert_count": 2
}
```

### 6. MBTI类型推荐
**GET** `/api/mbti-recommend`
```javascript
// 请求参数
const queryParams = new URLSearchParams({
  problem_type: '材料',    // 或 '电池', '系统', '安全', '建模'
  complexity: 'high',         // 'high' 或 'low'
  innovation: 'high'          // 'high' 或 'low'
});

fetch(`http://localhost:3001/api/mbti-recommend?${queryParams.toString()}`)
  .then(response => response.json())
  .then(data => {
    console.log('推荐的专家:', data.recommended_agents);
  });
```

## 🧠 16个MBTI智能体配置

### 专家列表
| ID | 姓名 | 角色 | MBTI | 专长领域 | 优势场景 |
|----|------|------|------|-----------|----------|
| ENFJ | ENFJ-Coordinator | ENFJ | 团队协调 | 跨团队知识体系整合、人才培养和能力提升 |
| ENFP | ENFP-Enthusiast | ENFP | 方案创新 | 创新方案设计、多角度问题分析、技术路线突破 |
| ENTJ | ENTJ-Manager | ENTJ | 决策统筹 | 项目整体规划、资源统筹协调、关键决策制定 |
| ENTP | ENTP-Innovator | ENTP | 跨界创新 | 创新方案设计、多角度问题分析、技术路线突破 |
| ESFJ | ESFJ-Facilitator | ESFJ | 团队协作 | 团队协作管理、知识传递培训、项目执行协调 |
| ESFP | ESFP-Supporter | ESFP | 技术推广 | 技术展示推广、用户体验优化、快速原型开发 |
| ESTJ | ESTJ-Supervisor | ESTJ | 流程管理 | 系统化项目管理、流程优化执行、成本效益控制 |
| ESTP | ESTP-Operator | ESTP | 工程实施 | 工程问题快速解决、商业化应用推进、技术转化实施 |
| INFJ | INFJ-Strategist | INFJ | 系统洞察 | 前瞻性技术布局、复杂问题深度分析、创新与实用平衡 |
| INFP | INFP-Idealist | INFP | 安全分析 | 安全性深度评估、创新风险预判、人文因素考虑 |
| INTJ | INTJ-Architect | INTJ | 系统架构 | 系统性创新设计、长期战略规划、理论突破能力 |
| INTP | INTP-Theorist | INTP | 理论创新 | 极限机理突破、数学建模创新、概念性分析 |
| ISFJ | ISFJ-Coordinator | ISFJ | 质量管理 | 安全体系维护、质量稳定保障、风险预防措施 |
| ISFP | ISFP-Support | ISFP | 工艺优化 | 工艺精细优化、用户体验考虑、产品化实现 |
| ISTJ | ISTJ-Engineer | ISTJ | 标准执行 | 安全标准严格执行、质量管理体系、风险管控体系 |
| ISTP | ISTP-Practitioner | ISTP | 工程实施 | 工程实施优化、工艺改进创新、问题快速诊断 |

## 🔧 技术架构

### 技术栈
- **Node.js** + **Express.js**: 高性能Web服务器
- **OpenAI SDK**: DeepSeek API统一调用
- **Server-Sent Events (SSE)**: 实时流式数据传输
- **环境变量管理**: 安全的API密钥配置

### 核心功能
1. **问题分析引擎**
   - 基于DeepSeek API的五维度分析
   - 自动问题类型识别
   - 复杂度评估算法

2. **专家推荐系统**
   - 双路径匹配算法（高复杂度优先 vs 安全性优先）
   - 16个MBTI专家能力匹配
   - 动态权重计算

3. **SSE流式输出**
   - 多专家并行思考
   - 实时进度推送
   - 流式内容生成

4. **智能整合系统**
   - 多专家观点汇总
   - 冲突识别和解决
   - 结构化报告生成

## 📊 API使用说明

### DeepSeek API配置
- **模型**: deepseek-ai/DeepSeek-V3
- **温度**: 0.7（问题分析）, 0.6（整合）
- **最大Token**: 2000（单次请求）
- **超时时间**: 180秒
- **重试机制**: 3次自动重试

### 推荐算法参数
- **创新度阈值**: 高 ≥60%, 中 ≥40%
- **复杂度阈值**: 高 ≥40%, 中 ≥70%
- **严谨度阈值**: 高 ≥60%, 中 ≥80%
- **实践导向阈值**: 高 ≥50%, 中 ≥75%

## 🔍 开发和测试

### 本地开发
```bash
# 安装nodemon用于自动重载
npm install --save-dev nodemon

# 启动开发服务器
npm run dev
```

### 测试API
```bash
# 健康检查
curl http://localhost:3001/health

# 获取专家列表
curl http://localhost:3001/api/agents

# 测试问题分析
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"problem":"如何提高电池能量密度？"}'
```

## 🌟 部署说明

### 生产环境配置
1. 将`NODE_ENV`设置为`production`
2. 配置实际的DeepSeek API密钥
3. 增加反向代理和负载均衡
4. 启用HTTPS和CORS配置
5. 配置日志监控和错误跟踪

### 性能优化建议
- 启用Gzip压缩
- 配置CDN加速
- 实现Redis缓存层
- 数据库连接池管理
- API限流保护

## 📝 开发日志

- 2024-01-01: 初始版本发布
- 支持16个MBTI专家的完整配置
- 实现SSE流式实时输出
- 集成DeepSeek API
- 提供完整的问题分析和专家推荐算法

## 🚨 错误处理

### API错误响应格式
```json
{
  "success": false,
  "error": "错误描述",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 💡 使用建议

### 前端集成示例
```javascript
// 连接到SSE流
const eventSource = new EventSource('http://localhost:3001/api/stream?agents=INTJ,INTP,INFJ&problem=储能技术问题');

// 处理实时事件
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 更新UI显示专家进度和内容
};

// 调用问题分析
const analyzeResponse = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ problem: userInput })
});

const analysis = await analyzeResponse.json();
// 根据推荐选择专家
```

### 最佳实践
1. **错误处理**: 始终捕获并处理API异常
2. **重试机制**: 实现指数退避重试策略
3. **超时控制**: 设置合理的请求超时时间
4. **日志记录**: 记录关键操作和错误信息
5. **限流保护**: 防止API滥用和过载

## 📧 联系支持

如有问题或建议，请联系开发团队：
- **API文档**: 查看本研究报告了解详细架构
- **GitHub Issues**: 提交bug报告和功能请求
- **技术支持**: 技术问题和集成支持

---

**版本**: 1.0.0
**最后更新**: 2024-01-01
**状态**: 生产就绪 ✅