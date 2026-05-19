import React, { useState, useEffect, useRef } from 'react'
import ProjectCard from './ProjectCard'

const api = window.electronAPI

function playSound(src) {
  try { new Audio(src).play() } catch {}
}
const playSuccess = () => playSound('complete.mp3')
const playError   = () => playSound('error.mp3')

export default function ExportTab() {
  const [capCutFolder, setCapCutFolder] = useState('')
  const [outputFolder, setOutputFolder] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [diskSpace, setDiskSpace] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(null) // { projectIndex, projectName, total, fileProgress }
  const [results, setResults] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [errorModal, setErrorModal] = useState(null)
  const [pulse, setPulse] = useState(false)
  const pulseRef = useRef(null)

  useEffect(() => {
    api?.getDefaultCapCutPath().then(p => {
      if (p) { setCapCutFolder(p); loadProjects(p) }
    })
    api?.onExportProgress(data => {
      setBatchProgress(prev => prev ? { ...prev, fileProgress: data } : null)
    })
    return () => api?.removeAllListeners('export-progress')
  }, [])

  useEffect(() => {
    if (exporting) {
      pulseRef.current = setInterval(() => setPulse(v => !v), 600)
    } else {
      clearInterval(pulseRef.current); setPulse(false)
    }
    return () => clearInterval(pulseRef.current)
  }, [exporting])

  const loadProjects = async (folder) => {
    if (!folder) return
    const list = await api?.getProjects(folder) || []
    setProjects(list)
    setSelectedIds(new Set()); setResults([])
  }

  // Fetch disk space whenever outputFolder changes
  useEffect(() => {
    if (!outputFolder) { setDiskSpace(null); return }
    api?.getDiskSpace(outputFolder).then(d => setDiskSpace(d))
  }, [outputFolder])

  const handleToggle = (project) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(project.id) ? next.delete(project.id) : next.add(project.id)
      return next
    })
    setResults([])
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  const handleExport = async () => {
    if (selectedIds.size === 0 || !outputFolder) return
    const toExport = projects.filter(p => selectedIds.has(p.id))
    setExporting(true); setResults([])

    const allResults = []
    for (let i = 0; i < toExport.length; i++) {
      const project = toExport[i]
      setBatchProgress({
        projectIndex: i + 1,
        projectTotal: toExport.length,
        projectName: project.name,
        fileProgress: null,
      })
      try {
        const res = await api?.exportProject(project.path, outputFolder)
        allResults.push({ project, res })
        if (!res?.success) playError()
      } catch (e) {
        allResults.push({ project, res: { success: false, error: String(e) } })
        playError()
      }
    }

    setResults(allResults)
    setExporting(false)
    setBatchProgress(null)

    const anyFail = allResults.some(r => !r.res?.success)
    if (!anyFail) playSuccess()
    else if (allResults.every(r => !r.res?.success)) setErrorModal('Tất cả project đều thất bại khi xuất ZIP.')
  }

  const selectedProjects = projects.filter(p => selectedIds.has(p.id))
  const filtered = projects
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'newest' ? b.sizeBytes - a.sizeBytes : a.name.localeCompare(b.name))

  const canExport = selectedIds.size > 0 && outputFolder && !exporting
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Error Modal */}
      {errorModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--red)',
            borderRadius: 12, padding: 28, maxWidth: 400, width: '90%',
            boxShadow: '0 0 40px rgba(239,68,68,0.3)',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>❌</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)', marginBottom: 8, textAlign: 'center' }}>Xuất ZIP thất bại</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>{errorModal}</div>
            <button onClick={() => setErrorModal(null)} style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: 'var(--red)', color: '#fff', fontWeight: 600, fontSize: 14,
            }}>Đóng</button>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div style={{
        width: 360, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: 16, gap: 14,
        overflowY: 'auto', flexShrink: 0,
      }}>
        <Section title="1. Cài đặt">
          <Label>Thư mục Projects CapCut</Label>
          <FolderInput value={capCutFolder} onChange={e => setCapCutFolder(e.target.value)}
            onBrowse={async () => { const f = await api?.selectFolder(); if (f) { setCapCutFolder(f); loadProjects(f) } }}
            onOpen={() => api?.openFolder(capCutFolder)} />
          <Label style={{ marginTop: 10 }}>Thư mục xuất ZIP</Label>
          <FolderInput value={outputFolder} onChange={e => setOutputFolder(e.target.value)}
            onBrowse={async () => { const f = await api?.selectFolder(); if (f) setOutputFolder(f) }}
            onOpen={() => outputFolder && api?.openFolder(outputFolder)} />
          <button onClick={() => loadProjects(capCutFolder)} style={refreshBtnStyle}>
            🔄 Tải lại danh sách
          </button>
        </Section>

        {/* Selected summary */}
        {selectedIds.size > 0 && (
          <Section title={`2. Đã chọn (${selectedIds.size} project)`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
              {selectedProjects.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', background: 'var(--bg-input)', borderRadius: 6, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                    {p.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{p.size}</span>
                </div>
              ))}
            </div>

            {/* Total size + disk space */}
            <div style={{
              marginTop: 10, padding: '8px 10px',
              background: 'var(--bg-input)', borderRadius: 8,
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              {/* Total selected size */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng dự kiến</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  ~{formatBytes(selectedProjects.reduce((s, p) => s + p.sizeBytes, 0))}
                </span>
              </div>

              {/* Disk space of output drive */}
              {diskSpace ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ổ {diskSpace.drive} còn trống</span>
                    <span style={{
                      fontWeight: 700,
                      color: diskSpace.free < selectedProjects.reduce((s, p) => s + p.sizeBytes, 0)
                        ? 'var(--red)' : 'var(--green)',
                    }}>
                      {formatBytes(diskSpace.free)}
                    </span>
                  </div>
                  {/* Disk usage bar */}
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((diskSpace.total - diskSpace.free) / diskSpace.total * 100))}%`,
                      background: diskSpace.free / diskSpace.total < 0.1 ? 'var(--red)' : 'var(--green)',
                      borderRadius: 2,
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {formatBytes(diskSpace.total - diskSpace.free)} / {formatBytes(diskSpace.total)} đã dùng
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  ← Chọn thư mục xuất để xem dung lượng ổ đĩa
                </div>
              )}
            </div>

            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
              Mỗi project → 1 file ZIP riêng
            </div>
          </Section>
        )}

        {/* Export section */}
        <Section title={selectedIds.size > 0 ? '3. Xuất' : '2. Xuất'}>
          {/* Batch progress */}
          {exporting && batchProgress && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, marginBottom: 4,
              }}>
                <span style={{ color: pulse ? 'var(--accent)' : 'var(--text-secondary)', transition: 'color 0.4s', fontWeight: 600 }}>
                  📦 {batchProgress.projectName}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {batchProgress.projectIndex}/{batchProgress.projectTotal}
                </span>
              </div>

              {/* Overall project progress */}
              <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((batchProgress.projectIndex - 1) / batchProgress.projectTotal * 100)}%`,
                  background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s',
                }} />
              </div>

              {/* File-level progress */}
              {batchProgress.fileProgress && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {batchProgress.fileProgress.file}
                  </div>
                  <div style={{ height: 3, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${batchProgress.fileProgress.percent}%`,
                      background: 'linear-gradient(90deg, var(--accent), #c84dff)',
                      borderRadius: 2, transition: 'width 0.2s',
                      boxShadow: '0 0 6px rgba(124,77,255,0.5)',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                    {batchProgress.fileProgress.percent}%
                  </div>
                </>
              )}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !exporting && (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflowY: 'auto' }}>
              {results.map(({ project, res }, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 7, fontSize: 12,
                  background: res.success ? 'var(--green-light)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${res.success ? 'var(--green)' : 'var(--red)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: res.success ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                      {res.success ? '✓' : '✕'} {project.name}
                    </span>
                    {res.success && <span style={{ color: 'var(--text-muted)' }}>{res.zipSize}</span>}
                  </div>
                  {res.success && res.missingFiles?.length > 0 && (
                    <div style={{ color: 'var(--yellow)', marginTop: 2 }}>⚠ Thiếu {res.missingFiles.length} file</div>
                  )}
                  {!res.success && <div style={{ color: 'var(--red)', marginTop: 2 }}>{res.error}</div>}
                </div>
              ))}
              {results.every(r => r.res?.success) && (
                <button onClick={() => api?.openFolder(outputFolder)}
                  style={{ fontSize: 12, color: 'var(--accent)', background: 'transparent', textDecoration: 'underline', textAlign: 'left' }}>
                  Mở thư mục xuất →
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={!canExport}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 10,
              fontSize: 15, fontWeight: 700,
              background: canExport
                ? 'linear-gradient(135deg, var(--accent), #c84dff)'
                : 'var(--bg-input)',
              color: canExport ? '#fff' : 'var(--text-muted)',
              cursor: canExport ? 'pointer' : 'not-allowed',
              boxShadow: canExport && !exporting ? '0 4px 20px rgba(124,77,255,0.4)' : 'none',
              transition: 'all 0.3s',
              animation: canExport && !exporting ? 'pulse-glow 2s ease-in-out infinite' : 'none',
            }}
          >
            {exporting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Spinner color="#fff" /> Đang đóng gói...
              </span>
            ) : selectedIds.size > 1
              ? `📦 Xuất ${selectedIds.size} ZIP`
              : selectedIds.size === 1
                ? '📦 Xuất ZIP Package'
                : '📦 Xuất ZIP Package'}
            {!outputFolder && (
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, color: 'var(--red)' }}>
                Chưa chọn thư mục xuất
              </div>
            )}
          </button>
        </Section>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Project Preview</span>
          {projects.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ({filtered.length}/{projects.length})
            </span>
          )}

          {/* Select all */}
          {filtered.length > 0 && (
            <button
              onClick={handleSelectAll}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: allFilteredSelected ? 'var(--accent-light)' : 'var(--bg-input)',
                border: `1px solid ${allFilteredSelected ? 'var(--accent)' : 'var(--border)'}`,
                color: allFilteredSelected ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              {allFilteredSelected ? '✓ Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          )}

          <div style={{ flex: 1 }} />

          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm..."
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '5px 10px', fontSize: 12,
              color: 'var(--text-primary)', width: 150,
            }}
          />
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'var(--text-primary)',
          }}>
            <option value="newest">Lớn nhất</option>
            <option value="name">Tên A-Z</option>
          </select>
          <button onClick={() => loadProjects(capCutFolder)} style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 8px', fontSize: 13, color: 'var(--text-secondary)',
          }}>🔄</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80, fontSize: 14, lineHeight: 2 }}>
              {projects.length === 0
                ? '📂 Không tìm thấy project nào.\nKiểm tra lại đường dẫn thư mục CapCut.'
                : '🔍 Không có project nào khớp.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {filtered.map(p => (
                <ProjectCard
                  key={p.id} project={p}
                  selected={selectedIds.has(p.id)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return (bytes || 0) + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Label({ children, style }) {
  return <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, ...style }}>{children}</div>
}

function FolderInput({ value, onChange, onBrowse, onOpen }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={value} onChange={onChange} style={{
        flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)', minWidth: 0,
      }} />
      <IconBtn onClick={onOpen} title="Mở thư mục">📂</IconBtn>
      <IconBtn onClick={onBrowse} title="Chọn thư mục">🗁</IconBtn>
    </div>
  )
}

function IconBtn({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6,
      padding: '6px 8px', fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >{children}</button>
  )
}

function Spinner({ color = 'var(--accent)' }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      border: `2px solid transparent`,
      borderTopColor: color, borderRightColor: color,
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

const refreshBtnStyle = {
  marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 6,
  fontSize: 12, fontWeight: 500, background: 'var(--bg-input)',
  color: 'var(--text-secondary)', border: '1px solid var(--border)',
}
