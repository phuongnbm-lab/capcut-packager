import React, { useEffect, useState } from 'react'

export default function ProjectCard({ project, selected, onToggle, onDelete }) {
  const [imgSrc, setImgSrc] = useState(null)

  useEffect(() => {
    if (!project.coverPath) return
    window.electronAPI?.getImageBase64(project.coverPath).then(src => {
      if (src) setImgSrc(src)
    })
  }, [project.coverPath])

  return (
    <div
      onClick={() => onToggle(project)}
      style={{
        background: selected ? 'var(--accent-light)' : 'var(--bg-card)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        flexShrink: 0,
        width: 160,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--accent-hover)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = selected ? 'var(--accent)' : 'var(--border)' }}
    >
      {/* Checkmark badge */}
      <div style={{
        position: 'absolute', top: 7, right: 7, zIndex: 2,
        width: 20, height: 20, borderRadius: '50%',
        background: selected ? 'var(--accent)' : 'rgba(0,0,0,0.45)',
        border: `2px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#fff', fontWeight: 700,
        transition: 'all 0.15s',
        boxShadow: selected ? '0 0 8px rgba(124,77,255,0.6)' : 'none',
      }}>
        {selected ? '✓' : ''}
      </div>

      {/* Thumbnail */}
      <div style={{
        width: '100%', height: 100,
        background: 'var(--bg-input)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {imgSrc ? (
          <img src={imgSrc} alt={project.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ fontSize: 28, color: 'var(--text-muted)' }}>🎬</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontWeight: 600, fontSize: 12, color: 'var(--text-primary)',
          marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{project.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
          <span>{project.size}</span>
          <span>{project.modifiedAt}</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--green)',
            background: 'var(--green-light)', padding: '2px 6px', borderRadius: 4,
          }}>HỢP LỆ</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete?.(project) }}
            title="Xóa project"
            style={{
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 13, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--red)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >🗑</button>
        </div>
      </div>
    </div>
  )
}
