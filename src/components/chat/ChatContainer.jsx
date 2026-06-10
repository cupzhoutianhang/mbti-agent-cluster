import React from 'react'
import { User, Clock, Copy, Check } from 'lucide-react'
import './ChatContainer.css'

const ChatContainer = ({ messages, isTyping, messagesEndRef, agents }) => {
  const getAgentById = (agentId) => {
    return agents?.find(agent => agent.id === agentId)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="chat-container">
      {messages.map((message, index) => (
        <div key={message.id} className={`message-row ${message.type}`}>
          {message.type === 'user' ? (
            <div className="message user-message">
              <div className="message-header">
                <User size={16} className="user-icon" />
                <span className="message-author">用户 (甲方)</span>
                <span className="message-time">
                  <Clock size={14} />
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-actions">
                <button onClick={() => copyMessage(message.content)} title="复制">
                  <Copy size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="message agent-message">
              {(() => {
                const agent = getAgentById(message.agentId)
                return (
                  <>
                    <div 
                      className="agent-avatar"
                      style={{ backgroundColor: agent?.color || '#888' }}
                    >
                      {agent?.avatar || '🤖'}
                    </div>
                    <div className="message-body">
                      <div className="message-header">
                        <span className="agent-name">
                          {agent?.name || message.agentId}
                        </span>
                        <span className="agent-role">
                          {agent?.role || ''}
                        </span>
                        <span className="message-time">
                          <Clock size={14} />
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="message-content">
                        {message.content.split('\n').map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                      <div className="message-actions">
                        <button onClick={() => copyMessage(message.content)} title="复制">
                          <Copy size={14} />
                        </button>
                        <button title="确认">
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      ))}

      {isTyping && (
        <div className="typing-indicator">
          <div className="typing-avatar">
            <div className="typing-dot" />
          </div>
          <div className="typing-text">INTJ-架构师 正在输入...</div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatContainer
