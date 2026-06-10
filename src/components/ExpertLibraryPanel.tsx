import React from 'react';
import { AGENTS } from '../data/agents';

interface ExpertLibraryPanelProps {
  onClose: () => void;
}

function ExpertLibraryPanel({ onClose }: ExpertLibraryPanelProps) {
  return (
    <div className="expert-library-overlay" onClick={onClose}>
      <div className="expert-library-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-heading">MBTI专家库</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="panel-content">
          <div className="agents-grid">
            {AGENTS.map((agent, index) => (
              <div
                key={agent.id}
                className="agent-card"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="agent-avatar">
                  <img
                    src={agent.image}
                    alt={agent.roleChinese}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/expert-icons/default-avatar.png';
                    }}
                  />
                </div>
                <div className="agent-info">
                  <div className="agent-mbti">{agent.mbti}</div>
                  <div className="agent-name">{agent.roleChinese}</div>
                  <div className="agent-role">{agent.roleEnglish}</div>
                  <div className="agent-paradigm">{agent.paradigm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpertLibraryPanel;
