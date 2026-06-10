class AnalysisService {
  constructor() {
    this.dimensionWeights = {
      materials_rd: {
        technical_complexity: 0.25,
        safety_requirement: 0.20,
        innovation_level: 0.20,
        economic_consideration: 0.20,
        implementability: 0.15
      },
      stack_engineering: {
        technical_complexity: 0.20,
        safety_requirement: 0.25,
        innovation_level: 0.15,
        economic_consideration: 0.25,
        implementability: 0.15
      },
      system_modeling: {
        technical_complexity: 0.30,
        safety_requirement: 0.15,
        innovation_level: 0.25,
        economic_consideration: 0.15,
        implementability: 0.15
      },
      safety_analysis: {
        technical_complexity: 0.20,
        safety_requirement: 0.35,
        innovation_level: 0.15,
        economic_consideration: 0.20,
        implementability: 0.10
      },
      system_integration: {
        technical_complexity: 0.25,
        safety_requirement: 0.20,
        innovation_level: 0.15,
        economic_consideration: 0.25,
        implementability: 0.15
      }
    };

    this.keywords = {
      materials_rd: ['材料', '电极', '电解质', '正极', '负极', 'SEI', '固态电池', '锂离子', '钠离子', '硅基', '钴酸锂', '磷酸铁锂'],
      stack_engineering: ['电堆', '工艺', '制造', '热管理', '流体', '封装', 'BMS', 'PCS', '功率'],
      system_modeling: ['建模', '仿真', '数字孪生', 'SOC', 'SOH', '算法', '优化', 'AI', '机器学习'],
      safety_analysis: ['安全', '热失控', '短路', '失效', '风险', '保护', '监控', '报警'],
      system_integration: ['集成', 'EMS', '调度', '优化', '削峰', '储能', '系统', '平台']
    };
  }

  analyzeProblem(userInput) {
    // 模拟问题分析（后续可替换为真实API调用）
    return {
      technical_complexity: this.estimateComplexity(userInput),
      safety_requirement: this.estimateSafety(userInput),
      innovation_level: this.estimateInnovation(userInput),
      economic_consideration: this.estimateEconomic(userInput),
      implementability: this.estimateImplementability(userInput),
      problem_category: this.classifyProblem(userInput),
      keywords_found: this.extractKeywords(userInput)
    };
  }

  estimateComplexity(input) {
    const highComplexityWords = ['建模', '仿真', '算法', 'AI', '机器学习', '优化', '集成', '系统'];
    const mediumComplexityWords = ['设计', '控制', '管理', '策略', '流程', '方案', '机制'];
    const lowComplexityWords = ['简单', '基础', '单一', '标准', '常规'];

    let score = 5.0; // 基础分

    if (highComplexityWords.some(word => input.includes(word))) {
      score += 3.0;
    }
    if (mediumComplexityWords.some(word => input.includes(word))) {
      score += 1.5;
    }
    if (lowComplexityWords.some(word => input.includes(word))) {
      score += 0.5;
    }

    // 根据问题长度调整
    if (input.length > 100) score += 1.0;
    if (input.length > 200) score += 1.5;

    return Math.min(10.0, Math.round(score));
  }

  estimateSafety(input) {
    const highSafetyWords = ['安全', '保护', '风险', '失效', '热失控', '短路', '监控', '质量', '可靠性'];
    const mediumSafetyWords = ['标准', '规范', '要求', '保证', '稳定性', '一致性'];
    const lowSafetyWords = ['成本', '效率', '性能', '快速'];

    let score = 5.0;

    if (highSafetyWords.some(word => input.includes(word))) {
      score += 3.0;
    }
    if (mediumSafetyWords.some(word => input.includes(word))) {
      score += 1.5;
    }
    if (lowSafetyWords.some(word => input.includes(word))) {
      score += 0.5;
    }

    return Math.min(10.0, Math.round(score));
  }

  estimateInnovation(input) {
    const highInnovationWords = ['创新', '突破', '新', '首创', '前沿', '领先', '先进'];
    const mediumInnovationWords = ['改进', '优化', '升级', '提高', '增强'];
    const lowInnovationWords = ['标准', '常规', '传统', '现有', '普通'];

    let score = 5.0;

    if (highInnovationWords.some(word => input.includes(word))) {
      score += 3.0;
    }
    if (mediumInnovationWords.some(word => input.includes(word))) {
      score += 1.5;
    }
    if (lowInnovationWords.some(word => input.includes(word))) {
      score += 0.5;
    }

    return Math.min(10.0, Math.round(score));
  }

  estimateEconomic(input) {
    const highEconomicWords = ['成本', '经济', '效益', '利润', '投资', '预算', '性价比'];
    const mediumEconomicWords = ['优化', '降低', '节约', '控制', '规划', '评估'];
    const lowEconomicWords = ['功能', '性能', '质量', '效率'];

    let score = 5.0;

    if (highEconomicWords.some(word => input.includes(word))) {
      score += 3.0;
    }
    if (mediumEconomicWords.some(word => input.includes(word))) {
      score += 1.5;
    }
    if (lowEconomicWords.some(word => input.includes(word))) {
      score += 0.5;
    }

    return Math.min(10.0, Math.round(score));
  }

  estimateImplementability(input) {
    const highImplementabilityWords = ['实现', '部署', '应用', '操作', '工程', '工艺'];
    const mediumImplementabilityWords = ['设计', '开发', '测试', '验证', '优化'];
    const lowImplementabilityWords = ['理论', '分析', '研究', '方案', '思路'];

    let score = 5.0;

    if (highImplementabilityWords.some(word => input.includes(word))) {
      score += 3.0;
    }
    if (mediumImplementabilityWords.some(word => input.includes(word))) {
      score += 1.5;
    }
    if (lowImplementabilityWords.some(word => input.includes(word))) {
      score += 0.5;
    }

    return Math.min(10.0, Math.round(score));
  }

  classifyProblem(input) {
    let bestCategory = '系统集成';
    let maxMatches = 0;

    for (const [category, words] of Object.entries(this.keywords)) {
      const matches = words.filter(word => input.includes(word)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  extractKeywords(input) {
    const found = [];

    for (const [category, words] of Object.entries(this.keywords)) {
      const matchedWords = words.filter(word =>
        input.includes(word) && !found.some(f => f.keyword === word)
      );

      if (matchedWords.length > 0) {
        found.push({
          category: category,
          keywords: matchedWords
        });
      }
    }

    return found;
  }
}

export default AnalysisService;