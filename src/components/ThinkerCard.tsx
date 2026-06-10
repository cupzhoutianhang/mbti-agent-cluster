import React from 'react';
import { AgentResult } from '../types/agent';

interface ThinkerCardProps {
  agent: AgentResult;
  delay: number;
}

export function ThinkerCard({ agent, delay }: ThinkerCardProps) {
  return (
    <div
      className="thinker-card fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="thinker-header">
        <div className="thinker-title">
          <span className="thinker-name">
            {agent.mbti}（{agent.agentName}）
          </span>
        </div>
        <div className="thinker-paradigm">
          {agent.paradigm}
        </div>
      </div>

      <div className="thinker-content">
        <div className="thinker-status">
          <div className={`status-indicator status-${agent.status}`}>
            {agent.status === 'thinking' ? '🔄 思考中...' :
             agent.status === 'completed' ? '✅ 已完成' :
             agent.status === 'error' ? '❌ 出错' : '❓ 未知'}
          </div>
        </div>

        {agent.content && (
          <div className="content-text">
            {agent.content}
          </div>
        )}

        {agent.summary && (
          <div className="content-summary">
            {agent.summary}
          </div>
        )}
      </div>
    </div>
  );
}