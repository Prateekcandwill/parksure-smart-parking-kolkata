// WCAG contrast check for ParkSure's design tokens.
// Parses the CSS custom properties in src/styles/index.css, blends translucent
// surfaces, and verifies the text pairs used across the app. Run with
// `npm run check:contrast`. Exits non-zero when a pair falls below its target.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const cssPath = join(process.cwd(), 'src', 'styles', 'index.css')
const css = await readFile(cssPath, 'utf8')

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))
  if (!match) throw new Error(`Could not find CSS block ${selector}`)
  const tokens = {}
  for (const line of match[1].split('\n')) {
    const token = line.match(/--([\w-]+):\s*([\d]+)\s+([\d]+)\s+([\d]+)\s*;/)
    if (token) tokens[token[1]] = [Number(token[2]), Number(token[3]), Number(token[4])]
  }
  return tokens
}

const themes = {
  dark: block(':root'),
  light: block("[data-theme='light']"),
}

// Operator workspaces override the accent with violet.
const violet = block("[data-accent='violet']")

function channel(value) {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function blend(fg, bg, alpha) {
  return fg.map((value, index) => Math.round(value * alpha + bg[index] * (1 - alpha)))
}

function rgb(value) {
  return `rgb(${value.join(' ')})`
}

const checks = []
function add(themeName, label, fg, bg, target = 4.5) {
  checks.push({ theme: themeName, label, fg, bg, target, value: ratio(fg, bg) })
}

for (const [themeName, tokens] of Object.entries(themes)) {
  const ink = tokens.ink
  const surface = tokens.surface
  const raised = tokens.raised

  add(themeName, 'text on ink', tokens.text, ink)
  add(themeName, 'text on surface', tokens.text, surface)
  add(themeName, 'text on raised', tokens.text, raised)
  add(themeName, 'muted on ink', tokens.muted, ink)
  add(themeName, 'muted on surface', tokens.muted, surface)
  add(themeName, 'muted on raised', tokens.muted, raised)
  add(themeName, 'accent-ink on accent', tokens['accent-ink'], tokens.accent)
  add(themeName, 'accent text on ink', tokens.accent, ink)
  add(themeName, 'success text on ink', tokens.success, ink)
  add(themeName, 'warning text on ink', tokens.warning, ink)
  add(themeName, 'danger text on ink', tokens.danger, ink)
  add(themeName, 'info text on ink', tokens.info, ink)
  add(themeName, 'success text on surface', tokens.success, surface)
  add(themeName, 'danger text on surface', tokens.danger, surface)
  add(themeName, 'muted on accent 8%', tokens.muted, blend(tokens.accent, ink, 0.08))
  add(themeName, 'text on accent 12%', tokens.text, blend(tokens.accent, ink, 0.12))
  add(themeName, 'placeholder (muted) on raised', tokens.muted, raised)
  add(themeName, 'line vs surface (decorative hairline)', tokens.line, surface, 1)
}

const violetAccent = violet.accent ?? themes.dark.violet
const violetInk = violet['accent-ink'] ?? [255, 255, 255]
add('violet', 'accent-ink on violet accent', violetInk, violetAccent)
add('violet', 'violet accent text on dark ink', violetAccent, themes.dark.ink)

const failures = checks.filter((check) => check.value < check.target)

for (const check of checks) {
  const status = check.value >= check.target ? 'PASS' : 'FAIL'
  const value = check.value.toFixed(2)
  console.log(
    `${status}  ${check.theme.padEnd(5)}  ${value.padStart(5)}:1  ${check.label}  (target ${check.target}:1)  ${rgb(check.fg)} on ${rgb(check.bg)}`,
  )
}

console.log(`\n${checks.length - failures.length}/${checks.length} contrast checks passed.`)

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast check(s) failed.`)
  process.exit(1)
}
