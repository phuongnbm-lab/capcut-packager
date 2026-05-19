import React, { useState } from 'react'
import Header from './components/Header'
import ExportTab from './components/ExportTab'
import ImportTab from './components/ImportTab'

export default function App() {
  const [activeTab, setActiveTab] = useState('export')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'export' ? <ExportTab /> : <ImportTab />}
      </div>
    </div>
  )
}
