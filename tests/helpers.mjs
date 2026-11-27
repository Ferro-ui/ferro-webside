import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const read = file => fs.readFileSync(path.join(root, file), 'utf8')
export const readJson = file => JSON.parse(read(file))

export function loadSeed() {
  const site = readJson('content/site.json')
  const projects = fs.readdirSync(path.join(root, 'content/projects')).filter(f => f.endsWith('.json'))
    .map(f => readJson('content/projects/' + f))
  return {site, projects}
}

// Whitespace between and inside tags does not change what the visitor sees.
export const normalise = html => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()

export function screen(html, name) {
  const m = html.match(new RegExp(`<div class="screen[^"]*" data-screen="${name}"[^>]*>([\\s\\S]*?)\\n    </div>\\s*(<!--|</main>)`))
  if (!m) throw new Error('screen not found: ' + name)
  return normalise(m[1])
}
export const region = (html, re) => normalise(html.match(re)[0])

// The site as it was before content/ existed: the template's own text and js/projects.js.
export function originalProjects() {
  const source = read('js/projects.js')
  return {
    categories: JSON.parse(source.match(/const projectCategories = ([\s\S]*?);/)[1]),
    projects: JSON.parse(source.slice(source.indexOf('const ferroProjects = ') + 22).trim().replace(/;$/, '')),
  }
}
