import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Clock, MessageSquare, CheckCircle, BarChart3 } from 'lucide-react'
import ChatContainer from '../chat/ChatContainer'
import { useChatMessages } from '../../hooks/useChatMessages'
import { useAgentState } from '../../hooks/useAgentState'
import './CollaborationPanel.css'

const CollaborationPanel = ({ cluster, isOpen }) => {
  const [userInput, setUserInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const messagesEndRef = useRef(null)

  const { messages, addMessage } = useChatMessages(cluster?.id)
  const { agents } = useAgentState()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!userInput.trim()) return

    addMessage({
      id: Date.now(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    })

    setUserInput('')
    setIsTyping(true)

    setTimeout(() => {
      addMessage({
        id: Date.now() + 1,
        type: 'agent',
        agentId: 'INTJ',
        content: '🏗️ [架构视角] 从系统整体架构出发，我建议采用模块化设计...\n• 能量管理策略的分层架构\n• BMS与PCS的协同控制\n• 系统级容错机制\n\n💡 我认为应该优先考虑系统可靠性，然后才是成本优化。',
        timestamp: new Date()
      })
      setIsTyping(false)
    }, 1500)
  }

  const tabs = [
    { id: 'chat', label: '实时对话', icon: MessageSquare },
    { id: 'stats', label: '协作统计', icon: BarChart3 }
  ]

  const quickActions = [
    { id: 'wakeup', label: '🎯 智能唤醒', action: () => alert('智能唤醒功能') },
    { id: 'adjust', label: '🤝 调整组合', action: () => alert('调整组合功能') },
    { id: 'pause', label: '⏸️ 暂停协作', action: () => alert('暂停协作功能') },
    { id: 'restart', label: '🔄 重新开始', action: () => alert('重新开始功能') }
  ]

  if (!isOpen) return null

  return (
    <div className="collaboration-panel">
      <div className="collaboration-header">
        <div className="cluster-info">
          <h2 className="cluster-title">{cluster?.name || '未选择集群'}</h2>
          <div className="cluster-meta">
            <span className="meta-item">
              <Users size={16} />
              {cluster?.memberCount || 0} 成员在线
            </span>
            <span className="meta-item">
              <Clock size={16} />
              已协作 {cluster?.collaborationTime || '0分钟'}
            </span>
            <span className="meta-item">
              <CheckCircle size={16} />
              共识度 {cluster?.consensusRate || 0}%
            </span>
          </div>
        </div>

        <div className="cluster-actions">
          <motion.button 
            className="action-btn primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => alert('导出报告功能')}
          >
            <CheckCircle size={18} />
            <span>导出报告</span>
          </motion.button>
        </div>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="collaboration-content">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="tab-content chat-content"
            >
              <ChatContainer 
                messages={messages}
                isTyping={isTyping}
                messagesEndRef={messagesEndRef}
                agents={agents}
              />
              
              <div className="chat-input-container">
                <textarea
                  className="chat-input"
                  placeholder="输入您的任务描述..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  rows={3}
                />
                <motion.button 
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!userInput.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  发送
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="tab-content stats-content"
            >
              <div className="stats-placeholder">
                <div className="stats-icon">📊</div>
                <h3>协作统计</h3>
                <p>这里将显示详细的协作统计数据...</p>
                <div className="mock-stats">
                  <div className="mock-stat">
                    <span className="mock-label">总协作次数</span>
                    <span className="mock-value">156</span>
                  </div>
                  <div className="mock-stat">
                    <span className="mock-label">平均满意度</span>
                    <span className="mock-value">4.8/5.0</span>
                  </div>
                  <div className="mock-stat">
                    <span className="mock-label">平均耗时</span>
                    <span className="mock-value">8分32秒</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="quick-actions">
        {quickActions.map(action => (
          <motion.button
            key={action.id}
            className="quick-btn"
            onClick={action.action}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="quick-emoji">{action.label.split(' ')[0]}</span>
            <span className="quick-text">{action.label.split(' ')[1]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default CollaborationPanel
