class DataLoader {
  constructor() {
    this.cachedData = {
      experts: null,
      lastLoad: null
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  async loadExperts() {
    // 检查缓存
    if (this.cachedData.experts &&
        this.cachedData.lastLoad &&
        Date.now() - this.cachedData.lastLoad < this.cacheTimeout) {
      return this.cachedData.experts;
    }

    try {
      const response = await fetch('/data/experts-complete-16.json');
      if (!response.ok) {
        throw new Error(`Failed to load experts data: ${response.statusText}`);
      }

      const data = await response.json();
      const experts = data.agents;

      // 缓存数据
      this.cachedData.experts = experts;
      this.cachedData.lastLoad = Date.now();

      return experts;
    } catch (error) {
      console.error('加载专家数据失败:', error);
      throw error;
    }
  }

  async getExpertById(expertId) {
    const experts = await this.loadExperts();
    return experts.find(expert => expert.id === expertId);
  }

  async getExpertsByMBTIType(mbtiType) {
    const experts = await this.loadExperts();
    return experts.filter(expert => expert.mbti_type === mbtiType);
  }

  async getExpertsByField(field) {
    const experts = await this.loadExperts();
    return experts.filter(expert => expert.field === field);
  }

  async searchExperts(query) {
    const experts = await this.loadExperts();
    const lowerQuery = query.toLowerCase();

    return experts.filter(expert =>
      expert.name.toLowerCase().includes(lowerQuery) ||
      expert.role.toLowerCase().includes(lowerQuery) ||
      expert.mbti_type.toLowerCase().includes(lowerQuery) ||
      expert.field.toLowerCase().includes(lowerQuery) ||
      expert.optimal_scenarios.some(scenario =>
        scenario.toLowerCase().includes(lowerQuery)
      )
    );
  }

  async getActiveExperts() {
    const experts = await this.loadExperts();
    return experts.filter(expert => expert.status === 'active');
  }

  async updateExpertStatus(expertId, status) {
    try {
      const response = await fetch(`/api/experts/${expertId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // 清除缓存以强制重新加载
        this.clearCache();
        return await response.json();
      } else {
        throw new Error(`Failed to update expert status: ${response.statusText}`);
      }
    } catch (error) {
      console.error('更新专家状态失败:', error);
      throw error;
    }
  }

  clearCache() {
    this.cachedData.experts = null;
    this.cachedData.lastLoad = null;
  }

  async getExpertStats() {
    const experts = await this.loadExperts();

    const stats = {
      total: experts.length,
      active: experts.filter(e => e.status === 'active').length,
      inactive: experts.filter(e => e.status === 'inactive').length,
      byField: {},
      byMBTI: {}
    };

    // 按领域统计
    experts.forEach(expert => {
      stats.byField[expert.field] = (stats.byField[expert.field] || 0) + 1;
      stats.byMBTI[expert.mbti_type] = (stats.byMBTI[expert.mbti_type] || 0) + 1;
    });

    return stats;
  }

  async getExpertCollaborationData(expertIds) {
    const experts = await this.loadExperts();
    const selectedExperts = expertIds.map(id => experts.find(e => e.id === id)).filter(Boolean);

    return {
      experts: selectedExperts,
      totalCapabilities: selectedExperts.reduce((sum, expert) => {
        const capabilities = expert.capabilities;
        return sum + Object.values(capabilities).reduce((a, b) => a + b, 0);
      }, 0),
      averageCapabilities: this.calculateAverageCapabilities(selectedExperts),
      fieldCoverage: this.calculateFieldCoverage(selectedExperts)
    };
  }

  calculateAverageCapabilities(experts) {
    const capabilitySums = {};
    const count = experts.length;

    experts.forEach(expert => {
      Object.entries(expert.capabilities).forEach(([key, value]) => {
        capabilitySums[key] = (capabilitySums[key] || 0) + value;
      });
    });

    const averages = {};
    Object.entries(capabilitySums).forEach(([key, sum]) => {
      averages[key] = Math.round((sum / count) * 100) / 100;
    });

    return averages;
  }

  calculateFieldCoverage(experts) {
    const fields = new Set();
    experts.forEach(expert => fields.add(expert.field));

    return {
      fields: Array.from(fields),
      coverageCount: fields.size,
      totalFields: ['材料研发', '电堆工程', '系统建模', '安全分析', '系统集成'].length,
      percentage: Math.round((fields.size / 5) * 100)
    };
  }
}

export default new DataLoader();