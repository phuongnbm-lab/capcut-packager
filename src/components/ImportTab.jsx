import React, { useState, useEffect } from 'react'

const api = window.electronAPI

export default function ImportTab() {
  const [zipPath, setZipPath] = useState('')
  const [targetFolder, setTargetFolder] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    api?.getDefaultCapCutPath().then(p => { if (p) setTargetFolder(p) })
    api?.onImportProgress(data => setProgress(data))
    return () => api?.removeAllListeners('import-progress')
  }, [])

  const handleSelectZip = async () => {
    const file = await api?.selectFile()
    if (file) { setZipPath(file); setResult(null) }
  }

  const handleSelectTarget = async () => {
    const folder = await api?.selectFolder()
    if (folder) setTargetFolder(folder)
  }

  const handleImport = async () => {
    if (!zipPath || !targetFolder) return
    setImporting(true)
    setProgress(null)
    setResult(null)
    const res = await api?.importProject(zipPath, targetFolder)
    setResult(res)
    setImporting(false)
    setProgress(null)
  }

  const canImport = zipPath && targetFolder && !importing

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{
        width: 400,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        gap: 16,
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        <Section title="1. Chọn file ZIP">
          <Label>File ZIP cần import</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={zipPath}
              onChange={e => setZipPath(e.target.value)}
              placeholder="Chọn file .zip đã xuất..."
              style={inputStyle}
            />
            <IconBtn onClick={handleSelectZip} title="Chọn file">📁</IconBtn>
          </div>

          {zipPath && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--bg-input)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 12,
            }}>
              <div style={{ color: 'var(--text-secondary)' }}>📦 {zipPath.split(/[\\/]/).pop()}</div>
            </div>
          )}
        </Section>

        <Section title="2. Thư mục đích">
          <Label>Import vào thư mục CapCut Projects</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={targetFolder}
              onChange={e => setTargetFolder(e.target.value)}
              style={inputStyle}
            />
            <IconBtn onClick={() => targetFolder && api?.openFolder(targetFolder)} title="Mở thư mục">📂</IconBtn>
            <IconBtn onClick={handleSelectTarget} title="Chọn thư mục">🗁</IconBtn>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Project sẽ được giải nén vào thư mục này. CapCut sẽ tự nhận diện sau khi khởi động lại.
          </div>
        </Section>

        <Section title="3. Import">
          {progress && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  {progress.file}
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress.percent}%`,
                  background: 'linear-gradient(90deg, var(--accent), #c84dff)',
                  borderRadius: 2,
                  transition: 'width 0.2s',
                }} />
              </div>
            </div>
          )}

          {result && (
            <div style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              background: result.success ? 'var(--green-light)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'var(--green)' : 'var(--red)'}`,
              fontSize: 12,
            }}>
              {result.success ? (
                <>
                  <div style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                    ✓ Import thành công!
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
                    📁 Project: {result.projectName}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>
                    {result.projectDir}
                  </div>
                  <div style={{ color: 'var(--yellow)', fontSize: 11, marginBottom: 6 }}>
                    ⚡ Mở CapCut và refresh để thấy project mới.
                  </div>
                  <button
                    onClick={() => api?.openFolder(result.projectDir)}
                    style={{ fontSize: 11, color: 'var(--accent)', background: 'transparent', textDecoration: 'underline' }}
                  >
                    Mở thư mục project →
                  </button>
                </>
              ) : (
                <div style={{ color: 'var(--red)' }}>✕ Lỗi: {result.error}</div>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!canImport}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              background: canImport
                ? 'linear-gradient(135deg, var(--accent), #c84dff)'
                : 'var(--bg-input)',
              color: canImport ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
              cursor: canImport ? 'pointer' : 'not-allowed',
            }}
          >
            {importing ? '⏳ Đang nhập...' : '📥 Nhập Project'}
          </button>
        </Section>
      </div>

      {/* Right panel: instructions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 24 }}>
        <div style={{ fontSize: 48 }}>📥</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Hướng dẫn Import</div>

        {[
          { step: '1', icon: '📦', title: 'Nhận file ZIP', desc: 'Nhận file .zip từ người dùng khác hoặc từ máy cũ của bạn.' },
          { step: '2', icon: '📁', title: 'Chọn file ZIP', desc: 'Nhấn "Chọn file" để chọn file .zip cần nhập vào CapCut.' },
          { step: '3', icon: '⚙️', title: 'Chọn thư mục', desc: 'Chọn thư mục CapCut Projects. App tự nhận diện đường dẫn mặc định.' },
          { step: '4', icon: '🚀', title: 'Nhập project', desc: 'Nhấn "Nhập Project". Media sẽ được tự động liên kết lại trong project.' },
          { step: '5', icon: '🎬', title: 'Mở CapCut', desc: 'Mở CapCut và refresh. Project sẽ xuất hiện trong danh sách.' },
        ].map(({ step, icon, title, desc }) => (
          <div key={step} style={{ display: 'flex', gap: 14, maxWidth: 440, width: '100%' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent-light)',
              border: '1px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--accent)',
              flexShrink: 0,
            }}>{step}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                {icon} {title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 14,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{children}</div>
}

function IconBtn({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '6px 8px',
      fontSize: 14,
      color: 'var(--text-secondary)',
      flexShrink: 0,
    }}>
      {children}
    </button>
  )
}

const inputStyle = {
  flex: 1,
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: 'var(--text-primary)',
  minWidth: 0,
}
