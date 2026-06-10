import React from 'react';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function DetailPanel({ isOpen, onClose, title, children }: DetailPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div
        className="detail-panel-content slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-panel-header">
          <h3 className="detail-panel-title">{title}</h3>
          <button className="detail-panel-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="detail-panel-body">
          {children}
        </div>
      </div>
    </div>
  );
}
