import { useState } from 'react';
import { AGENTS } from '../data/agents';
import { Agent } from '../types/agent';

export default function ExpertLibraryPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <div className="library-container">
      {/* 左侧：专家列表 */}
      <div className="expert-list">
        {AGENTS.map((agent, index) => (
          <div
            key={agent.id}
            className={`expert-item ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
            onClick={() => setSelectedAgent(agent)}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="expert-avatar-small">
              <img
                src={agent.image}
                alt={agent.roleChinese}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="#E5E7EB" width="40" height="40"/><text x="20" y="25" text-anchor="middle" fill="#6B7280" font-size="16">🧑</text></svg>');
                }}
              />
            </div>
            <div className="expert-info-small">
              <div className="expert-mbti">{agent.mbti} {agent.mbtiChinese}</div>
              <div className="expert-role-small">{agent.roleChinese}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 中间：专家详情 */}
      <div className="expert-detail">
        {selectedAgent ? (
          <div className="detail-content fade-in">
            <div className="detail-header">
              <h2 className="agent-name-large">{selectedAgent.roleChinese}</h2>
              <button
                className="close-button"
                onClick={() => setSelectedAgent(null)}
              >
                ×
              </button>
            </div>

            <div className="detail-info">
              <div className="info-row">
                <span className="info-label">MBTI类型</span>
                <span className="info-value">{selectedAgent.mbti} {selectedAgent.mbtiChinese}</span>
              </div>
              <div className="info-row">
                <span className="info-label">专业角色</span>
                <span className="info-value">{selectedAgent.roleEnglish}</span>
              </div>
              <div className="info-row">
                <span className="info-label">研发范式</span>
                <span className="info-value">{selectedAgent.paradigm}</span>
              </div>
              <div className="info-row">
                <span className="info-label">专家ID</span>
                <span className="info-value">{selectedAgent.id}</span>
              </div>
            </div>

            <div className="agent-avatar-large">
              <img
                src={selectedAgent.image}
                alt={selectedAgent.roleChinese}
                className="large-avatar"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="#E5E7EB" width="120" height="120"/><text x="60" y="70" text-anchor="middle" fill="#6B7280" font-size="48">🧑</text></svg>');
                }}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👆</div>
            <div className="empty-text">选择左侧专家查看详情</div>
          </div>
        )}
      </div>

      {/* 右侧：操作区 */}
      <div className="action-area">
        {selectedAgent ? (
          <>
            <button className="action-button primary">
              <span className="action-icon">🧠</span>
              <span>深度思考</span>
            </button>
            <button className="action-button secondary">
              <span className="action-icon">🔬</span>
              <span>联网搜索</span>
            </button>
          </>
        ) : (
          <div className="action-placeholder">
            <p>请先选择一位专家</p>
          </div>
        )}
      </div>
    </div>
  );
}