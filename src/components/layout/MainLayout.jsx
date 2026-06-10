import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Battery } from 'lucide-react'
import './MainLayout.css'

const MainLayout = ({ children, sidebarOpen, setSidebarOpen }) => {
  // 提取不同的子组件
  const childrenArray = React.Children.toArray(children)
  const sidebar = childrenArray.find(child => child.type?.name === 'Sidebar')
  const content = childrenArray.filter(child => child.type?.name !== 'Sidebar')

  return (
    <div className="main-layout">
      {/* 顶部导航栏 */}
      <header className="main-header">
        <div className="header-left">
          <Zap size={24} className="logo-icon" />
          <h1 className="logo-text">MBTI储能多智能体系统</h1>
        </div>
        <div className="header-right">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Zap size={20} />
          </button>
          <div className="user-info">
            <Battery size={20} />
            <span>用户</span>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="main-content">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="sidebar-container"
            >
              {sidebar}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.main 
          className={`content-area ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {content}
        </motion.main>
      </div>
    </div>
  )
}

export default MainLayout
