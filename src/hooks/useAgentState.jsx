import { useState } from 'react'
import { MBTI_AGENTS, CLUSTERS, TEMPLATES } from '../utils/mbtiData'

export const useAgentState = () => {
  const [agents, setAgents] = useState(MBTI_AGENTS)
  const [clusters, setClusters] = useState(CLUSTERS)
  const [templates, setTemplates] = useState(TEMPLATES)

  const getAgentById = (id) => {
    return agents.find(agent => agent.id === id)
  }

  const getAgentStats = (agentId) => {
    return {
      collaborations: Math.floor(Math.random() * 50) + 20,
      consensusRate: Math.floor(Math.random() * 20) + 80,
      rating: (Math.random() * 0.5 + 4.5).toFixed(1)
    }
  }

  const loadClusters = async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(CLUSTERS), 500)
    })
  }

  const loadTemplates = async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(TEMPLATES), 500)
    })
  }

  return {
    agents,
    clusters,
    templates,
    getAgentById,
    getAgentStats,
    loadClusters,
    loadTemplates
  }
}
