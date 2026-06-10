export interface Agent {
  id: string;
  image: string;
  mbti: string;
  mbtiChinese: string;
  roleEnglish: string;
  roleChinese: string;
  paradigm: string;
  mbtiId: string; // 后端API格式ID
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  mbti: string;
  paradigm: string;
  content: string;
  reasoning?: string;
  status: 'thinking' | 'completed' | 'error';
  summary?: string;
}

export interface AnalysisResult {
  question: string;
  timestamp: string;
  agents: AgentResult[];
  synthesis?: string;
  synthesisReasoning?: string;
  dispatchReasoning?: string;
  dimensionWeights?: DimensionWeights;
  wakeupPaths?: Record<string, WakeupPathInfo>;
}

export interface DimensionWeights {
  materials: number;        // w₁ 材料研发
  engineering: number;      // w₂ 电堆工程
  modeling: number;         // w₃ 系统建模
  safety: number;           // w₄ 安全分析
  integration: number;      // w₅ 系统集成
}

export interface WakeupPathInfo {
  mbti: string;
  path: 'A' | 'B';
  matchScore: number;
  triggerDimension?: string;
}

export interface QuestionAnalysis {
  recommendedAgents: string[];
  analysis: string;
  dimensionWeights: DimensionWeights;
  wakeupPaths: Record<string, WakeupPathInfo>;
}

export type WorkflowStep = 'idle' | 'analyzing' | 'waking' | 'collaborating' | 'synthesizing' | 'completed';