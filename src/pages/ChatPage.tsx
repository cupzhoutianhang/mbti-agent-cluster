import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '../api';
import { AgentResult, AnalysisResult, WorkflowStep, DimensionWeights } from '../types/agent';
import { AGENTS } from '../data/agents';
import WorkflowTimeline from '../components/WorkflowTimeline';

export interface ConversationHistory {
  id: string;
  question: string;
  entries: AnalysisResult[];    // 完整的多轮对话数组
  timestamp: string;
}

interface ChatPageProps {
  selectedHistory: ConversationHistory | null;
  activeHistoryId: string | null;
  onHistoryUpdate: (item: ConversationHistory) => void;
  onNewConversation: () => void;
  onSetActiveHistoryId: (id: string) => void;
}

// ===== 文本清洗管道 =====

// 1. 剥离大模型可能包裹的 code block 外衣
function stripCodeWrapper(text: string): string {
  const trimmed = text.trim();
  const fullWrap = /^```(?:json|markdown|md)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const match = trimmed.match(fullWrap);
  if (match) return match[1];
  const partialOpen = /^```(?:json|markdown|md)?\s*\n/i;
  if (partialOpen.test(trimmed)) {
    return trimmed.replace(partialOpen, '').replace(/\n```\s*$/i, '');
  }
  return text;
}

// 2. 将 DeepSeek 输出的 \(...\) 和 \[...\] 转为 KaTeX 兼容的 $...$ 和 $$...$$
function fixLatexDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
}

// 3. 产品级思维链清洗：过滤掉模型复述系统规则的"念经"段落
function cleanReasoning(text: string): string {
  if (!text) return text;
  const paragraphs = text.split('\n');
  const cleaned = paragraphs.filter(p => {
    const lower = p.toLowerCase();
    if (lower.includes('字数') || lower.includes('markdown') ||
        lower.includes('数学公式') || lower.includes('包裹') ||
        lower.includes('第一人称') || lower.includes('我们被要求') ||
        lower.includes('角色设定') || lower.includes('格式要求') ||
        lower.includes('扮演')) {
      return false;
    }
    return true;
  });
  return cleaned.join('\n').trim() || ' ';
}

// 4. 完整清洗管道（防空值）
function cleanContent(text: string): string {
  if (!text) return '';
  return fixLatexDelimiters(stripCodeWrapper(text));
}

function getProgressLabel(pct: number): string {
  if (pct <= 0) return '检索知识库';
  if (pct < 30) return '检索知识库';
  if (pct < 60) return '初步分析中';
  if (pct < 90) return '深度推演中';
  if (pct < 100) return '整理结论中';
  return '分析完成';
}

const DIM_LABELS: Record<keyof DimensionWeights, string> = {
  materials: '材料研发', engineering: '电堆工程',
  modeling: '系统建模', safety: '安全分析', integration: '系统集成',
};

const mdPlugins = { remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [rehypeKatex] };

export default function ChatPage({
  selectedHistory, activeHistoryId, onHistoryUpdate, onNewConversation, onSetActiveHistoryId,
}: ChatPageProps) {

  // 根治闭包陷阱：用 ref 保持 activeHistoryId 实时同步
  const activeIdRef = useRef(activeHistoryId);
  useEffect(() => { activeIdRef.current = activeHistoryId; }, [activeHistoryId]);
  const [inputValue, setInputValue] = useState('');
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [conversationEntries, setConversationEntries] = useState<AnalysisResult[]>([]);
  const [activeEntryIdx, setActiveEntryIdx] = useState(-1);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentResult | null>(null);
  const [agentProgress, setAgentProgress] = useState<Record<string, number>>({});

  const [mode, setMode] = useState<'collaborative' | 'single'>('collaborative');
  const [selectedMbti, setSelectedMbti] = useState(AGENTS[0]?.id || '');
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(true);
  const [showMbtiDropdown, setShowMbtiDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);

  // 内部对话更新标记——防止 external history 变更清空当前对话
  const internalUpdateRef = useRef(false);
  // entries 实时快照——供 onHistoryUpdate 读取最新完整数组
  const entriesRef = useRef(conversationEntries);
  useEffect(() => { entriesRef.current = conversationEntries; }, [conversationEntries]);

  // 加载历史（仅在用户点击侧边栏历史项或新建对话时触发；内部对话更新时跳过）
  useEffect(() => {
    if (internalUpdateRef.current) {
      internalUpdateRef.current = false;
      return; // 内部对话更新，完全跳过，保护 conversationEntries 不被覆盖
    }
    if (selectedHistory) {
      // 向下兼容：旧版历史只有 analysis 字段，没有 entries 数组
      const loaded = (selectedHistory as any).entries
        || ((selectedHistory as any).analysis ? [(selectedHistory as any).analysis] : []);
      setConversationEntries(loaded);
      setActiveEntryIdx(0);
      setWorkflowStep('completed');
    } else {
      setConversationEntries([]);
      setActiveEntryIdx(-1);
      setWorkflowStep('idle');
    }
  }, [activeHistoryId, selectedHistory]);

  // 智能滚动
  const isNearBottom = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const handler = () => { userScrolledUpRef.current = !isNearBottom(); };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [isNearBottom]);

  useEffect(() => {
    if (!userScrolledUpRef.current) scrollToBottom();
  }, [conversationEntries, workflowStep, scrollToBottom]);

  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  }, [inputValue]);

  // 更新某个 entry
  const updateEntry = useCallback((idx: number, updater: (e: AnalysisResult) => AnalysisResult) => {
    setConversationEntries((prev) => prev.map((e, i) => i === idx ? updater(e) : e));
  }, []);

  // 自然对话流上下文：仅传递关键结论，避免 XML 标签引发推理模型抗拒
  const buildContextStr = useCallback((): string => {
    const prev = conversationEntries.slice(0, -1);
    if (prev.length === 0) return '';
    return prev.map((e, i) => {
      const summary = e.synthesis ? e.synthesis.slice(0, 500) : '';
      return summary ? `[前情提要 第${i + 1}轮]：在之前的对话中，我们已得出以下关键结论：${summary}` : '';
    }).filter(Boolean).join('\n\n');
  }, [conversationEntries]);

  const buildFullQuestion = useCallback((question: string): string => {
    const ctx = buildContextStr();
    if (!ctx) return question;
    return `${ctx}\n\n请在此基础上继续深入解答当前问题。\n\n【当前问题】${question}`;
  }, [buildContextStr]);

  // ===== 发送 =====
  const handleSend = useCallback(async () => {
    const question = inputValue.trim();
    if (!question || (workflowStep !== 'idle' && workflowStep !== 'completed')) return;

    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;
    setInputValue('');
    userScrolledUpRef.current = false;
    internalUpdateRef.current = true;

    // 必须优先使用传入的 activeHistoryId，绝不能擅自 Date.now()
    const currentConversationId = activeIdRef.current || Date.now().toString();
    if (!activeIdRef.current) {
      onSetActiveHistoryId(currentConversationId);
    }

    const newIdx = conversationEntries.length;
    setActiveEntryIdx(newIdx);

    if (mode === 'single') {
      setWorkflowStep('collaborating');
      const agent = AGENTS.find((a) => a.id === selectedMbti);
      if (!agent) return;

      const init: AgentResult = { agentId: agent.id, agentName: agent.roleChinese, mbti: agent.mbti, paradigm: agent.paradigm, content: '', status: 'thinking' };
      const entry: AnalysisResult = { question, timestamp: new Date().toISOString(), agents: [init], dispatchReasoning: `指定专家: ${agent.mbti} - ${agent.roleChinese}` };
      setConversationEntries((prev) => [...prev, entry]);

      // 专属 AbortController + 看门狗（指定角色模式）
      const agentAc = new AbortController();
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const globalAbortHandler = () => agentAc.abort();
      ac.signal.addEventListener('abort', globalAbortHandler);
      const resetWatchdog = () => {
        if (watchdog) clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          console.warn(`[Watchdog] ${agent.roleChinese}(${agent.mbti}) 网络流静默卡死，强制切断！`);
          agentAc.abort();
        }, 30000);
      };

      let last: AgentResult | null = null;
      try {
        resetWatchdog();
        for await (const r of api.streamAgentResponse(agent.id, buildFullQuestion(question), agentAc.signal)()) {
          resetWatchdog();
          last = r as AgentResult;
          const pct = Math.min(Math.round(((last.content || '').length / 800) * 100), last.status === 'completed' ? 100 : 95);
          setAgentProgress((p) => ({ ...p, [agent.id]: pct }));
          updateEntry(newIdx, (e) => ({ ...e, agents: [{ ...last! }] }));
        }
      } catch (e: any) {
        console.warn(`专家 ${agent.roleChinese} 终止/异常:`, e?.name || e);
      } finally {
        if (watchdog) clearTimeout(watchdog);
        ac.signal.removeEventListener('abort', globalAbortHandler);
        updateEntry(newIdx, (e) => ({
          ...e,
          agents: e.agents.map((a) =>
            a.agentId === agent.id ? { ...a, status: 'completed' as const } : a
          ),
        }));
        setAgentProgress((p) => ({ ...p, [agent.id]: 100 }));
      }
      if (ac.signal.aborted) return;
      if (last && !last.content) last = null;
      setWorkflowStep('completed');
      const fin: AnalysisResult = { ...entry, agents: last ? [last] : [{ ...init, status: 'error' as const }] };
      updateEntry(newIdx, () => fin);
      onHistoryUpdate({ id: currentConversationId, question, entries: entriesRef.current, timestamp: new Date().toISOString() });
      return;
    }

    // 按需协作
    setWorkflowStep('analyzing');
    try {
      const analysis = await api.analyzeQuestion(buildFullQuestion(question), ac.signal);
      if (ac.signal.aborted) return;

      const initialAgents: AgentResult[] = [];
      for (const agentId of analysis.recommendedAgents) {
        const a = AGENTS.find((x) => x.id === agentId);
        if (a) initialAgents.push({ agentId: a.id, agentName: a.roleChinese, mbti: a.mbti, paradigm: a.paradigm, content: '', status: 'thinking' });
      }

      const entry: AnalysisResult = {
        question, timestamp: new Date().toISOString(), agents: initialAgents,
        dispatchReasoning: stripCodeWrapper(analysis.analysis),
        dimensionWeights: analysis.dimensionWeights, wakeupPaths: analysis.wakeupPaths,
      };
      setConversationEntries((prev) => [...prev, entry]);

      setWorkflowStep('waking');
      await new Promise((r) => setTimeout(r, 1500));
      if (ac.signal.aborted) return;

      setWorkflowStep('collaborating');
      const agentPromises = initialAgents.map(async (init) => {
        // 为每个专家创建专属 AbortController，隔离全局中止
        const agentAc = new AbortController();
        let watchdog: ReturnType<typeof setTimeout> | undefined;

        // 监听全局中止信号，同步给专属控制器
        const globalAbortHandler = () => agentAc.abort();
        ac.signal.addEventListener('abort', globalAbortHandler);

        // 看门狗：30 秒无数据流入 → 判定为僵尸连接，强制 abort 打破 for await 阻塞
        const resetWatchdog = () => {
          if (watchdog) clearTimeout(watchdog);
          watchdog = setTimeout(() => {
            console.warn(`[Watchdog] ${init.agentName}(${init.mbti}) 网络流静默卡死，强制切断！`);
            agentAc.abort();
          }, 30000);
        };

        let last: AgentResult | null = null;
        try {
          resetWatchdog();
          const stream = api.streamAgentResponse(init.agentId, buildFullQuestion(question), agentAc.signal);
          for await (const r of stream()) {
            resetWatchdog();
            last = r as AgentResult;
            const chars = (last.content || '').length;
            let pct = 0;
            if (chars < 400) pct = Math.round((chars / 400) * 60);
            else if (chars < 1000) pct = 60 + Math.round(((chars - 400) / 600) * 30);
            else pct = 90 + Math.round(((chars - 1000) / 500) * 10);
            setAgentProgress((p) => ({ ...p, [init.agentId]: Math.min(pct, last!.status === 'completed' ? 100 : 95) }));
            updateEntry(newIdx, (e) => ({ ...e, agents: e.agents.map((a) => a.agentId === init.agentId ? { ...last! } : a) }));
          }
          return agentAc.signal.aborted ? null : last;
        } catch (e: any) {
          console.warn(`专家 ${init.agentName} 终止/异常:`, e?.name || e);
        } finally {
          if (watchdog) clearTimeout(watchdog);
          ac.signal.removeEventListener('abort', globalAbortHandler);
          // 生命线：无论如何，强制置为 completed，确保总工能接管
          updateEntry(newIdx, (e) => ({
            ...e,
            agents: e.agents.map((a) =>
              a.agentId === init.agentId
                ? { ...a, status: 'completed' as const, content: a.content || (a.status === 'error' ? a.content : a.content) }
                : a
            ),
          }));
          setAgentProgress((p) => ({ ...p, [init.agentId]: 100 }));
        }
        // 即使网络异常，也尽力返回已有内容
        if (last && last.content) {
          return { ...last, status: 'completed' as const };
        }
        return last;
      });
      const agentResults = await Promise.all(agentPromises);
      if (ac.signal.aborted) return;

      // 从 state 快照读取最新专家内容（Promise.all 返回值可能因 watchdog 强杀而为空）
      const latestEntry = entriesRef.current[newIdx];
      const finalAgents = latestEntry
        ? latestEntry.agents.filter((a) => a.content && a.content.trim() !== '')
        : agentResults.filter((r): r is AgentResult => r !== null);

      if (finalAgents.length === 0) {
        console.warn('[Synthesis] 警告：所有专家均无有效输出，无法进行整合！');
        const fallbackSynthesis = '本轮专家未能产出有效分析，请重试或更换问题。';
        const finalEntriesFallback = entriesRef.current.map((e, i) =>
          i === newIdx ? { ...e, synthesis: fallbackSynthesis } : e
        );
        setConversationEntries(finalEntriesFallback);
        setWorkflowStep('completed');
        onHistoryUpdate({ id: currentConversationId, question: finalEntriesFallback[0].question, entries: finalEntriesFallback, timestamp: new Date().toISOString() });
        return;
      }

      setWorkflowStep('synthesizing');

      // 强制清洗 status，确保总工 API 的 filter(r => r.status === 'completed') 不会误杀
      const cleanAgents = finalAgents.map((a) => ({ ...a, status: 'completed' as const }));

      const synthResult = await api.synthesizeResults(cleanAgents, question, ac.signal);
      if (ac.signal.aborted) return;

      const completed: AnalysisResult = {
        ...entry, agents: finalAgents,
        synthesis: cleanContent(synthResult.content),
        synthesisReasoning: synthResult.reasoning,
      };
      updateEntry(newIdx, () => completed);
      setWorkflowStep('completed');

      const finalEntries = entriesRef.current.map((e, i) =>
        i === newIdx ? completed : e
      );
      onHistoryUpdate({ id: currentConversationId, question, entries: finalEntries, timestamp: new Date().toISOString() });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('[Synthesis Crash Log]:', e);
      setWorkflowStep('idle');
    }
  }, [inputValue, workflowStep, onHistoryUpdate, mode, selectedMbti, conversationEntries.length, updateEntry]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setWorkflowStep('idle');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const isProcessing = workflowStep !== 'idle' && workflowStep !== 'completed';

  return (
    <div className="chat-container">
      <div className="messages-area custom-scrollbar" ref={messagesAreaRef}>
        {conversationEntries.length === 0 && workflowStep === 'idle' && (
          <div className="welcome-message">
            <h1 className="welcome-title">ChargeBD 储能研发交互系统</h1>
            <p className="welcome-text">输入储能领域问题，AI将自动选择最优专家团队进行并行深度思考</p>
          </div>
        )}

        {/* 工作流时间轴：仅活跃 entry 有进行中状态才显示 */}
        {workflowStep !== 'idle' && activeEntryIdx !== -1 && (
          <WorkflowTimeline step={workflowStep} />
        )}

        {/* 渲染所有对话条目 */}
        {conversationEntries.map((entry, idx) => {
          const isActive = idx === activeEntryIdx;
          const entryStep = isActive ? workflowStep : 'completed';

          return (
            <div key={`entry-${idx}`} className="current-conversation">
              {/* 用户问题 */}
              <div className="user-question fade-in">
                <span className="question-label">您</span>
                <div className="question-content">{entry.question}</div>
              </div>

              {/* 调度决策卡片 */}
              {entry.dimensionWeights && entry.wakeupPaths && (
                <div className="dispatch-card fade-in">
                  <div className="dispatch-card-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span className="dispatch-card-title">ChargeBD 调度决策</span>
                    <span className={`dispatch-card-badge ${isActive && entryStep === 'waking' ? 'active' : ''}`}>
                      {isActive && entryStep === 'waking' ? '决策中' : '已决策'}
                    </span>
                  </div>
                  <div className="dispatch-card-body">
                    <div className="dispatch-dimensions">
                      {(Object.keys(entry.dimensionWeights) as (keyof DimensionWeights)[]).map((k) => {
                        const pct = entry.dimensionWeights![k];
                        return (
                          <div key={k} className="dispatch-dim-row">
                            <span className="dispatch-dim-label">{DIM_LABELS[k]}</span>
                            <div className="dispatch-dim-bar"><div className="dispatch-dim-fill" style={{ width: `${pct}%` }} /></div>
                            <span className={`dispatch-dim-pct ${pct >= 20 ? 'over' : ''}`}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="dispatch-summary">
                      <ReactMarkdown {...mdPlugins}>{entry.dispatchReasoning || ''}</ReactMarkdown>
                    </div>
                    <div className="dispatch-agents-list">
                      {entry.agents.map((a) => {
                        const pi = entry.wakeupPaths?.[a.agentId];
                        return (
                          <span key={a.agentId} className={`dispatch-agent-tag ${pi?.path === 'A' ? 'path-a' : 'path-b'}`}>
                            <strong>{a.mbti}</strong> <span className="dispatch-agent-role">{AGENTS.find((x) => x.id === a.agentId)?.roleChinese}</span>
                            <span className="dispatch-agent-path">路径{pi?.path || '-'}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {mode === 'single' && entry.dispatchReasoning && !entry.dimensionWeights && (
                <div className="dispatch-card fade-in">
                  <div className="dispatch-card-header"><span className="dispatch-card-title">指定角色模式</span></div>
                  <div className="dispatch-card-body"><p>{entry.dispatchReasoning}</p></div>
                </div>
              )}

              {/* 集群面板 (仅活跃entry的collaborating阶段) */}
              {isActive && entryStep === 'collaborating' && entry.agents.length > 1 && (
                <div className="agent-cluster-panel">
                  <div className="cluster-label">专家集群协作中</div>
                  <div className="cluster-agents">
                    {entry.agents.map((a) => (
                      <div key={a.agentId} className="cluster-agent-chip">
                        <span className="cluster-agent-mbti">{a.mbti}</span>
                        <div className="cluster-mini-bar"><div className="cluster-mini-bar-fill" style={{ width: `${agentProgress[a.agentId] || 0}%` }} /></div>
                        <span className="cluster-agent-pct">{agentProgress[a.agentId] || 0}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="cluster-progress-summary">
                    {entry.agents.filter((a) => a.status === 'completed').length}/{entry.agents.length} 位专家已完成
                  </div>
                </div>
              )}

              {/* 专家卡片 */}
              {entry.agents.length > 0 && (
                <div className="thinker-grid">
                  {entry.agents.map((agent) => {
                    const pct = agentProgress[agent.agentId] || 0;
                    const isStreaming = agent.status === 'thinking' && (agent.content || agent.reasoning);

                    return (
                      <div
                        key={agent.agentId}
                        className={`thinker-card ${agent.status === 'completed' ? 'completed' : ''} ${isStreaming ? 'streaming' : ''}`}
                        onClick={() => { if (agent.status === 'completed') { setSelectedAgent(agent); setShowDetailPanel(true); } }}
                      >
                        <div className="card-header">
                          <div className="agent-info-header">
                            <span className="mbti-tag">{agent.mbti}</span>
                            <span className="agent-name-header">{agent.agentName}</span>
                          </div>
                          <span className="paradigm-text">{agent.paradigm}</span>
                        </div>

                        <div className="card-body">
                          {(agent.status === 'thinking' || agent.status === 'completed') && (
                            <div className="agent-local-progress">
                              <div className="local-progress-bar"><div className="local-progress-fill" style={{ width: agent.status === 'completed' ? '100%' : `${pct}%` }} /></div>
                              <span className="local-progress-label">{getProgressLabel(pct)}</span>
                            </div>
                          )}

                          {agent.status === 'thinking' && !agent.content && !agent.reasoning && (
                            <div className="thinking-placeholder">
                              <div className="loading-lines"><div className="loading-line" /><div className="loading-line" /><div className="loading-line" /><div className="loading-line" /></div>
                            </div>
                          )}

                          {/* 思考过程 — 折叠面板 */}
                          {deepThinkEnabled && agent.reasoning && (
                            <details className="think-accordion" open>
                              <summary className="think-summary" onClick={(e) => e.stopPropagation()}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>{agent.status === 'thinking' ? '深度思考过程' : '已思考完成'}</span>
                                <span className="think-summary-arrow">▾</span>
                              </summary>
                              <div className="think-block-content">
                                <ReactMarkdown key={`think-${agent.agentId}`} {...mdPlugins}>{cleanReasoning(cleanContent(agent.reasoning))}</ReactMarkdown>
                              </div>
                            </details>
                          )}

                          {/* 正式回答 */}
                          {agent.content && (
                            <div className={`thinking-content ${isStreaming && !agent.reasoning ? 'streaming-content' : ''}`}>
                              <div className="content-display">
                                <ReactMarkdown key={`md-${agent.agentId}`} {...mdPlugins}>{cleanContent(agent.content)}</ReactMarkdown>
                              </div>
                              {agent.status === 'completed' && (
                                <button className="expand-btn" onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); setShowDetailPanel(true); }}>展开</button>
                              )}
                            </div>
                          )}

                          {agent.status === 'error' && <div className="error-message">思考过程中出现错误，请重试</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 整合 Loading */}
              {isActive && entryStep === 'synthesizing' && (
                <div className="synthesis-loading fade-in">
                  <div className="synthesis-loading-pulse"><div className="pulse-ring" /><div className="pulse-ring delay-1" /><div className="pulse-ring delay-2" /></div>
                  <div className="synthesis-loading-text">
                    <span className="synthesis-loading-title">正在进行多维度交叉评审</span>
                    <span className="synthesis-loading-sub">综合 {entry.agents.filter((a) => a.status === 'completed').length} 位专家意见，生成整合报告...</span>
                  </div>
                  <div className="synthesis-loading-bar"><div className="synthesis-loading-bar-fill" /></div>
                </div>
              )}

              {/* 总工思维链 */}
              {entry.synthesisReasoning && (
                <details className="think-accordion synthesis-think" open>
                  <summary className="think-summary" onClick={(e) => e.stopPropagation()}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>已思考完成</span>
                    <span className="think-summary-arrow">▾</span>
                  </summary>
                  <div className="think-block-content">
                    <ReactMarkdown {...mdPlugins}>{cleanReasoning(cleanContent(entry.synthesisReasoning))}</ReactMarkdown>
                  </div>
                </details>
              )}

              {/* 整合答案 */}
              {entry.synthesis && (
                <div className="synthesis-answer fade-in">
                  <h3 className="synthesis-heading">整合答案</h3>
                  <div className="synthesis-content">
                    <ReactMarkdown {...mdPlugins}>{cleanContent(entry.synthesis)}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ===== 输入区 ===== */}
      <div className="input-area">
        <div className="mode-switcher">
          <button className={`mode-tab ${mode === 'collaborative' ? 'active' : ''}`} onClick={() => setMode('collaborative')} disabled={isProcessing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>按需协作</span>
          </button>
          <button className={`mode-tab ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')} disabled={isProcessing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>指定专家</span>
          </button>
          {mode === 'single' && (
            <div className="mbti-select-wrapper">
              <button className="mbti-select-btn" onClick={() => setShowMbtiDropdown(!showMbtiDropdown)} disabled={isProcessing}>
                <span>{AGENTS.find((a) => a.id === selectedMbti)?.mbti}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l4 4 4-4"/></svg>
              </button>
              {showMbtiDropdown && (
                <div className="mbti-dropdown">
                  {AGENTS.map((a) => (
                    <button key={a.id} className={`mbti-dropdown-item ${selectedMbti === a.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedMbti(a.id); setShowMbtiDropdown(false); }}>
                      <strong>{a.mbti}</strong> {a.roleChinese}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="input-wrapper">
          <textarea ref={inputRef} className="chat-input"
            placeholder="输入储能领域问题..."
            value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown} rows={1} disabled={isProcessing} />

          <div className="input-actions-row">
            <button className={`input-pill deepthink ${deepThinkEnabled ? 'enabled' : ''}`}
              onClick={() => setDeepThinkEnabled(!deepThinkEnabled)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
              <span>深度思考</span>
            </button>
            <div className="input-actions-right">
              {isProcessing ? (
                <button className="stop-btn" onClick={handleStop}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="10" height="10" rx="1.5" /></svg>
                  <span>停止生成</span>
                </button>
              ) : (
                <button className="send-btn" onClick={handleSend} disabled={!inputValue.trim()} title="发送">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 详情面板 */}
      {showDetailPanel && selectedAgent && (
        <div className="detail-overlay" onClick={() => setShowDetailPanel(false)}>
          <div className="detail-panel slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h2 className="panel-title">{selectedAgent.mbti} - {selectedAgent.agentName}</h2>
              <button className="close-btn" onClick={() => setShowDetailPanel(false)}>×</button>
            </div>
            <div className="panel-body">
              <div className="agent-detail-info">
                <div className="detail-row"><span className="detail-label">MBTI类型</span><span className="detail-value">{selectedAgent.mbti}</span></div>
                <div className="detail-row"><span className="detail-label">专业角色</span><span className="detail-value">{selectedAgent.agentName}</span></div>
                <div className="detail-row"><span className="detail-label">研发范式</span><span className="detail-value">{selectedAgent.paradigm}</span></div>
              </div>
              {selectedAgent.reasoning && (
                <div className="detail-think-block">
                  <h4 className="content-heading">思考过程</h4>
                  <div className="content-body think-content">
                    <ReactMarkdown {...mdPlugins}>{cleanReasoning(cleanContent(selectedAgent.reasoning))}</ReactMarkdown>
                  </div>
                </div>
              )}
              <div className="agent-full-content">
                <h4 className="content-heading">详细分析</h4>
                <div className="content-body">
                  <ReactMarkdown {...mdPlugins}>{cleanContent(selectedAgent.content)}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
