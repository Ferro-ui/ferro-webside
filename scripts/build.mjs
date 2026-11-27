// Builds the static site into _site/ from index.html (the template) and content/.
// No dependencies. Usage: node scripts/build.mjs
// GitHub Actions sets GITHUB_REPOSITORY and GITHUB_REF_NAME; locally the defaults are used.

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {renderSite} from '../lib/render.mjs'
import {validateSite, validateProject, formatPath} from '../lib/schema.mjs'
import {SITE_PATH, PROJECT_DIR, publishedProjects, imagePaths, slugFromPath} from '../lib/content.mjs'
import {uploadFamily} from '../lib/views/images.mjs'
import {escape} from '../lib/util.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, process.env.SITE_OUT || '_site')
const repo = process.env.GITHUB_REPOSITORY || 'Ferro-ui/ferro-webside'
const branch = process.env.GITHUB_REF_NAME || 'main'
const abs = file => path.join(root, file)
const readJson = file => JSON.parse(fs.readFileSync(abs(file), 'utf8'))

export function loadContent() {
  const site = readJson(SITE_PATH)
  const files = fs.readdirSync(abs(PROJECT_DIR)).filter(f => f.endsWith('.json')).sort()
  const projects = files.map(f => ({file: PROJECT_DIR + f, doc: readJson(PROJECT_DIR + f)}))
  return {site, projects}
}

export function checkContent({site, projects}) {
  const problems = []
  const categories = site.categories || {}
  const slugs = projects.map(p => p.doc.slug)
  // Links from the home page may only point at projects that are on the site.
  const live = projects.filter(p => p.doc.published === true).map(p => p.doc.slug)
  for (const e of validateSite(site, {projects: live})) problems.push(`${SITE_PATH}: ${formatPath(e.path)}: ${e.message}`)
  for (const {file, doc} of projects) {
    for (const e of validateProject(doc, {categories, fileSlug: slugFromPath(file)})) problems.push(`${file}: ${formatPath(e.path)}: ${e.message}`)
  }
  slugs.filter((s, i) => slugs.indexOf(s) !== i).forEach(s => problems.push(`${PROJECT_DIR}${s}.json: adressen finnes to ganger`))
  return problems
}

function copy(from, to) {
  fs.cpSync(abs(from), path.join(out, to ?? from), {recursive: true, filter: src => !/(^|\/)(\.DS_Store|node_modules)$/.test(src)})
}

function build() {
  const content = loadContent()
  const problems = checkContent(content)
  if (problems.length) {
    console.error('Innholdet har feil, så nettstedet ble ikke bygget:\n' + problems.map(p => '  - ' + p).join('\n'))
    process.exit(1)
  }
  const {site} = content
  const projects = content.projects.map(p => p.doc)
  const template = fs.readFileSync(abs('index.html'), 'utf8')
  const {html, projectsJs} = renderSite(template, {site, projects})

  fs.rmSync(out, {recursive: true, force: true})
  fs.mkdirSync(out, {recursive: true})
  for (const dir of ['assets', 'css', 'js', 'demo']) if (fs.existsSync(abs(dir))) copy(dir)
  fs.writeFileSync(path.join(out, 'index.html'), html)
  fs.writeFileSync(path.join(out, 'js/projects.js'), projectsJs)

  // Only uploads that the published content points at go on the site.
  const used = imagePaths([site, publishedProjects(projects)])
  const missing = []
  let uploads = 0
  for (const image of used) {
    if (!fs.existsSync(abs(image))) { missing.push(image); continue }
    if (!image.startsWith('content/uploads/')) continue
    for (const file of uploadFamily(image)) {
      if (!fs.existsSync(abs(file))) continue
      fs.mkdirSync(path.dirname(path.join(out, file)), {recursive: true})
      fs.copyFileSync(abs(file), path.join(out, file))
      uploads++
    }
  }
  if (missing.length) console.warn('Advarsel: disse bildene finnes ikke i repoet:\n' + missing.map(m => '  - ' + m).join('\n'))

  // Published content as JSON, for the admin's demo mode. It is public in the repo anyway.
  fs.mkdirSync(path.join(out, PROJECT_DIR), {recursive: true})
  fs.copyFileSync(abs(SITE_PATH), path.join(out, SITE_PATH))
  for (const {file} of content.projects) fs.copyFileSync(abs(file), path.join(out, file))
  fs.writeFileSync(path.join(out, 'content/index.json'), JSON.stringify({files: [SITE_PATH, ...content.projects.map(p => p.file)]}, null, 2) + '\n')

  // Admin: plain modules, the shared lib/ and the template for the live preview.
  copy('admin')
  copy('lib')
  fs.copyFileSync(abs('index.html'), path.join(out, 'admin/template.html'))
  fs.writeFileSync(path.join(out, 'admin/config.js'),
    `// Written by scripts/build.mjs.\nexport default ${JSON.stringify({repo, branch, siteUrl: site.settings.siteUrl}, null, 2)}\n`)

  const siteUrl = site.settings.siteUrl
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escape(siteUrl)}</loc><lastmod>${today}</lastmod></url>
</urlset>
`)
  // Search engines only read robots.txt at the root of a domain, so on a
  // project site this file is a stub that starts working with an own domain.
  fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: ${new URL('admin/', siteUrl).pathname}\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`)
  fs.writeFileSync(path.join(out, '.nojekyll'), '')

  const live = publishedProjects(projects).length
  console.log(`Bygget ${path.relative(root, out)}/: ${live} av ${projects.length} prosjekter publisert, ${uploads} opplastede bildefiler, admin for ${repo}@${branch}.`)
}

if (import.meta.url === `file://${process.argv[1]}`) build()
