import React, { useState, useEffect } from 'react'

const VERSION = '2026.05.29'
const AUTHOR = 'Bá Phương'
const ZALO = '0904066020'
const REPO = 'phuongnbm-lab/capcut-packager'

export default function Header({ activeTab, setActiveTab }) {
  const [showAbout, setShowAbout] = useState(false)
  const [showDonate, setShowDonate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('checking') // 'checking' | 'latest' | 'available' | 'downloading'
  const [latestVersion, setLatestVersion] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [downloadPercent, setDownloadPercent] = useState(0)

  const handleClose = () => window.electronAPI?.closeWindow?.()
  const handleMinimize = () => window.electronAPI?.minimizeWindow?.()
  const handleMaximize = () => window.electronAPI?.maximizeWindow?.()

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then(r => r.json())
      .then(data => {
        const tag = data.tag_name?.replace(/^v/, '')
        if (!tag) { setUpdateStatus('latest'); return }
        setLatestVersion(tag)
        const asset = data.assets?.find(a => a.name.endsWith('.exe'))
        if (asset) setDownloadUrl(asset.browser_download_url)
        setUpdateStatus(tag > VERSION ? 'available' : 'latest')
      })
      .catch(() => setUpdateStatus('latest'))

    window.electronAPI?.onUpdateDownloadProgress?.(data => {
      setDownloadPercent(data.percent)
    })
  }, [])

  const handleUpdate = async () => {
    if (!downloadUrl || updateStatus !== 'available') return
    setUpdateStatus('downloading')
    setDownloadPercent(0)
    await window.electronAPI?.downloadAndInstallUpdate(downloadUrl)
  }

  return (
    <>
      {/* Donate modal */}
      {showDonate && (
        <div
          onClick={() => setShowDonate(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 28px 24px',
              width: 340,
              textAlign: 'center',
              boxShadow: '0 12px 50px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>☕</div>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4, color: 'var(--text-primary)' }}>
              Ủng hộ tác giả
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.6 }}>
              Nếu app hữu ích, hãy ủng hộ tác giả một ly Café ☕ — quét mã QR bên dưới để chuyển khoản.
            </div>

            {/* QR Code */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 10,
              display: 'inline-block',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              marginBottom: 10,
            }}>
              <img
                src="donate.png"
                alt="QR donate"
                style={{ width: 220, height: 220, display: 'block', borderRadius: 6 }}
              />
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Quét mã để mời mình ly cà phê nhé!<br />
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Cảm ơn bạn rất nhiều! ❤️</span>
            </div>

            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              marginBottom: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span style={{ color: '#e91e8c', fontWeight: 700 }}>MoMo</span>
              <span>·</span>
              <span style={{ color: '#1565c0', fontWeight: 700 }}>VietQR</span>
              <span>·</span>
              <span style={{ color: '#0d7a3e', fontWeight: 700 }}>Napas 247</span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18 }}>
              Tác giả: <strong style={{ color: 'var(--text-primary)' }}>{AUTHOR}</strong>
              {' '}· Zalo: <strong style={{ color: 'var(--accent)' }}>{ZALO}</strong>
            </div>

            <button
              onClick={() => setShowDonate(false)}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: 'var(--bg-input)', color: 'var(--text-secondary)',
                fontWeight: 600, fontSize: 13,
                border: '1px solid var(--border)',
              }}
            >Đóng</button>
          </div>
        </div>
      )}

      {/* About modal */}
      {showAbout && (
        <div
          onClick={() => setShowAbout(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 32,
              width: 320,
              textAlign: 'center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            <img src="icon.ico" alt="logo" style={{ width: 52, height: 52, margin: '0 auto 14px', display: 'block', borderRadius: 12, objectFit: 'contain' }} />

            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>CapCut Packager</div>
            <div style={{
              fontSize: 11, color: 'var(--text-muted)',
              background: 'var(--bg-input)', display: 'inline-block',
              padding: '2px 10px', borderRadius: 20, marginBottom: 20,
            }}>v{VERSION}</div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
              <Row label="Tác giả" value={AUTHOR} />
              <Row label="Zalo" value={ZALO} accent />
              <Row label="Bản quyền" value={`© ${new Date().getFullYear()} ${AUTHOR}`} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
              Công cụ đóng gói &amp; chuyển project CapCut<br />
              giữa các máy tính một cách nhanh chóng.
            </div>

            <button
              onClick={() => setShowAbout(false)}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13,
              }}
            >Đóng</button>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag',
        flexShrink: 0,
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', height: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="icon.ico" alt="logo" style={{ width: 24, height: 24, borderRadius: 5, objectFit: 'contain' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>CapCut Packager</span>

            {/* Version badge — always shows current version */}
            <span style={{
              fontSize: 10, color: 'var(--text-muted)',
              background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4,
            }}>
              v{VERSION}
            </span>

            {/* Update button — only visible when update available */}
            {(updateStatus === 'available' || updateStatus === 'downloading') && (
              <button
                onClick={updateStatus === 'available' ? handleUpdate : undefined}
                style={{
                  WebkitAppRegion: 'no-drag',
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 5,
                  background: updateStatus === 'downloading'
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'linear-gradient(135deg, #22c55e, #15803d)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  border: 'none',
                  cursor: updateStatus === 'downloading' ? 'default' : 'pointer',
                  animation: updateStatus === 'available' ? 'blink-update 1s ease-in-out infinite' : 'none',
                  boxShadow: '0 0 10px rgba(34,197,94,0.5)',
                }}
                title={updateStatus === 'downloading' ? `Đang tải...` : `Cài v${latestVersion} tự động`}
              >
                {updateStatus === 'downloading' ? `⬇ ${downloadPercent}%` : '⬆ Update'}
              </button>
            )}

            {/* Author badge */}
            <button
              onClick={() => setShowAbout(true)}
              style={{
                WebkitAppRegion: 'no-drag',
                background: 'transparent', border: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
                padding: '2px 6px', borderRadius: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Thông tin bản quyền"
            >
              © {AUTHOR}
            </button>
          </div>

          {/* Window controls */}
          <div style={{ display: 'flex', gap: 6, WebkitAppRegion: 'no-drag' }}>
            <WinBtn color="#f59e0b" onClick={handleMinimize} title="Minimize" />
            <WinBtn color="#4caf50" onClick={handleMaximize} title="Maximize" />
            <WinBtn color="#ef4444" onClick={handleClose} title="Close" />
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', WebkitAppRegion: 'no-drag' }}>
          {['export', 'import'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: 500,
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                background: 'transparent',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'export' ? 'Xuất Project' : 'Nhập Project'}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Buy me a Coffee button */}
          <button
            onClick={() => setShowDonate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 10px rgba(245,158,11,0.35)',
              transition: 'all 0.2s',
              marginBottom: 5,
              border: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.55)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(245,158,11,0.35)'
            }}
            title="Buy me a Coffee"
          >
            ☕ Buy me a Coffee
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink-update {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
          50% { opacity: 0.55; box-shadow: 0 0 18px rgba(34,197,94,1); }
        }
      `}</style>
    </>
  )
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function WinBtn({ color, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: color,
        opacity: 0.7,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.target.style.opacity = 1}
      onMouseLeave={e => e.target.style.opacity = 0.7}
    />
  )
}
