import { useState, useEffect } from 'react'

export const useChatMessages = (clusterId) => {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 硅基流动 API 配置（核心！调用DeepSeek模型）
  const API_BASE_URL = "https://api.siliconflow.cn/v1/chat/completions"
  const API_KEY = import.meta.env.VITE_SILICONFLOW_API_KEY
  const MODEL_NAME = "deepseek-ai/DeepSeek-V3.2"

  // 初始化消息
  useEffect(() => {
    if (clusterId) {
      const initialMessages = [
        {
          id: 1,
          type: 'user',
          content: '需要设计一个高效的储能系统，重点考虑成本和安全性...',
          timestamp: new Date()
        }
      ]
      setMessages(initialMessages)
    }
  }, [clusterId])

  // 调用硅基流动 DeepSeek 模型（核心函数）
  const sendToAI = async (userMessage) => {
    if (!API_KEY) {
      alert("请先配置 .env 文件中的硅基流动API密钥")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: "system", content: "你是MBTI储能多智能体助手，专业回答储能系统相关问题" },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7
        })
      })

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error("API调用失败：", error)
      return "AI调用失败，请检查API密钥或网络"
    } finally {
      setIsLoading(false)
    }
  }

  // 发送消息（用户输入后调用）
  const addMessage = async (message) => {
    // 先添加用户消息
    const newMessages = [...messages, message]
    setMessages(newMessages)

    // 调用AI
    const aiReply = await sendToAI(message.content)
    
    // 添加AI回复
    setMessages([
      ...newMessages,
      {
        id: Date.now(),
        type: 'agent',
        agentId: 'INTJ-C',
        content: aiReply,
        timestamp: new Date()
      }
    ])
  }

  const updateMessage = (messageId, updates) => {
    setMessages(prev => 
      prev.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg)
    )
  }

  return {
    messages,
    addMessage,
    updateMessage,
    isLoading
  }
}