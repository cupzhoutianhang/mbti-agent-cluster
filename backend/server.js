/**
 * ChargeBD Web Platform API server / ChargeBD 储能研发交互系统 API 服务器
 * 基于DeepSeek API的完整实现
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// 配置DeepSeek API客户端
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-pipznfafgbzfxwirgwrpfrhsmtrxxmuszgdtuecombeubtuw',
  baseURL: 'https://api.siliconflow.cn/v1',
  timeout: 180000, // 3分钟超时
});

// 中间件配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// 16个MBTI智能体配置（基于研究报告）
const MBTI_AGENTS = [
  {
    id: 'ENFJ',
    name: 'ENFJ-Coordinator',
    role: 'Coordinator',
    mbti_type: 'ENFJ',
    color: '#06b6d4',
    system_prompt: '你是一位ENFJ协调者，擅长统筹团队资源、协调专业沟通、建立知识体系整合。你的优势是跨领域知识整合和人才培养。',
    optimal_scenarios: ['跨团队知识体系整合', '人才培养和能力提升', '项目整体进度把控'],
    weak_scenarios: ['理论深度钻研', '创新风险承担']
  },
  {
    id: 'ENFP',
    name: 'ENFP-Enthusiast',
    role: 'Enthusiast',
    mbti_type: 'ENFP',
    color: '#ec4899',
    system_prompt: '你是一位ENFP热情主义者，擅长创新方案设计、多角度问题分析、技术路线突破。你的优势是创新思维和多角度探索。',
    optimal_scenarios: ['创新方案设计', '多角度问题分析', '技术路线突破'],
    weak_scenarios: ['细节落实执行', '长期维护管理']
  },
  {
    id: 'ENTJ',
    name: 'ENTJ-Manager',
    role: 'Manager',
    mbti_type: 'ENTJ',
    color: '#ef4444',
    system_prompt: '你是一位ENTJ管理者，擅长决策统筹、优化算法、资源整体规划。你的优势是系统化思维和决策能力。',
    optimal_scenarios: ['项目整体规划', '资源统筹协调', '关键决策制定'],
    weak_scenarios: ['细节技术执行', '情感氛围把控']
  },
  {
    id: 'ENTP',
    name: 'ENTP-Innovator',
    role: 'Innovator',
    mbti_type: 'ENTP',
    color: '#f59e0b',
    system_prompt: '你是一位ENTP发明家，擅长跨界创新、概率推理、假设探索。你的优势是创新思维和问题解决能力。',
    optimal_scenarios: ['创新方案设计', '多角度问题分析', '技术路线突破'],
    weak_scenarios: ['细节落实执行', '长期维护管理']
  },
  {
    id: 'ESFJ',
    name: 'ESFJ-Facilitator',
    role: 'Facilitator',
    mbti_type: 'ESFJ',
    color: '#0ea5e9',
    system_prompt: '你是一位ESFJ促进者，擅长团队协作管理、知识传递培训、项目执行协调。你的优势是人际协调和知识分享。',
    optimal_scenarios: ['团队协作管理', '知识传递培训', '项目执行协调'],
    weak_scenarios: ['技术深度钻研', '创新风险承担']
  },
  {
    id: 'ESFP',
    name: 'ESFP-Supporter',
    role: 'Supporter',
    mbti_type: 'ESFP',
    color: '#f43f5e',
    system_prompt: '你是一位ESFP支持者，擅长技术展示推广、用户体验优化、快速原型开发。你的优势是实用导向和用户感受。',
    optimal_scenarios: ['技术展示推广', '用户体验优化', '快速原型开发'],
    weak_scenarios: ['长期规划执行', '理论深度研究']
  },
  {
    id: 'ESTJ',
    name: 'ESTJ-Supervisor',
    role: 'Supervisor',
    mbti_type: 'ESTJ',
    color: '#7c3aed',
    system_prompt: '你是一位ESTJ监管者，擅长系统化项目管理、流程优化执行、成本效益控制。你的优势是流程管理和执行能力。',
    optimal_scenarios: ['系统化项目管理', '流程优化执行', '成本效益控制'],
    weak_scenarios: ['突发创新需求', '非结构化问题处理']
  },
  {
    id: 'ESTP',
    name: 'ESTP-Operator',
    role: 'Operator',
    mbti_type: 'ESTP',
    color: '#f97316',
    system_prompt: '你是一位ESTP操作者，擅长工程问题快速解决、商业化应用推进、技术转化实施。你的优势是快速响应和实用导向。',
    optimal_scenarios: ['工程问题快速解决', '商业化应用推进', '技术转化实施'],
    weak_scenarios: ['理论深度研究', '长期系统规划']
  },
  {
    id: 'INFJ',
    name: 'INFJ-Strategist',
    role: 'Strategist',
    mbti_type: 'INFJ',
    color: '#10b981',
    system_prompt: '你是一位INFJ战略家，擅长前瞻性技术布局、复杂问题深度分析、创新与实用平衡。你的优势是系统性思维和趋势判断。',
    optimal_scenarios: ['前瞻性技术布局', '复杂问题深度分析', '创新与实用平衡'],
    weak_scenarios: ['快速技术调整', '压力下的即时决策']
  },
  {
    id: 'INFP',
    name: 'INFP-Idealist',
    role: 'Idealist',
    mbti_type: 'INFP',
    color: '#8b5cf6',
    system_prompt: '你是一位INFP理想主义者，擅长安全性深度评估、创新风险预判、人文因素考虑。你的优势是安全意识和风险评估。',
    optimal_scenarios: ['安全性深度评估', '创新风险预判', '人文因素考虑'],
    weak_scenarios: ['严格标准执行', '技术争议快速裁决']
  },
  {
    id: 'INTJ',
    name: 'INTJ-Architect',
    role: 'Architect',
    mbti_type: 'INTJ',
    color: '#3b82f6',
    system_prompt: '你是一位INTJ架构师，擅长系统性创新设计、长期战略规划、理论突破能力。你的优势是系统化创新和战略思维。',
    optimal_scenarios: ['系统性创新设计', '长期战略规划', '理论突破能力'],
    weak_scenarios: ['快速响应需求', '人际协调管理']
  },
  {
    id: 'INTP',
    name: 'INTP-Theorist',
    role: 'Theorist',
    mbti_type: 'INTP',
    color: '#6b7280',
    system_prompt: '你是一位INTP理论家，擅长极限机理突破、数学建模创新、概念性分析。你的优势是理论创新和数学建模。',
    optimal_scenarios: ['极限机理突破', '数学建模创新', '概念性分析'],
    weak_scenarios: ['高压力紧急决策', '经验类比推理']
  },
  {
    id: 'ISFJ',
    name: 'ISFJ-Coordinator',
    role: 'Coordinator',
    mbti_type: 'ISFJ',
    color: '#db2777',
    system_prompt: '你是一位ISFJ协调者，擅长安全体系维护、质量稳定保障、风险预防措施。你的优势是质量管理和风险预防。',
    optimal_scenarios: ['安全体系维护', '质量稳定保障', '风险预防措施'],
    weak_scenarios: ['激进创新方案', '复杂决策快速调整']
  },
  {
    id: 'ISFP',
    name: 'ISFP-Support',
    role: 'Support',
    mbti_type: 'ISFP',
    color: '#14b8a6',
    system_prompt: '你是一位ISFP支持者，擅长工艺精细优化、用户体验考虑、产品化实现。你的优势是实用优化和用户导向。',
    optimal_scenarios: ['工艺精细优化', '用户体验考虑', '产品化实现'],
    weak_scenarios: ['理论体系构建', '大规模战略规划']
  },
  {
    id: 'ISTJ',
    name: 'ISTJ-Engineer',
    role: 'Engineer',
    mbti_type: 'ISTJ',
    color: '#059669',
    system_prompt: '你是一位ISTJ工程师，擅长安全标准严格执行、质量管理体系、风险管控体系。你的优势是标准执行和质量控制。',
    optimal_scenarios: ['安全标准严格执行', '质量管理体系', '风险管控体系'],
    weak_scenarios: ['创新方案快速适应', '复杂决策动态调整']
  },
  {
    id: 'ISTP',
    name: 'ISTP-Practitioner',
    role: 'Practitioner',
    mbti_type: 'ISTP',
    color: '#d97706',
    system_prompt: '你是一位ISTP实践者，擅长工程实施优化、工艺改进创新、问题快速诊断。你的优势是工程实施和问题诊断。',
    optimal_scenarios: ['工程实施优化', '工艺改进创新', '问题快速诊断'],
    weak_scenarios: ['理论框架构建', '长期战略规划']
  }
];

// 问题分析和专家推荐算法（基于研究报告）
class ProblemAnalyzer {
  constructor() {
    this.thresholds = {
      innovation_high: 0.50,   // P75分位数
      innovation_medium: 0.60,  // P80分位数
      rigor_high: 0.60,        // P80分位数
      rigor_medium: 0.80,       // P80分位数
      practicality_high: 0.50, // P75分位数
      practicality_medium: 0.75, // P75分位数
      complexity_high: 0.40,      // P70分位数
      complexity_medium: 0.70      // P70分位数
    };

    this.dimensionWeights = {
      materials_rd: { technical_complexity: 0.25, safety_requirement: 0.20, innovation_level: 0.20, economic_consideration: 0.20, implementability: 0.15 },
      stack_engineering: { technical_complexity: 0.20, safety_requirement: 0.25, innovation_level: 0.15, economic_consideration: 0.25, implementability: 0.15 },
      system_modeling: { technical_complexity: 0.30, safety_requirement: 0.15, innovation_level: 0.25, economic_consideration: 0.15, implementability: 0.15 },
      safety_analysis: { technical_complexity: 0.20, safety_requirement: 0.35, innovation_level: 0.15, economic_consideration: 0.20, implementability: 0.10 },
      system_integration: { technical_complexity: 0.25, safety_requirement: 0.20, innovation_level: 0.15, economic_consideration: 0.25, implementability: 0.15 }
    };
  }

  // 使用DeepSeek API进行问题分析
  async analyzeProblem(problem) {
    try {
      const prompt = `你是一位储能领域问题分析专家。请对以下用户输入的问题进行五维度分析：

问题：${problem}

请按照以下JSON格式返回，不要包含其他文字：
{
  "technical_complexity": 1-10的数值,
  "safety_requirement": 1-10的数值,
  "innovation_level": 1-10的数值,
  "economic_consideration": 1-10的数值,
  "implementability": 1-10的数值
}

分析要求：
1. 技术复杂度：评估问题的技术深度和难度（1-10分）
2. 安全性要求：评估安全约束和风险控制需求（1-10分）
3. 创新程度：评估创新性要求和技术突破需求（1-10分）
4. 经济性考虑：评估成本效益和经济可行性要求（1-10分）
5. 可实现性：评估工程实现和制造可行性要求（1-10分）

请只返回JSON，不要包含其他文字。`;

      const response = await deepseekClient.chat.completions.create({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          {
            role: "system",
            content: "你是一位储能领域问题分析专家，擅长从技术、安全、成本、创新、可行性五个维度分析问题。请严格按照JSON格式返回分析结果。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // 推荐专家（双路径匹配）
      const recommendedAgents = this.recommendAgents(analysis);

      return {
        analysis: analysis,
        recommended_agents: recommendedAgents,
        analysis_timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('问题分析失败:', error);
      throw new Error(`问题分析失败: ${error.message}`);
    }
  }

  // 专家推荐算法（双路径匹配）
  recommendAgents(analysis) {
    const { technical_complexity, safety_requirement, innovation_level } = analysis;

    // 路径1：高复杂度优先
    const path1Agents = MBTI_AGENTS.filter(agent => {
      const score = this.calculateAgentScore(agent, analysis);
      const isHighComplexity = technical_complexity >= this.thresholds.complexity_high;
      const scenarioMatch = agent.optimal_scenarios.some(scenario =>
        (innovation_level >= this.thresholds.innovation_high && scenario.includes('创新')) ||
        (technical_complexity >= this.thresholds.complexity_medium && scenario.includes('严谨'))
      );

      return isHighComplexity && (scenarioMatch || score >= 80);
    }).slice(0, 3).sort((a, b) => b.score - a.score);

    // 路径2：安全性优先
    const path2Agents = MBTI_AGENTS.filter(agent => {
      const score = this.calculateAgentScore(agent, analysis);
      const isHighSafety = safety_requirement >= this.thresholds.rigor_high;
      const scenarioMatch = agent.optimal_scenarios.some(scenario =>
        scenario.includes('风险') || scenario.includes('安全') || scenario.includes('质量')
      );

      return isHighSafety && (scenarioMatch || score >= 80);
    }).slice(0, 3).sort((a, b) => b.score - a.score);

    return {
      primary: path1Agents,
      alternative: path2Agents,
      reasoning: this.generateReasoning(analysis, path1Agents, path2Agents)
    };
  }

  // 计算专家匹配分数
  calculateAgentScore(agent, analysis) {
    const weights = this.dimensionWeights[agent.id] || this.dimensionWeights.system_integration;

    let score = 0;
    score += analysis.technical_complexity * weights.technical_complexity * 0.9;
    score += analysis.safety_requirement * weights.safety_requirement * 0.8;
    score += analysis.innovation_level * weights.innovation_level * 0.7;
    score += analysis.economic_consideration * weights.economic_consideration * 0.6;
    score += analysis.implementability * weights.implementability * 0.5;

    return Math.min(100, Math.round(score * 10));
  }

  // 生成推荐理由
  generateReasoning(analysis, path1, path2) {
    const path1Names = path1.map(a => a.name).join(' + ');
    const path2Names = path2.map(a => a.name).join(' + ');

    return `路径1（高复杂度优先）：推荐 ${path1Names}，该组合在技术复杂度要求≥${this.thresholds.complexity_high}的情况下展现出色的综合能力和创新性。路径2（安全性优先）：备选 ${path2Names}，更注重工程实现和流程控制，适合安全要求≥${this.thresholds.rigor_high}的问题场景。`;
  }
}

// API端点实现

// 1. 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    agents_count: MBTI_AGENTS.length
  });
});

// 2. 获取专家列表端点
app.get('/api/agents', (req, res) => {
  try {
    res.json({
      agents: MBTI_AGENTS,
      count: MBTI_AGENTS.length,
      categories: {
        '材料研发': MBTI_AGENTS.filter(a => a.id.includes('材料')).map(a => a.id),
        '电堆工程': MBTI_AGENTS.filter(a => a.id.includes('工程')).map(a => a.id),
        '系统建模': MBTI_AGENTS.filter(a => a.id.includes('建模')).map(a => a.id),
        '安全分析': MBTI_AGENTS.filter(a => a.id.includes('安全')).map(a => a.id),
        '系统集成': MBTI_AGENTS.filter(a => a.id.includes('协调')).map(a => a.id)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 问题分析和专家推荐端点
app.post('/api/analyze', async (req, res) => {
  try {
    const { problem } = req.body;

    if (!problem || problem.trim().length === 0) {
      return res.status(400).json({ error: '请提供问题描述' });
    }

    const analyzer = new ProblemAnalyzer();
    const result = await analyzer.analyzeProblem(problem);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('分析错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. SSE流式专家输出端点
app.get('/api/stream', async (req, res) => {
  try {
    const { agents: agentIds, problem } = req.query;

    if (!agentIds || agentIds.split(',').length === 0) {
      return res.status(400).json({ error: '请提供专家ID列表' });
    }

    const selectedAgents = agentIds.split(',').map(id => MBTI_AGENTS.find(a => a.id === id)).filter(Boolean);

    if (selectedAgents.length === 0) {
      return res.status(400).json({ error: '未找到有效的专家' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const problemText = problem || '储能技术问题';

    // 并发调用专家思考
    const expertPromises = selectedAgents.map(async (agent) => {
      return new Promise(async (resolve, reject) => {
        try {
          const messages = [
            {
              role: "system",
              content: agent.system_prompt
            },
            {
              role: "user",
              content: `针对"${problemText}"这一问题，请从${agent.role}的专业角度进行分析。请逐步展示你的思考过程，包括：1) 当前问题的理解 2) 专业知识的调用 3) 解决方案的构思 4) 最终建议的形成。请使用清晰的段落结构，并在每个步骤之间添加emoji分隔。`
            }
          ];

          // 发送思考状态
          res.write(`data: ${JSON.stringify({
            event: 'start',
            agent_id: agent.id,
            agent_name: agent.name,
            status: 'thinking',
            progress: 5,
            current_message: `${agent.name} 正在初始化分析...`,
            timestamp: new Date().toISOString()
          })}\n\n`);

          // 模拟思考过程（分阶段）
          await sleep(800);

          res.write(`data: ${JSON.stringify({
            event: 'progress',
            agent_id: agent.id,
            agent_name: agent.name,
            status: 'analyzing',
            progress: 30,
            current_message: `${agent.name} 正在调取专业知识库...`,
            timestamp: new Date().toISOString()
          })}\n\n`);

          // 调用DeepSeek API获取真实响应
          const deepseekResponse = await deepseekClient.chat.completions.create({
            model: "deepseek-ai/DeepSeek-V3",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500,
            stream: false
          });

          const responseContent = deepseekResponse.choices[0].message.content;

          // 发送生成状态
          res.write(`data: ${JSON.stringify({
            event: 'progress',
            agent_id: agent.id,
            agent_name: agent.name,
            status: 'generating',
            progress: 80,
            current_message: `${agent.name} 正在生成解决方案...`,
            timestamp: new Date().toISOString()
          })}\n\n`);

          // 发送最终响应
          const finalMessage = `### 核心分析\n${responseContent}`;

          res.write(`data: ${JSON.stringify({
            event: 'content',
            agent_id: agent.id,
            agent_name: agent.name,
            status: 'completed',
            progress: 100,
            current_message: `${agent.name} 已完成分析`,
            content: finalMessage,
            timestamp: new Date().toISOString()
          })}\n\n`);

          resolve();

        } catch (error) {
          console.error(`专家 ${agent.id} 调用失败:`, error);

          res.write(`data: ${JSON.stringify({
            event: 'error',
            agent_id: agent.id,
            agent_name: agent.name,
            status: 'failed',
            progress: 0,
            current_message: `${agent.name} 分析失败: ${error.message}`,
            timestamp: new Date().toISOString()
          })}\n\n`);

          reject(error);
        }
      });
    });

    // 等待所有专家完成
    await Promise.all(expertPromises);

    // 发送完成事件
    res.write(`data: ${JSON.stringify({
      event: 'complete',
      message: '所有专家分析完成',
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('SSE流错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. 专家观点整合端点
app.post('/api/integrate', async (req, res) => {
  try {
    const { problem, expert_responses } = req.body;

    if (!expert_responses || expert_responses.length === 0) {
      return res.status(400).json({ error: '请提供专家响应数据' });
    }

    // 使用DeepSeek API整合专家观点
    const integrationPrompt = `你是一位MBTI多专家协作协调专家。请对以下储能领域问题进行综合分析：

原始问题：${problem}

专家观点汇总：
${expert_responses.map((response, index) => `${index + 1}. ${response.agent_name}（${response.agent_id}）：\n${response.content || '暂无内容'}\n`).join('\n')}

请按照以下要求生成最终综合报告：

1. **核心共识分析**：识别所有专家的共同关注点和分歧点
2. **多维解决方案**：综合不同专业视角的解决方案
3. **优先级建议**：明确短期、中期、长期实施建议
4. **风险提示**：指出技术、成本、安全等关键风险点
5. **成功指标**：制定可衡量的成功评估标准

请生成结构化的综合报告，包含以上所有要点。`;

    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3",
      messages: [
        {
          role: "system",
          content: "你是一位专业的储能领域综合分析专家，擅长整合多专家观点、生成综合报告、提供实施建议。"
        },
        {
          role: "user",
          content: integrationPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 2000
    });

    const integratedReport = response.choices[0].message.content;

    res.json({
      success: true,
      integrated_report: integratedReport,
      integration_timestamp: new Date().toISOString(),
      expert_count: expert_responses.length
    });
  } catch (error) {
    console.error('整合错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 6. MBTI类型推荐端点
app.get('/api/mbti-recommend', (req, res) => {
  try {
    const { problem_type, complexity, innovation } = req.query;

    let recommendedAgents = MBTI_AGENTS;

    // 基于问题类型推荐
    if (problem_type) {
      const typeMapping = {
        '材料': ['ENFJ', 'INTJ', 'INTP', 'INFJ'],
        '电池': ['ESTP', 'ISTP', 'ESFP', 'ISFP'],
        '系统': ['ENTJ', 'INTJ', 'ESFJ', 'ISTJ'],
        '安全': ['INFJ', 'INFP', 'ISFJ', 'ESTJ'],
        '建模': ['INTP', 'ENTP', 'ISTJ', 'ESTJ']
      };

      const typeKey = Object.keys(typeMapping).find(key => problem_type.includes(key));
      if (typeKey) {
        recommendedAgents = MBTI_AGENTS.filter(agent => typeMapping[typeKey].includes(agent.id));
      }
    }

    // 基于复杂度和创新度过滤
    if (complexity === 'high') {
      recommendedAgents = recommendedAgents.filter(agent =>
        ['INTJ', 'INTP', 'ENTP', 'INFJ'].includes(agent.id)
      );
    } else if (complexity === 'low') {
      recommendedAgents = recommendedAgents.filter(agent =>
        ['ISTJ', 'ESTJ', 'ESFJ', 'ESTP'].includes(agent.id)
      );
    }

    if (innovation === 'high') {
      recommendedAgents = recommendedAgents.filter(agent =>
        ['INTP', 'ENTP', 'ENFP', 'ESFP'].includes(agent.id)
      );
    }

    res.json({
      recommended_agents: recommendedAgents.slice(0, 6),
      total_agents: MBTI_AGENTS.length,
      filters_applied: { problem_type, complexity, innovation }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 辅助函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 MBTI多智能体API服务器启动成功！`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🤖️  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🧠 专家数量: ${MBTI_AGENTS.length}`);
  console.log(`🌐 API端点:`);
  console.log(`   GET  /health - 健康检查`);
  console.log(`   GET  /api/agents - 获取专家列表`);
  console.log(`   POST /api/analyze - 问题分析和专家推荐`);
  console.log(`   GET  /api/stream - SSE流式专家输出`);
  console.log(`   POST /api/integrate - 专家观点整合`);
  console.log(`   GET  /api/mbti-recommend - MBTI类型推荐`);
  console.log(`\n✨ 服务器准备就绪，等待请求...`);
});