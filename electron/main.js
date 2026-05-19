const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const archiver = require('archiver')
const AdmZip = require('adm-zip')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f1a',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  globalShortcut.register('Control+Q', () => app.quit())
})
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

ipcMain.handle('close-window', () => BrowserWindow.getAllWindows()[0]?.close())
ipcMain.handle('minimize-window', () => BrowserWindow.getAllWindows()[0]?.minimize())
ipcMain.handle('maximize-window', () => {
  const win = BrowserWindow.getAllWindows()[0]
  win?.isMaximized() ? win.unmaximize() : win?.maximize()
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultCapCutPath() {
  const home = os.homedir()
  const local = path.join(home, 'AppData', 'Local')

  if (process.platform === 'win32') {
    const candidates = [
      // CapCut PC (phổ biến nhất)
      path.join(local, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      // CapCut PC variant
      path.join(local, 'CapCut PC', 'User Data', 'Projects', 'com.lveditor.draft'),
      // JianYing (tên gốc tiếng Trung)
      path.join(local, 'JianyingPro', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(local, 'JianYing', 'User Data', 'Projects', 'com.lveditor.draft'),
      // Microsoft Store version
      path.join(home, 'AppData', 'Local', 'Packages', 'BytedancePte.Ltd.CapCut_2t6kar2ac8bsa', 'LocalCache', 'Local', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      // Roaming fallback
      path.join(home, 'AppData', 'Roaming', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      // Ổ D, E phòng trường hợp cài custom
      'D:\\CapCut\\User Data\\Projects\\com.lveditor.draft',
      'E:\\CapCut\\User Data\\Projects\\com.lveditor.draft',
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate
    }

    // Fallback: scan tất cả thư mục trong %LOCALAPPDATA% tìm com.lveditor.draft
    try {
      for (const dir of fs.readdirSync(local)) {
        const p = path.join(local, dir, 'User Data', 'Projects', 'com.lveditor.draft')
        if (fs.existsSync(p)) return p
      }
    } catch {}

    // Trả về path mặc định dù không tồn tại (user sẽ tự browse)
    return candidates[0]
  }

  // macOS
  const macCandidates = [
    path.join(home, 'Movies', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
    path.join(home, 'Library', 'Application Support', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
  ]
  for (const c of macCandidates) {
    if (fs.existsSync(c)) return c
  }
  return macCandidates[0]
}

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) }
  catch { return null }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function getMetaInfoPath(projectDir) {
  const meta = path.join(projectDir, 'draft_meta_info.json')
  const info = path.join(projectDir, 'draft_info.json')
  return fs.existsSync(meta) ? meta : fs.existsSync(info) ? info : null
}

function calcDirSize(dir) {
  let total = 0
  const walk = (d) => {
    try {
      for (const f of fs.readdirSync(d)) {
        const fp = path.join(d, f)
        try {
          const st = fs.statSync(fp)
          st.isDirectory() ? walk(fp) : (total += st.size)
        } catch {}
      }
    } catch {}
  }
  walk(dir)
  return total
}

/**
 * Collect all media that needs to be bundled for a project:
 * 1. The entire project folder (all files recursively) — covers Resources/local, subdraft, etc.
 * 2. External media referenced in draft_meta_info.json's draft_materials (absolute paths outside project)
 *
 * Returns { projectFiles, externalFound, externalMissing }
 */
function collectProjectMedia(projectDir) {
  const metaPath = getMetaInfoPath(projectDir)
  const meta = metaPath ? readJsonSafe(metaPath) : null

  // --- 1. All files inside the project folder ---
  const projectFiles = []
  const walkProject = (dir, relBase) => {
    try {
      for (const entry of fs.readdirSync(dir)) {
        const abs = path.join(dir, entry)
        const rel = relBase ? `${relBase}/${entry}` : entry
        try {
          const st = fs.statSync(abs)
          if (st.isDirectory()) walkProject(abs, rel)
          else projectFiles.push({ abs, rel, size: st.size })
        } catch {}
      }
    } catch {}
  }
  walkProject(projectDir, '')

  // --- 2. External media from draft_materials ---
  const externalFound = []
  const externalMissing = []

  if (meta && Array.isArray(meta.draft_materials)) {
    for (const group of meta.draft_materials) {
      if (!Array.isArray(group.value)) continue
      for (const item of group.value) {
        const fp = item.file_Path || item.filePath || item.path || ''
        if (!fp) continue
        // Skip relative paths (already in project folder) and CapCut cache/effect paths
        if (fp.startsWith('./') || fp.startsWith('../') || fp.startsWith('##_draftpath')) continue
        if (/AppData[/\\]Local[/\\]CapCut[/\\]User Data[/\\]Cache/i.test(fp)) continue

        // This is an external user media file (absolute path)
        const absPath = fp.replace(/\//g, path.sep)
        if (fs.existsSync(absPath)) {
          externalFound.push({
            abs: absPath,
            rel: `external_media/${path.basename(absPath)}`,
            name: path.basename(absPath),
            originalPath: fp,
            size: fs.statSync(absPath).size,
          })
        } else {
          externalMissing.push({ name: path.basename(absPath), originalPath: fp })
        }
      }
    }
  }

  return { projectFiles, externalFound, externalMissing }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

ipcMain.handle('get-default-capcut-path', () => getDefaultCapCutPath())

ipcMain.handle('select-folder', async () => {
  const win = BrowserWindow.getAllWindows()[0]
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('select-file', async () => {
  const win = BrowserWindow.getAllWindows()[0]
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
  })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('open-folder', (_, folderPath) => shell.openPath(folderPath))

ipcMain.handle('get-disk-space', async (_, folderPath) => {
  try {
    // Use wmic on Windows, df on Unix
    if (process.platform === 'win32') {
      const driveLetter = folderPath.slice(0, 2).toUpperCase() // e.g. "D:"
      const { execSync } = require('child_process')
      const out = execSync(`wmic logicaldisk where "DeviceID='${driveLetter}'" get FreeSpace,Size /format:csv`, { encoding: 'utf-8' })
      const lines = out.trim().split('\n').filter(l => l.includes(','))
      const parts = lines[lines.length - 1].trim().split(',')
      const free = parseInt(parts[1])
      const total = parseInt(parts[2])
      return { free, total, drive: driveLetter }
    } else {
      const { execSync } = require('child_process')
      const out = execSync(`df -k "${folderPath}"`, { encoding: 'utf-8' })
      const line = out.trim().split('\n')[1].split(/\s+/)
      return { free: parseInt(line[3]) * 1024, total: parseInt(line[1]) * 1024, drive: line[0] }
    }
  } catch { return null }
})

ipcMain.handle('get-image-base64', (_, filePath) => {
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mime};base64,${data.toString('base64')}`
  } catch { return null }
})

ipcMain.handle('get-projects', (_, folder) => {
  if (!folder || !fs.existsSync(folder)) return []
  let entries
  try { entries = fs.readdirSync(folder) } catch { return [] }

  const projects = []
  for (const entry of entries) {
    const projectDir = path.join(folder, entry)
    try { if (!fs.statSync(projectDir).isDirectory()) continue } catch { continue }

    const metaPath = getMetaInfoPath(projectDir)
    if (!metaPath) continue

    const info = readJsonSafe(metaPath)
    if (!info) continue

    // Cover image
    let coverPath = null
    if (info.draft_cover) {
      const coverAbs = path.isAbsolute(info.draft_cover)
        ? info.draft_cover
        : path.join(projectDir, info.draft_cover)
      if (fs.existsSync(coverAbs)) coverPath = coverAbs
    }
    if (!coverPath) {
      const imgs = (fs.readdirSync(projectDir) || []).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      if (imgs.length) coverPath = path.join(projectDir, imgs[0])
    }

    const sizeBytes = calcDirSize(projectDir)

    projects.push({
      id: entry,
      name: info.draft_name || entry,
      path: projectDir,
      coverPath,
      size: formatSize(sizeBytes),
      sizeBytes,
      modifiedAt: info.tm_draft_modified
        ? new Date(info.tm_draft_modified / 1000).toLocaleDateString('vi-VN')
        : new Date(fs.statSync(projectDir).mtime).toLocaleDateString('vi-VN'),
      hasContent: fs.existsSync(path.join(projectDir, 'draft_content.json')),
    })
  }
  return projects.sort((a, b) => b.sizeBytes - a.sizeBytes)
})

ipcMain.handle('analyze-project', (_, projectPath) => {
  const { projectFiles, externalFound, externalMissing } = collectProjectMedia(projectPath)

  const projectSize = projectFiles.reduce((s, f) => s + f.size, 0)
  const externalSize = externalFound.reduce((s, f) => s + f.size, 0)
  const totalSize = projectSize + externalSize

  return {
    totalFound: projectFiles.length + externalFound.length,
    totalMissing: externalMissing.length,
    totalSize: formatSize(totalSize),
    totalSizeBytes: totalSize,
    projectFileCount: projectFiles.length,
    externalFound: externalFound.map(f => ({ name: f.name, size: formatSize(f.size) })),
    missing: externalMissing,
  }
})

ipcMain.handle('export-project', async (event, projectPath, outputFolder) => {
  const win = BrowserWindow.getAllWindows()[0]

  try {
    const metaPath = getMetaInfoPath(projectPath)
    const info = metaPath ? readJsonSafe(metaPath) || {} : {}
    const safeName = (info.draft_name || path.basename(projectPath)).replace(/[\\/:*?"<>|]/g, '_')
    const zipName = `${safeName}_${Date.now()}.zip`
    const zipPath = path.join(outputFolder, zipName)

    const { projectFiles, externalFound, externalMissing } = collectProjectMedia(projectPath)

    const allFiles = [
      ...projectFiles.map(f => ({ abs: f.abs, zipPath: `project/${f.rel}`, name: f.rel })),
      ...externalFound.map(f => ({ abs: f.abs, zipPath: f.rel, name: f.name })),
    ]

    const total = allFiles.length
    let done = 0

    // Build manifest for relinking on import
    const manifest = {
      projectName: info.draft_name || path.basename(projectPath),
      draftFoldPath: info.draft_fold_path || projectPath,
      externalMedia: externalFound.map(f => ({ name: f.name, originalPath: f.originalPath })),
      missingMedia: externalMissing,
    }

    return await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 6 } })

      output.on('close', () => {
        resolve({
          success: true,
          zipPath,
          zipName,
          totalFiles: total,
          missingFiles: externalMissing.map(f => f.name),
          zipSize: formatSize(archive.pointer()),
        })
      })
      archive.on('error', err => reject({ success: false, error: err.message }))
      archive.pipe(output)

      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

      // Put cover image at root for quick preview
      const coverSrc = path.join(projectPath, 'draft_cover.jpg')
      if (fs.existsSync(coverSrc)) {
        archive.file(coverSrc, { name: 'cover.jpg' })
      }

      for (const file of allFiles) {
        archive.file(file.abs, { name: file.zipPath })
        done++
        win.webContents.send('export-progress', {
          current: done,
          total,
          file: path.basename(file.abs),
          percent: Math.round((done / total) * 100),
        })
      }

      archive.finalize()
    })
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('download-and-install-update', async (event, downloadUrl) => {
  const win = BrowserWindow.getAllWindows()[0]
  const tmpPath = path.join(os.tmpdir(), 'CapCutPackagerUpdate.exe')
  const { net } = require('electron')
  const { spawn } = require('child_process')

  try {
    await new Promise((resolve, reject) => {
      const request = net.request(downloadUrl)
      const file = fs.createWriteStream(tmpPath)
      let done = 0
      let total = 0

      request.on('response', (response) => {
        total = parseInt(response.headers['content-length'] || '0')

        response.on('data', (chunk) => {
          done += chunk.length
          file.write(chunk)
          if (total > 0) win.webContents.send('update-download-progress', {
            percent: Math.round((done / total) * 100), done, total,
          })
        })

        response.on('end', () => file.close(resolve))
        response.on('error', (err) => { file.close(); reject(err) })
      })

      request.on('error', (err) => { file.close(); reject(err) })
      request.end()
    })

    // PowerShell: run installer silently, WAIT for it to finish, then launch new app
    const appExe = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'CapCut Packager', 'CapCut Packager.exe')
    const psCmd = `Start-Process -FilePath '${tmpPath.replace(/'/g, "''")}' -ArgumentList '/S' -Wait; Start-Sleep -Seconds 1; Start-Process -FilePath '${appExe.replace(/'/g, "''")}'`
    spawn('powershell.exe', ['-WindowStyle', 'Hidden', '-NonInteractive', '-Command', psCmd], {
      detached: true, stdio: 'ignore',
    }).unref()
    setTimeout(() => app.quit(), 800)
    return { success: true }
  } catch (err) {
    try { fs.unlinkSync(tmpPath) } catch {}
    return { success: false, error: err.message }
  }
})

ipcMain.handle('import-project', async (event, zipPath, targetFolder) => {
  const win = BrowserWindow.getAllWindows()[0]
  try {
    const zip = new AdmZip(zipPath)
    const entries = zip.getEntries()
    const total = entries.length
    let done = 0

    const manifestEntry = zip.getEntry('manifest.json')
    const manifest = manifestEntry
      ? JSON.parse(manifestEntry.getData().toString('utf-8'))
      : { externalMedia: [] }

    const projectName = (manifest.projectName || 'imported').replace(/[\\/:*?"<>|]/g, '_')
    const projectDir = path.join(targetFolder, `${projectName}_${Date.now()}`)
    fs.mkdirSync(projectDir, { recursive: true })

    const externalMediaDir = path.join(projectDir, 'Resources', 'imported')
    const newPaths = {}

    for (const entry of entries) {
      if (entry.isDirectory) continue
      if (entry.entryName === 'manifest.json') { done++; continue }

      if (entry.entryName.startsWith('project/')) {
        const rel = entry.entryName.slice('project/'.length)
        const dest = path.join(projectDir, rel)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.writeFileSync(dest, entry.getData())
      } else if (entry.entryName.startsWith('external_media/')) {
        const fname = path.basename(entry.entryName)
        fs.mkdirSync(externalMediaDir, { recursive: true })
        const dest = path.join(externalMediaDir, fname)
        fs.writeFileSync(dest, entry.getData())
        newPaths[fname] = dest
      }

      done++
      win.webContents.send('import-progress', {
        current: done, total,
        file: entry.entryName,
        percent: Math.round((done / total) * 100),
      })
    }

    // Relink external media in draft_meta_info.json
    const metaPath = path.join(projectDir, 'draft_meta_info.json')
    if (fs.existsSync(metaPath) && manifest.externalMedia?.length) {
      let metaStr = fs.readFileSync(metaPath, 'utf-8')
      for (const { name, originalPath } of manifest.externalMedia) {
        if (newPaths[name] && originalPath) {
          const newAbs = newPaths[name].replace(/\\/g, '/')
          metaStr = metaStr.split(originalPath).join(newAbs)
        }
      }
      fs.writeFileSync(metaPath, metaStr, 'utf-8')
    }

    // Update draft_fold_path in meta to new location
    if (fs.existsSync(metaPath)) {
      let metaStr = fs.readFileSync(metaPath, 'utf-8')
      if (manifest.draftFoldPath) {
        const newFoldPath = projectDir.replace(/\\/g, '/')
        metaStr = metaStr.split(manifest.draftFoldPath.replace(/\\/g, '/')).join(newFoldPath)
      }
      fs.writeFileSync(metaPath, metaStr, 'utf-8')
    }

    return { success: true, projectDir, projectName }
  } catch (err) {
    return { success: false, error: err.message }
  }
})
