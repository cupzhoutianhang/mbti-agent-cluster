export const MBTI_AGENTS = [
  {
    id: 'INTJ-C',
    name: 'INTJ-协调员',
    mbtiType: 'INTJ',
    role: 'coordinator',
    color: '#10b981',
    avatar: '🎯',
    status: 'active',
    capabilities: ['任务协调', '进度跟踪', '资源分配']
  },
  {
    id: 'INTJ',
    name: 'INTJ-架构师',
    mbtiType: 'INTJ',
    role: 'architect',
    color: '#3b82f6',
    avatar: '🏗️',
    status: 'thinking',
    capabilities: ['架构设计', '系统规划', '技术创新']
  },
  {
    id: 'ISTJ',
    name: 'ISTJ-工程师',
    mbtiType: 'ISTJ',
    role: 'engineer',
    color: '#f59e0b',
    avatar: '⚙️',
    status: 'working',
    capabilities: ['工程技术', '制造工艺', '质量控质']
  },
  {
    id: 'ENTJ',
    name: 'ENTJ-项目经理',
    mbtiType: 'ENTJ',
    role: 'manager',
    color: '#ef4444',
    avatar: '📊',
    status: 'working',
    capabilities: ['项目管理', '决策统筹', '资源调配']
  }
]

export const CLUSTERS = [
  {
    id: 1,
    name: '储能系统设计群',
    status: 'active',
    memberCount: 4,
    todayTasks: 12,
    collaborationTime: '10分32秒',
    consensusRate: 85,
    members: ['INTJ-C', 'INTJ', 'ISTJ', 'ENTJ']
  },
  {
    id: 2,
    name: '电池材料研发群',
    status: 'paused',
    memberCount: 4,
    todayTasks: 5,
    collaborationTime: '8分15秒',
    consensusRate: 78,
    members: ['INTJ-C', 'INTJ', 'INTP', 'ISTJ']
  }
]

export const TEMPLATES = [
  {
    id: 't1',
    name: '黄金三角',
    emoji: '🥇',
    members: ['INTJ', 'ISTJ', 'ENTJ'],
    rating: 4.9,
    description: '系统设计、工程实现、项目管理'
  },
  {
    id: 't2',
    name: '材料研发',
    emoji: '🥈',
    members: ['INTJ', 'INTP', 'ISTJ'],
    rating: 4.7,
    description: '材料设计、理论创新、工程实现'
  }
]
