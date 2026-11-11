// Static internal-link checker.
// Scans source files for literal router links and verifies each one matches a
// route declared in src/App.tsx. Also checks that every asset referenced by
// dist/index.html exists after a build. Run with `npm run check:links`.
import { access, readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = process.cwd()
const src = join(root, 'src')
const dist = join(root, 'dist')

const routePatterns = [
  '/',
  '/sign-in',
  '/register',
  '/choose-role',
  '/privacy',
  '/terms',
  '/driver',
  '/driver/find',
  '/driver/place/:placeId',
  '/driver/book/:placeId',
  '/driver/trip',
  '/driver/wallet',
  '/driver/me',
  '/driver/support',
  '/attendant',
  '/attendant/gate',
  '/attendant/me',
  '/attendant/support',
  '/operator',
  '/operator/lot',
  '/operator/alerts',
  '/operator/log',
  '/operator/cash',
  '/operator/me',
  '/operator/support',
  '/admin',
  '/admin/settings',
  '/admin/analytics',
  '/admin/log',
  '/admin/me',
  '/admin/support',
]

const patterns = routePatterns.map((route) => ({
  route,
  regex: new RegExp(
    `^${route
      .split('/')
      .map((part) => (part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      .join('/')}/?$`,
  ),
}))

function matchesRoute(path) {
  const clean = path.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/'
  return patterns.some((pattern) => pattern.regex.test(clean))
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full)
  }
  return files
}

const files = await walk(src)
const links = new Map()

const patternsToScan = [
  /\bto=["'](\/[^"'`]*)["']/g,
  /\bhref=["'](\/[^"'`]*)["']/g,
  /\bnavigate\(["'](\/[^"'`]*)["']/g,
  /\bredirect\(["'](\/[^"'`]*)["']/g,
]

for (const file of files) {
  const content = await readFile(file, 'utf8')
  for (const pattern of patternsToScan) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(content))) {
      const value = match[1]
      if (!value || value.includes('${') || value.startsWith('//')) continue
      const key = value.split('#')[0].split('?')[0]
      if (!key) continue
      if (!links.has(key)) links.set(key, new Set())
      links.get(key).add(relative(root, file))
    }
  }
}

const broken = []
for (const [link, sources] of [...links.entries()].sort()) {
  if (!matchesRoute(link)) broken.push({ link, sources: [...sources] })
}

console.log(`Checked ${links.size} distinct internal links across ${files.length} source files.`)
for (const [link] of [...links.entries()].sort()) {
  console.log(`  ${matchesRoute(link) ? 'OK  ' : 'MISS'}  ${link}`)
}

if (broken.length > 0) {
  console.error('\nLinks without a matching route:')
  for (const item of broken) console.error(`  ${item.link}  <- ${item.sources.join(', ')}`)
  process.exit(1)
}

// Post-build asset check (optional; skipped before the first build).
let built = false
try {
  await access(join(dist, 'index.html'))
  built = true
} catch {
  console.log('\ndist/index.html not found — skipped built-asset check.')
}

if (built) {
  const html = await readFile(join(dist, 'index.html'), 'utf8')
  const assets = new Set()
  for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]+)"/g)) {
    const value = match[1]
    if (value.startsWith('//')) continue
    assets.add(value)
  }
  const missing = []
  for (const asset of assets) {
    if (!/\.(js|css|png|svg|ico|webmanifest|json|txt|xml)$/.test(asset)) continue
    try {
      await access(join(dist, asset.replace(/^\//, '')))
    } catch {
      missing.push(asset)
    }
  }
  console.log(`\nChecked ${assets.size} built asset references in dist/index.html.`)
  if (missing.length > 0) {
    console.error('Missing built assets:')
    for (const asset of missing) console.error(`  ${asset}`)
    process.exit(1)
  }
}

console.log('\nNo broken internal links found.')
