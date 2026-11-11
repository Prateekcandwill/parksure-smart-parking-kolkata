// Post-build step: make static hosts serve the SPA shell for unknown routes.
// GitHub Pages uses 404.html; Netlify/Vercel use the redirect rules committed
// in public/_redirects and vercel.json.
import { copyFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const index = join(dist, 'index.html')
const notFound = join(dist, '404.html')

try {
  await access(index)
} catch {
  console.error('postbuild: dist/index.html is missing. Run `npm run build` first.')
  process.exit(1)
}

await copyFile(index, notFound)
console.log('postbuild: copied dist/index.html -> dist/404.html (SPA fallback)')
