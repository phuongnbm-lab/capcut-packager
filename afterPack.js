const { rcedit } = require('rcedit')
const path = require('path')

exports.default = async function(context) {
  if (context.electronPlatformName !== 'win32') return
  const exePath = path.join(context.appOutDir, 'CapCut Packager.exe')
  const iconPath = path.join(__dirname, 'icon.ico')
  await rcedit(exePath, { icon: iconPath })
  console.log('  • icon injected via rcedit')
}
