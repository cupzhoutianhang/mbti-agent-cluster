import API_CONFIG from './apiConfig.js';

class SiliconFlowService {
  constructor() {
    this.apiKey = API_CONFIG.siliconflow.apiKey;
    this.baseURL = API_CONFIG.siliconflow.baseURL;
    this.model = API_CONFIG.siliconflow.model;
    this.timeout = API_CONFIG.siliconflow.timeout;
  }

  async analyzeProblem(userInput) {
    const systemPrompt = `你是一位专业的储能领域问题分析专家。
请对以下用户输入的问题进行五维度分析：

问题：${userInput}

请按照以下JSON格式返回：
{
  "technical_complexity": 1-10的数值,
  "safety_requirement": 1-10的数值,
  "innovation_level": 1-10的数值,
  "economic_consideration": 1-10的数值,
  "implementability": 1-10的数值,
  "problem_category": "材料研发|电堆工程|系统建模|安全分析|系统集成"
}

分析要求：
1. 技术复杂度：评估问题的技术深度和难度
2. 安全性要求：评估安全约束和风险控制需求
3. 创新程度：评估创新性要求和技术突破需求
4. 经济性考虑：评估成本效益和经济可行性要求
5. 可实现性：评估工程实现和制造可行性要求

请只返回JSON，不要包含其他文字。`;

    try {
      const response = await this.callAPI([
        {
          role: 'system',
          content: '你是一位储能领域专家，回答必须专业、准确、可操作。'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ]);

      return this.parseAnalysis(response);
    } catch (error) {
      console.error('SiliconFlow分析失败:', error);
      return this.getFallbackAnalysis(userInput);
    }
  }

  async getExpertResponse(expertId, problem, context = '') {
    // 获取专家配置
    const experts = await this.loadExpertsData();
    const expert = experts.find(e => e.id === expertId);
    if (!expert) {
      throw new Error(`未找到专家: ${expertId}`);
    }

    const prompt = this.generateExpertPrompt(expert, problem, context);

    try {
      const response = await this.callAPI([
        {
          role: 'system',
          content: this.getSystemPrompt(expert)
        },
        {
          role: 'user',
          content: prompt
        }
      ], expertId);

      return {
        expertId: expertId,
        response: response.content,
        timestamp: new Date(),
        confidence: this.calculateConfidence(response, expert)
      };
    } catch (error) {
      console.error(`专家 ${expertId} 响应失败:`, error);
      return {
        expertId: expertId,
        error: error.message,
        timestamp: new Date(),
        retryAvailable: true
      };
    }
  }

  generateExpertPrompt(expert, problem, context) {
    const abilities = expert.capabilities;
    const capabilitiesText = Object.entries(abilities)
      .map(([key, value]) => `- ${this.translateCapability(key)}：${value}/10`)
      .join('\n');

    const scenariosText = expert.optimal_scenarios
      .map(s => `- ${s}`)
      .join('\n');

    const contextText = context ? `\n其他专家的观点：${context}\n` : '';

    return `
你是一位${expert.name}，专业领域是${expert.field}。

核心能力：
${capabilitiesText}

专业优势：
${scenariosText}

${contextText}

请基于你的专业能力，对以下储能领域问题进行分析：

问题：${problem}

请严格按照以下要求：
1. 发挥你的专业优势领域
2. 保持技术严谨性
3. 提供可操作的解决方案
4. 如有不确定性，请明确指出
5. 如果涉及多个方面，请逐条分析
${expert.weak_scenarios.length > 0 ? `
注意：以下场景不是你的优势，请谨慎处理：
${expert.weak_scenarios.map(s => `- ${s}`).join('\n')}
` : ''}

请提供专业、详细、可操作的分析结果。
`;
  }

  getSystemPrompt(expert) {
    return `你是一位${expert.name}，专业领域是储能领域的${expert.field}。

你的核心优势是：
${expert.optimal_scenarios.map(s => `- ${s}`).join('\n')}

你的工作方式：
- 保持技术严谨性和专业深度
- 提供可操作的工程方案
- 明确指出技术风险和不确定性
- 考虑多目标平衡（性能、成本、安全等）
- 如涉及多个专业领域，请逐条分析
- 避免过度简化的结论

请确保回答质量高、逻辑清晰、实用性强。
`;
  }

  translateCapability(key) {
    const translations = {
      'theoretical_innovation': '理论创新',
      'system_architecture': '系统架构',
      'engineering_implementation': '工程实施',
      'economic_analysis': '经济分析',
      'system_evaluation': '系统评估',
      'process_validation': '流程验证'
    };
    return translations[key] || key;
  }

  async callAPI(messages, expertId = null) {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false // 暂时使用非流式响应，简化实现
        }),
        timeout: this.timeout
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('SiliconFlow API调用失败:', error);
      throw error;
    }
  }

  parseAnalysis(response) {
    try {
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return this.extractAnalysisFromText(content);
    } catch (error) {
      console.error('解析分析结果失败:', error);
      return this.getFallbackAnalysis('默认问题');
    }
  }

  extractAnalysisFromText(text) {
    const patterns = {
      technical_complexity: /技术复杂度[：:]\s*(\d+(?:\.\d+)?)/i,
      safety_requirement: /安全性要求[：:]\s*(\d+(?:\.\d+)?)/i,
      innovation_level: /创新程度[：:]\s*(\d+(?:\.\d+)?)/i,
      economic_consideration: /经济性考虑[：:]\s*(\d+(?:\.\d+)?)/i,
      implementability: /可实现性[：:]\s*(\d+(?:\.\d+)?)/i
    };

    const extractValue = (pattern) => {
      const match = text.match(pattern);
      return match ? parseFloat(match[1]) : 7.5; // 默认中等值
    };

    const keywords = {
      materials_rd: ['材料', '电极', '正极', '负极', '电解质', '固态电池', 'SEI'],
      stack_engineering: ['电堆', '工艺', '制造', '热管理', '封装'],
      system_modeling: ['建模', '仿真', '数字孪生', 'SOC', 'SOH', '算法'],
      safety_analysis: ['安全', '热失控', '短路', '风险', '保护'],
      system_integration: ['集成', 'EMS', '调度', '优化', '削峰']
    };

    let category = '系统集成';
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        category = cat;
        break;
      }
    }

    return {
      technical_complexity: extractValue(patterns.technical_complexity),
      safety_requirement: extractValue(patterns.safety_requirement),
      innovation_level: extractValue(patterns.innovation_level),
      economic_consideration: extractValue(patterns.economic_consideration),
      implementability: extractValue(patterns.implementability),
      problem_category: category
    };
  }

  getFallbackAnalysis(problem) {
    return {
      technical_complexity: 7.5,
      safety_requirement: 8.0,
      innovation_level: 7.0,
      economic_consideration: 7.5,
      implementability: 8.0,
      problem_category: '系统集成'
    };
  }

  async loadExpertsData() {
    try {
      const response = await fetch('/data/experts-complete-16.json');
      const data = await response.json();
      return data.agents;
    } catch (error) {
      console.error('加载专家数据失败:', error);
      return []; // 返回空数组，让调用者处理错误
    }
  }

  calculateConfidence(response, expert) {
    const responseLength = response.length;
    const hasStructure = /\d+\.\s*|\d+\.\s*/.test(response);
    const hasData = /数据|百分比|比值|kWh|Ah|V/.test(response);

    let confidence = 0.7; // 基础置信度

    if (responseLength > 500) confidence += 0.1;
    if (responseLength > 1000) confidence += 0.1;
    if (hasStructure) confidence += 0.05;
    if (hasData) confidence += 0.05;

    // 考虑专家在该领域的优势
    if (expert?.historical_performance?.materials_rd > 90) {
      confidence += 0.05;
    }

    return Math.min(0.95, Math.round(confidence * 100) / 100);
  }
}

export default SiliconFlowService;