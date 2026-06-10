class RecommendationService {
  constructor(analysisService, expertData) {
    this.analysisService = analysisService;
    this.expertData = expertData;

    // 基于报告数据的阈值设置
    this.thresholds = {
      innovation_high: 0.50,   // P75分位数，创新需求≥50%
      innovation_medium: 0.60,  // P80分位数，创新需求≥60%
      rigor_high: 0.60,        // P80分位数，严谨性要求≥60%
      rigor_medium: 0.80,       // P80分位数，严谨性要求≥80%
      practicality_high: 0.50, // P75分位数，实践导向≥50%
      practicality_medium: 0.75, // P75分位数，实践导向≥75%
      complexity_high: 0.40,      // P70分位数，复杂度要求≥40%
      complexity_medium: 0.70      // P70分位数，复杂度要求≥70%
    };
  }

  analyzeProblem(userInput) {
    return this.analysisService.analyzeProblem(userInput);
  }

  recommendExperts(problemAnalysis) {
    const analysis = problemAnalysis;
    const { technical_complexity, safety_requirement, innovation_level, economic_consideration, implementability } = analysis;

    // 计算每个专家的匹配度
    const expertScores = this.expertData.map(expert => {
      return {
        expert: expert,
        matchScore: this.calculateMatchScore(expert, analysis),
        applicableScenarios: this.checkScenarioMatch(expert, analysis),
        totalWeight: 0
      };
    });

    // 为每个专家计算总权重分数
    expertScores.forEach(score => {
      const weights = this.dimensionWeights[score.expert.field] || this.dimensionWeights.system_integration;
      score.totalWeight =
        technical_complexity * weights.technical_complexity +
        safety_requirement * weights.safety_requirement +
        innovation_level * weights.innovation_level +
        economic_consideration * weights.economic_consideration +
        implementability * weights.implementability;
    });

    // 双路径匹配
    const highComplexityMatch = this.path1Matching(analysis, expertScores);
    const safetyFocusedMatch = this.path2Matching(analysis, expertScores);

    return {
      primary: this.selectBestExperts(highComplexityMatch, 3),
      alternative: this.selectBestExperts(safetyFocusedMatch, 3),
      allScores: expertScores,
      reasoning: this.generateReasoning(analysis, highComplexityMatch, safetyFocusedMatch),
      expertCount: this.suggestExpertCount(analysis)
    };
  }

  calculateMatchScore(expert, analysis) {
    const expertData = this.expertData.find(e => e.id === expert.id);
    const abilities = expertData.capabilities;
    const field = expertData.field;

    const weights = this.dimensionWeights[field] || this.dimensionWeights.system_integration;

    let score = 0;

    // 维度匹配计算
    score += analysis.technical_complexity * weights.technical_complexity * (abilities.theoretical_innovation / 10);
    score += analysis.safety_requirement * weights.safety_requirement * (abilities.system_evaluation / 10);
    score += analysis.innovation_level * weights.innovation_level * (abilities.theoretical_innovation / 10);
    score += analysis.economic_consideration * weights.economic_consideration * (abilities.economic_analysis / 10);
    score += analysis.implementability * weights.implementability * (abilities.engineering_implementation / 10);

    // 领域匹配加分
    if (analysis.problem_category === this.mapFieldToCategory(field)) {
      score += 20; // 领域匹配加20分
    }

    return Math.min(100, Math.round(score));
  }

  checkScenarioMatch(expert, analysis) {
    const { innovation_level, technical_complexity, safety_requirement } = analysis;
    const applicable = [];

    if (expert.optimal_scenarios) {
      expert.optimal_scenarios.forEach(scenario => {
        if (this.checkScenarioRequirement(scenario, innovation_level, technical_complexity, safety_requirement)) {
          applicable.push(scenario);
        }
      });
    }

    return applicable;
  }

  checkScenarioRequirement(scenario, innovation, complexity, safety) {
    // 创新需求检查
    if (innovation >= this.thresholds.innovation_high && scenario.includes('创新')) {
      return true;
    }
    if (innovation >= this.thresholds.innovation_medium && scenario.includes('理论')) {
      return true;
    }

    // 严谨性要求检查
    if (complexity >= this.thresholds.complexity_medium && scenario.includes('严谨')) {
      return true;
    }

    // 实践导向检查
    if (complexity >= this.thresholds.practicality_medium && scenario.includes('实践')) {
      return true;
    }

    return false;
  }

  path1Matching(analysis, expertScores) {
    // 路径1：高复杂度优先
    const threshold = this.thresholds.complexity_high;

    return expertScores.filter(item => {
      if (analysis.technical_complexity < threshold) {
        return false; // 复杂度不够高，不匹配路径1
      }

      const expert = item.expert;
      const expertCapabilities = expert.capabilities;
      const expertInnovation = expertCapabilities.theoretical_innovation;

      // 优先选择理论创新能力强的专家
      const scenarioMatch = expert.optimal_scenarios.some(s =>
        this.checkScenarioRequirement(s, analysis.innovation_level, analysis.technical_complexity, analysis.safety_requirement)
      );

      return scenarioMatch || expertInnovation >= 8.5;
    }).sort((a, b) => b.totalWeight - a.totalWeight);
  }

  path2Matching(analysis, expertScores) {
    // 路径2：安全性优先
    const threshold = this.thresholds.rigor_high;

    return expertScores.filter(item => {
      if (analysis.safety_requirement < threshold) {
        return false; // 安全要求不够高，不匹配路径2
      }

      const expert = item.expert;
      const expertCapabilities = expert.capabilities;
      const expertSystemEval = expertCapabilities.system_evaluation;

      // 优先选择系统评估能力强的专家
      const scenarioMatch = expert.optimal_scenarios.some(s =>
        s.includes('风险') || s.includes('安全') || s.includes('质量')
      );

      return scenarioMatch || expertSystemEval >= 9.0;
    }).sort((a, b) => b.totalWeight - a.totalWeight);
  }

  selectBestExperts(scores, count) {
    return scores.slice(0, count);
  }

  suggestExpertCount(analysis) {
    const { technical_complexity, innovation_level, implementability } = analysis;
    let suggestedCount = 2;

    if (technical_complexity >= 8.0) {
      suggestedCount = 3;
    }
    if (innovation_level >= 7.0) {
      suggestedCount = 3;
    }
    if (implementability >= 8.0) {
      suggestedCount = 3;
    }

    return suggestedCount;
  }

  generateReasoning(analysis, path1Match, path2Match) {
    const reasoning = [];

    // 路径1解释
    const primaryExperts = path1Match.map(s => s.expert.name).join(' + ');
    reasoning.push(`路径1（高复杂度优先）：推荐 ${primaryExperts}，因为该组合在${analysis.problem_category}问题上展现出色的综合能力和创新性。`);

    // 路径2解释
    if (path2Match.length > 0) {
      const alternativeExperts = path2Match.map(s => s.expert.name).join(' + ');
      reasoning.push(`路径2（安全性优先）：备选 ${alternativeExperts}，更注重工程实现和流程控制。`);
    }

    return reasoning.join('\n');
  }

  mapFieldToCategory(field) {
    const mapping = {
      '材料研发': 'materials_rd',
      '电堆工程': 'stack_engineering',
      '系统建模': 'system_modeling',
      '安全分析': 'safety_analysis',
      '系统集成': 'system_integration'
    };

    return mapping[field] || 'system_integration';
  }

  dimensionWeights = {
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
}

export default RecommendationService;