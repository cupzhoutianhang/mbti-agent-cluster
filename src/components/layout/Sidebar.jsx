import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Layers, Star, BarChart3, Zap, Clock, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAgentState } from '../../hooks/useAgentState'
import './Sidebar.css'

const Sidebar = ({ isOpen, currentCluster, setCurrentCluster }) => {
  const [clusters, setClusters] = useState([])
  const [templates, setTemplates] = useState([])
  const [expandedCluster, setExpandedCluster] = useState(null)

  const { loadClusters, loadTemplates } = useAgentState()

  useEffect(() => {
    const loadData = async () => {
      const clustersData = await loadClusters()
      const templatesData = await loadTemplates()
      setClusters(clustersData)
      setTemplates(templatesData)
    }
    loadData()
  }, [])

  const handleClusterClick = (cluster) => {
    setCurrentCluster(cluster)
    setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)
  }

  if (!isOpen) return null

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {/* 我的集群 */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <Layers size={18} />
            <span>我的集群</span>
          </div>
          <motion.button 
            className="new-cluster-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap size={20} />
            <span>新建集群</span>
          </motion.button>
          <div className="clusters-list">
            {clusters.map(cluster => (
              <motion.div 
                key={cluster.id} 
                className={`cluster-item ${currentCluster?.id === cluster.id ? 'active' : ''}`}
                onClick={() => handleClusterClick(cluster)}
                whileHover={{ x: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <div className="cluster-item-header">
                  <div className="cluster-icon">
                    {cluster.status === 'active' ? <Zap size={16} className="status-active" /> : <Clock size={16} className="status-paused" />}
                  </div>
                  <div className="cluster-info">
                    <div className="cluster-name">{cluster.name}</div>
                    <div className="cluster-meta">
                      {cluster.memberCount} 成员 • {cluster.todayTasks} 今日任务
                    </div>
                  </div>
                  <motion.div 
                    className="expand-icon-container"
                    animate={{ rotate: expandedCluster === cluster.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <BarChart3 size={18} />
            <span>协作统计</span>
          </div>
          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-value">25</span>
              <span className="stat-label">今日协作</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">8分</span>
              <span className="stat-label">平均耗时</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">92%</span>
              <span className="stat-label">满意度</span>
            </div>
          </div>
        </div>

        {/* 底部导航 */}
        <div className="sidebar-footer">
          <motion.button 
            className="nav-item"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
            <span>设置</span>
          </motion.button>
          <motion.button 
            className="nav-item logout"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={18} />
            <span>退出</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
