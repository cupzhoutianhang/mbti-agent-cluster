import { useState, useCallback, useEffect } from 'react';
import './index.css';
import './styles/kimi-layout.css';
import ExpertLibraryPanel from './components/ExpertLibraryPanel';
import ChatPage, { ConversationHistory } from './pages/ChatPage';

const STORAGE_KEY = 'mbti-cluster-history';

function loadHistory(): ConversationHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items: ConversationHistory[]) {
  try {
    // 只保留最近 20 条
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
  } catch { /* quota exceeded, ignore */ }
}

function App() {
  const [showExpertPanel, setShowExpertPanel] = useState(false);
  const [history, setHistory] = useState<ConversationHistory[]>(loadHistory);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // 持久化
  useEffect(() => { saveHistory(history); }, [history]);

  const handleNewConversation = useCallback(() => {
    setActiveHistoryId(null);
  }, []);

  const handleHistoryUpdate = useCallback((item: ConversationHistory) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== item.id); // 去重：同一对话只保留最新
      return [item, ...filtered];                           // 置顶
    });
  }, []);

  const handleSelectHistory = useCallback((id: string) => {
    setActiveHistoryId(id);
  }, []);

  const handleDeleteHistory = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (activeHistoryId === id) setActiveHistoryId(null);
      return next;
    });
  }, [activeHistoryId]);

  const selectedHistory = history.find(h => h.id === activeHistoryId) || null;

  return (
    <div className="app-container">
      <aside className={`sidebar ${showExpertPanel ? 'expanded' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <div className="logo-text">
              <span className="logo-mbti">ChargeBD</span>
              <span className="logo-sub">Web Platform</span>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <button
            className={`sidebar-btn ${activeHistoryId === null ? 'active' : ''}`}
            onClick={handleNewConversation}
          >
            <span className="btn-icon">+</span>
            <span>新建对话</span>
          </button>

          <div className="sidebar-section">
            <div className="section-title">历史对话</div>
            {history.length === 0 ? (
              <div className="history-empty">暂无历史对话</div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-btn history-item ${activeHistoryId === item.id ? 'active' : ''}`}
                  onClick={() => handleSelectHistory(item.id)}
                >
                  <span className="history-item-text">{item.question}</span>
                  <span className="history-item-time">{formatTime(item.timestamp)}</span>
                  <span
                    className="history-delete-btn"
                    onClick={(e) => handleDeleteHistory(e, item.id)}
                    title="删除"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            className="sidebar-btn"
            onClick={() => setShowExpertPanel(!showExpertPanel)}
          >
            <span className="btn-icon">📚</span>
            <span>专家库</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <ChatPage
          selectedHistory={selectedHistory}
          activeHistoryId={activeHistoryId}
          onHistoryUpdate={handleHistoryUpdate}
          onNewConversation={handleNewConversation}
          onSetActiveHistoryId={setActiveHistoryId}
        />
      </main>

      {showExpertPanel && (
        <ExpertLibraryPanel onClose={() => setShowExpertPanel(false)} />
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  return d.toLocaleDateString('zh-CN');
}

export default App;
