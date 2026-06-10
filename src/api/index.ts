import { AGENTS, getFrontendIdByMBTI } from '../data/agents';
import { AgentResult, QuestionAnalysis, DimensionWeights, WakeupPathInfo } from '../types/agent';

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const MODEL = 'deepseek-v4-pro';

// ====================================================================
// 16型MBTI × 六维度能力矩阵 (数据来源：研究报告 §7.5)
// 列: [创新洞察力, 材料设计能力, 理论建模能力, 逻辑完整性, 专业准确性, 安全分析能力]
// ====================================================================
const CAPABILITY_MATRIX: Record<string, number[]> = {
  INTJ: [91.8, 92.5, 89.5, 90.2, 89.8, 88.5],
  INTP: [92.5, 90.8, 94.2, 90.5, 88.5, 87.8],
  ENTJ: [89.2, 91.2, 90.0, 90.5, 89.8, 89.5],
  ENTP: [93.0, 89.5, 92.5, 88.5, 87.0, 86.8],
  ISTJ: [86.5, 89.8, 88.0, 93.5, 94.2, 93.8],
  ESTJ: [85.8, 90.8, 88.2, 92.5, 93.0, 92.5],
  INFJ: [89.5, 86.8, 90.5, 89.0, 88.5, 90.2],
  ENFJ: [88.2, 85.2, 88.2, 88.5, 87.8, 89.5],
  ISTP: [87.0, 87.5, 88.2, 89.5, 89.8, 88.8],
  ENFP: [91.0, 85.5, 89.8, 87.0, 86.2, 87.8],
  ESFJ: [85.0, 86.5, 87.5, 87.8, 88.5, 88.5],
  ISFJ: [85.5, 86.2, 87.0, 88.0, 88.8, 88.8],
  ESTP: [87.5, 87.0, 87.2, 88.5, 89.0, 87.5],
  INFP: [90.5, 85.0, 88.5, 86.5, 85.8, 87.2],
  ISFP: [88.5, 85.0, 86.8, 86.8, 86.5, 87.0],
  ESFP: [87.8, 85.5, 86.5, 86.2, 85.8, 86.8],
};

const DIMENSION_POOLS: Record<string, string[]> = {
  materials:    ['INTJ', 'ENTJ', 'INTP', 'ENTP'],
  engineering:  ['ISTJ', 'ESTJ', 'ENTJ', 'INTJ'],
  modeling:     ['INTP', 'ENTP', 'INTJ', 'INFJ'],
  safety:       ['ISTJ', 'ESTJ', 'INTJ', 'INFJ'],
  integration:  ['ENTJ', 'ISTJ', 'INTJ', 'ESTJ'],
};

function mapToCapabilityWeights(w: number[]): number[] {
  return [
    w[0] * 0.6 + w[2] * 0.4,
    w[0] * 0.8 + w[1] * 0.2,
    w[2] * 0.6 + w[1] * 0.3 + w[4] * 0.1,
    w[3] * 0.5 + w[4] * 0.5,
    w[1] * 0.5 + w[3] * 0.5,
    w[3] * 0.9 + w[0] * 0.1,
  ];
}

const DIMENSION_THRESHOLD = 0.20;
const MAX_AGENTS = 6;

function executeWakeupDecision(
  dimensionWeights: DimensionWeights,
): { agentIds: string[]; wakeupPaths: Record<string, WakeupPathInfo>; reasoning: string } {
  const w = [
    dimensionWeights.materials / 100,
    dimensionWeights.engineering / 100,
    dimensionWeights.modeling / 100,
    dimensionWeights.safety / 100,
    dimensionWeights.integration / 100,
  ];
  const wCapRaw = mapToCapabilityWeights(w);

  // 归一化：使 Σ wCapNorm = 1.0，匹配度回归 85-95 真实区间
  const wCapSum = wCapRaw.reduce((a, b) => a + b, 0);
  const wCap = wCapRaw.map((v) => v / wCapSum);

  // 计算所有16型匹配度（归一化后为加权平均分，区间 85-95）
  const matchScores: { mbti: string; score: number }[] = [];
  for (const [mbti, caps] of Object.entries(CAPABILITY_MATRIX)) {
    let score = 0;
    for (let j = 0; j < 6; j++) score += wCap[j] * caps[j];
    matchScores.push({ mbti, score: Math.round(score * 10) / 10 });
  }
  matchScores.sort((a, b) => b.score - a.score);

  // 固定阈值：θ = 100（论文原始设定）
  // 归一化后匹配度在 85-95 区间，路径A通常为 0 人，路径B承担主要唤醒职责
  const MATCH_THRESHOLD = 100;

  console.log('[Wakeup] === 维度权重 ===');
  console.log(`  材料:${dimensionWeights.materials}% 电堆:${dimensionWeights.engineering}% 建模:${dimensionWeights.modeling}% 安全:${dimensionWeights.safety}% 集成:${dimensionWeights.integration}%`);
  console.log(`[Wakeup] 六能力需求度归一化后 (sum=${wCapSum.toFixed(3)})`);
  const capLabels = ['创新洞察力','材料设计','理论建模','逻辑完整性','专业准确性','安全分析'];
  wCap.forEach((v,i) => console.log(`  ${capLabels[i]}: ${(v*100).toFixed(1)}%`));
  console.log('[Wakeup] === Top-10 匹配度 ===');
  matchScores.slice(0,10).forEach((m,i) => console.log(`  ${i+1}. ${m.mbti}: ${m.score} ${m.score >= MATCH_THRESHOLD ? '✓ 路径A' : ''}`));
  console.log(`[Wakeup] 路径A阈值=${MATCH_THRESHOLD}(固定), 路径B阈值=${DIMENSION_THRESHOLD*100}%`);

  const wakeupPaths: Record<string, WakeupPathInfo> = {};
  const activated = new Set<string>();
  const dimNames: Record<string, string> = {
    materials: '材料研发', engineering: '电堆工程', modeling: '系统建模',
    safety: '安全分析', integration: '系统集成',
  };

  // Path A
  for (const { mbti, score } of matchScores) {
    if (score < MATCH_THRESHOLD) break;
    if (activated.size >= MAX_AGENTS) break;
    const agentId = getFrontendIdByMBTI(mbti);
    if (!agentId) continue;
    activated.add(agentId);
    wakeupPaths[agentId] = { mbti, path: 'A', matchScore: score };
    console.log(`[Wakeup] 路径A激活: ${mbti} (M=${score})`);
  }

  // Path B
  const dimKeys: (keyof DimensionWeights)[] = ['materials','engineering','modeling','safety','integration'];
  const dimIdxMap: Record<string, number> = {
    materials: 0, engineering: 1, modeling: 2, safety: 3, integration: 4,
  };
  const dimResults: { dimKey: string; weight: number; count: number }[] = [];
  for (const dimKey of dimKeys) {
    const weight = w[dimIdxMap[dimKey]];
    if (weight < DIMENSION_THRESHOLD) {
      console.log(`[Wakeup] 路径B跳过 ${dimNames[dimKey]}: ${(weight*100).toFixed(0)}% < 20%`);
      continue;
    }
    let count = 0;
    if (weight >= 0.50) count = 3;
    else if (weight >= 0.30) count = 2;
    else count = 1;
    console.log(`[Wakeup] 路径B触发 ${dimNames[dimKey]}: ${(weight*100).toFixed(0)}% → 激活${count}人`);
    dimResults.push({ dimKey, weight, count });
  }
  dimResults.sort((a, b) => b.weight - a.weight);

  for (const { dimKey, count } of dimResults) {
    if (activated.size >= MAX_AGENTS) break;
    const pool = DIMENSION_POOLS[dimKey];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      if (activated.size >= MAX_AGENTS) break;
      const mbti = pool[i];
      const agentId = getFrontendIdByMBTI(mbti);
      if (!agentId || activated.has(agentId)) {
        if (agentId && activated.has(agentId)) console.log(`[Wakeup] 路径B跳过 ${mbti}: 已被路径A激活`);
        continue;
      }
      activated.add(agentId);
      const score = matchScores.find((m) => m.mbti === mbti)?.score || 0;
      wakeupPaths[agentId] = { mbti, path: 'B', matchScore: score, triggerDimension: dimNames[dimKey] };
      console.log(`[Wakeup] 路径B激活: ${mbti} (维度=${dimNames[dimKey]}, M=${score})`);
    }
  }

  console.log(`[Wakeup] === 结果: ${activated.size}位专家 ===`);

  // 生成推理解释
  const agentIds = Array.from(activated);
  const pathACount = agentIds.filter((id) => wakeupPaths[id]?.path === 'A').length;
  const pathBCount = agentIds.filter((id) => wakeupPaths[id]?.path === 'B').length;

  let reasoning = `## 五维度权重分析\n\n`;
  reasoning += `| 维度 | 权重 | 阈值状态 |\n|:-----|:----:|:--------:|\n`;
  for (const dimKey of dimKeys) {
    const pct = (w[dimIdxMap[dimKey]] * 100).toFixed(0);
    const over = w[dimIdxMap[dimKey]] >= DIMENSION_THRESHOLD;
    reasoning += `| ${dimNames[dimKey]} | **${pct}%** | ${over ? '≥20% 触发路径B' : '未达阈值'} |\n`;
  }
  reasoning += `\n## 双路径唤醒决策\n\n`;
  reasoning += `- **路径A（匹配度≥100）**：激活 ${pathACount} 位\n`;
  reasoning += `- **路径B（维度权重≥20%）**：激活 ${pathBCount} 位\n`;
  reasoning += `- **合计唤醒**：${agentIds.length} 位 (上限 ${MAX_AGENTS})\n\n`;
  reasoning += `| MBTI | 匹配度 | 路径 | 触发条件 |\n|:-----|:------:|:----:|:--------:|\n`;
  for (const id of agentIds) {
    const info = wakeupPaths[id];
    const trigger = info.path === 'A' ? `M=${info.matchScore}≥100` : `维度≥20% (${info.triggerDimension})`;
    reasoning += `| **${info.mbti}** | ${info.matchScore} | 路径${info.path} | ${trigger} |\n`;
  }

  return { agentIds, wakeupPaths, reasoning };
}

// ====================================================================
// DeepSeek 非流式请求
// ====================================================================
async function deepseekChat(
  messages: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
  jsonMode = false,
  maxTokens = 2048,
): Promise<{ content: string; reasoning?: string }> {
  const body: Record<string, any> = {
    model: MODEL, messages, temperature: 0.3, max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`DeepSeek API error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  return { content: msg?.content || '', reasoning: msg?.reasoning_content || undefined };
}

// ====================================================================
// DeepSeek 流式请求 — 捕获 reasoning_content 和 content
// ====================================================================
type StreamChunk = { type: 'reasoning'; content: string } | { type: 'answer'; content: string };

async function* deepseekStreamChat(
  messages: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 8192, stream: true }),
    signal,
  });
  if (!res.ok) throw new Error(`DeepSeek stream error ${res.status}: ${await res.text().catch(() => '')}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.reasoning_content) {
            yield { type: 'reasoning', content: delta.reasoning_content };
          } else if (delta?.content) {
            yield { type: 'answer', content: delta.content };
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ====================================================================
// API 对象
// ====================================================================
export const api = {
  /**
   * 问题分析 & 按需唤醒 (JSON mode)
   */
  async analyzeQuestion(question: string, signal?: AbortSignal): Promise<QuestionAnalysis> {
    const systemPrompt = `你是一个储能领域的问题特征分析器。请分析用户问题在以下五个维度的权重百分比。

## 维度定义
1. materials(材料研发): 涉及材料成分设计、结构优化、性能调控
2. engineering(电堆工程): 涉及电堆结构、工艺流程、制造装配
3. modeling(系统建模): 需要数学建模、仿真计算、参数辨识
4. safety(安全分析): 涉及风险评估、安全阈值、故障诊断
5. integration(系统集成): 涉及统筹规划、经济性评估、接口集成

## 规则
- 五个权重之和必须为100
- 仔细分析问题核心关注点，权重应有明显差异
- 如果问题明确属于某个维度，该维度应获得最高权重`;

    try {
      const content = await deepseekChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `分析以下储能问题的五维度权重，输出JSON:\n\n${question}` },
      ], signal, true);

      console.log('[analyzeQuestion] DeepSeek raw:', content.content);
      const jsonMatch = content.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const parsed = JSON.parse(jsonMatch[0]);
      const dimensionWeights: DimensionWeights = {
        materials: Number(parsed.materials) || 0,
        engineering: Number(parsed.engineering) || 0,
        modeling: Number(parsed.modeling) || 0,
        safety: Number(parsed.safety) || 0,
        integration: Number(parsed.integration) || 0,
      };

      // 归一化
      const total = Object.values(dimensionWeights).reduce((a, b) => a + b, 0);
      if (total > 0 && Math.abs(total - 100) > 2) {
        for (const key of Object.keys(dimensionWeights) as (keyof DimensionWeights)[]) {
          dimensionWeights[key] = Math.round((dimensionWeights[key] / total) * 100);
        }
        const diff = 100 - Object.values(dimensionWeights).reduce((a, b) => a + b, 0);
        if (diff !== 0) dimensionWeights.materials += diff;
      }
      if (total === 0) {
        dimensionWeights.materials = 25; dimensionWeights.engineering = 25;
        dimensionWeights.modeling = 20; dimensionWeights.safety = 15; dimensionWeights.integration = 15;
      }

      console.log('[analyzeQuestion] 归一化权重:', dimensionWeights);

      const { agentIds, wakeupPaths, reasoning } = executeWakeupDecision(dimensionWeights);
      return { recommendedAgents: agentIds, analysis: reasoning, dimensionWeights, wakeupPaths };
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      console.error('[analyzeQuestion] 回退:', error);
      const dw: DimensionWeights = { materials: 30, engineering: 25, modeling: 20, safety: 15, integration: 10 };
      const { agentIds, wakeupPaths, reasoning } = executeWakeupDecision(dw);
      return { recommendedAgents: agentIds, analysis: '[回退模式]\n\n' + reasoning, dimensionWeights: dw, wakeupPaths };
    }
  },

  /**
   * 流式专家响应 — 捕获 reasoning 和 answer
   */
  streamAgentResponse(frontendAgentId: string, question: string, signal?: AbortSignal) {
    const agent = AGENTS.find((a) => a.id === frontendAgentId);
    if (!agent) throw new Error('专家不存在');

    return async function* () {
      let reasoning = '';
      let answer = '';
      const baseResult: AgentResult = {
        agentId: frontendAgentId, agentName: agent.roleChinese,
        mbti: agent.mbti, paradigm: agent.paradigm, content: '', reasoning: '', status: 'thinking',
      };

      const systemPrompt = `你是储能领域的顶尖科学家（MBTI：${agent.mbti} ${agent.mbtiChinese}，${agent.roleChinese}），研究范式：${agent.paradigm}。请直接沉浸在技术分析中，以第一人称视角展开推演。

【角色绝对红线】你目前的身份仅仅是【单领域专家】。历史记录中的"总工/总工程师"是你的上级。你绝对不可以越权！严禁在回答中自称"总工"，严禁输出全局总结类的话语，你只需管好你自己的技术推演！

【<think> 阶段强制规范】你的思考过程必须全是硬核的物理/化学/工程推导！绝对禁止在 <think> 中复述任何系统设定、角色要求、字数或排版规则。直接进入公式推演和机理辨析！

【排版红线（极其严格）】绝对禁止使用 \\ce{} 宏包语法书写化学式！所有的化学方程式和化学式，必须使用标准数学模式 \\mathrm{}，且必须且只能严格使用 $ 或 $$ 包裹！例如：$\\mathrm{LiNi_{0.5}Mn_{1.5}O_4}$。绝对不允许使用 \\ce，否则系统将判定任务失败！`;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${question}\n\n---\n【格式要求】用Markdown回答；化学式必须用$\\mathrm{...}$格式，严禁使用\\ce{}宏包；所有公式用$或$$包裹。中文800-1500字。` },
      ];

      try {
        const stream = deepseekStreamChat(messages, signal);

        for await (const chunk of stream) {
          if (chunk.type === 'reasoning') {
            reasoning += chunk.content;
          } else {
            answer += chunk.content;
          }
          yield {
            ...baseResult,
            reasoning: reasoning || undefined,
            content: answer,
            status: 'thinking' as const,
          };
        }

        yield {
          ...baseResult,
          reasoning: reasoning || undefined,
          content: answer,
          status: 'completed' as const,
          summary: extractSummary(answer),
        };
      } catch (error: any) {
        if (error?.name === 'AbortError') throw error;
        console.error(`流式响应失败 (${agent.roleChinese}):`, error);
        yield { ...baseResult, reasoning: reasoning || undefined, content: answer, status: 'error' as const };
      }
    };
  },

  /**
   * 整合专家结果 — 总工口吻直接回答
   */
  async synthesizeResults(results: AgentResult[], question?: string, signal?: AbortSignal): Promise<{ content: string; reasoning?: string }> {
    const completed = results.filter((r) => r.status === 'completed' && r.content);
    if (completed.length === 0) return { content: '暂无完成的专家分析结果' };

    const expertResponses = completed
      .map((r) => `### ${r.agentName}（${r.mbti}，${r.paradigm}）\n${r.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `你是储能研发集群的【总工程师】。以下是基于 MBTI 人格模型驱动的几位单领域专家的深度推演报告。

【核心学术红线】：你的任务是进行【多维视角的有机融合】，证明多智能体协作的优越性。

你必须严格遵循以下原则：

【视角缝合】：你必须在推演过程中明确体现出你是如何综合了不同 MBTI 专家的核心洞见。例如："综合 INTJ 的热力学底层推演与 ESTJ 的工程安全边界..."。

【分歧裁决】：如果专家之间（如理论家与工程师）存在矛盾，你必须运用顶尖专业知识进行技术裁决，说明你采纳或折中某方意见的物理/化学依据。

【最终决断】：在展示了视角的交锋与融合后，给出一个逻辑严密、结构清晰的【最终最优解答】。你的回答既要有统筹全局的大局观，又要作为多智能体协作的完美证明，展现出"1+1>2"的高维涌现能力！`;

    try {
      const result = await deepseekChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `**用户问题**：${question || '储能技术问题'}\n\n以下是本集群 ${completed.length} 位专家的详细技术分析，请仔细阅读每一位专家的推演逻辑与结论：\n\n${expertResponses}\n\n请基于上述专家分析，直接给出最终技术方案。必须引用专家的具体推演内容，拒绝空洞的官话套话。化学式必须用$\\mathrm{...}$格式，严禁\\ce{}宏包。所有公式用$或$$包裹。` },
      ], signal, false, 8192);
      return { content: result.content || generateFallbackSynthesis(completed, question), reasoning: result.reasoning };
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      console.error('整合失败:', error);
      return { content: generateFallbackSynthesis(completed, question) };
    }
  },
};

function extractSummary(content: string): string {
  return content.split('\n').filter(l => l.trim() && (l.includes('##') || (l.includes('**') && l.length < 100))).slice(0, 4).join('\n');
}

function generateFallbackSynthesis(results: AgentResult[], question?: string): string {
  const expertTexts = results
    .filter(r => r.content)
    .map(r => `### ${r.agentName}（${r.mbti}）\n\n${r.content}`)
    .join('\n\n---\n\n');
  if (!expertTexts) return '本轮未能产出有效分析，请重试。';
  return `*注意：API 整合调用失败（网络或超时异常），以下为专家原始意见的直接汇编。*\n\n## 专家意见汇编\n\n> 问题：${question || '储能技术问题'}\n\n${expertTexts}`;
}
