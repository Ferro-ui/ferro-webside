// Where content lives in the repo and how it turns into what the site's scripts expect.

export const SITE_PATH = 'content/site.json'
export const PROJECT_DIR = 'content/projects/'
export const DRAFT_DIR = 'content/drafts/'
export const UPLOAD_DIR = 'content/uploads/'

export const projectPath = slug => PROJECT_DIR + slug + '.json'
export const draftPathFor = path => path.replace(/^content\//, DRAFT_DIR)
export const publishedPathFor = draftPath => draftPath.replace(DRAFT_DIR, 'content/')
export const isProjectPath = path => path.startsWith(PROJECT_DIR) && path.endsWith('.json')
export const slugFromPath = path => path.slice(path.lastIndexOf('/') + 1, -'.json'.length)

export const sortProjects = list => [...list].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.title).localeCompare(String(b.title), 'nb'))
export const publishedProjects = list => sortProjects(list.filter(p => p && p.published === true))

const filled = value => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)

// Shape used by js/app.js (window.ferroProjects). Empty fields are left out so
// the site's "if (d.gallery)" style checks keep working.
export function clientProject(doc, img = x => x) {
  const out = {}
  const put = (key, value) => { if (filled(value)) out[key] = value }
  put('slug', doc.slug)
  put('category', doc.category)
  put('sted', doc.sted)
  put('title', doc.title)
  put('lead', doc.lead)
  put('hero', doc.hero ? img(doc.hero) : '')
  put('heroAlt', doc.heroAlt)
  put('gallery', (doc.gallery || []).filter(Boolean).map(img))
  put('specs', (doc.specs || []).filter(Boolean))
  put('client', doc.client)
  put('byggetid', doc.byggetid)
  if (doc.quote?.text) out.quote = {text: doc.quote.text, name: doc.quote.name || '', org: doc.quote.org || ''}
  const facts = (doc.facts || []).filter(row => row?.label)
  if (facts.length) out.facts = Object.fromEntries(facts.map(row => [row.label, row.value || '']))
  put('headline', doc.headline)
  put('body', (doc.body || []).filter(Boolean))
  return out
}

// A blank project for the "Nytt prosjekt" button.
export function newProject(slug, category, order) {
  return {slug, published: false, order, category, title: '', sted: '', lead: '', headline: '', hero: '', heroAlt: '',
    body: [], specs: [], client: '', byggetid: '', facts: [], gallery: [], quote: {text: '', name: '', org: ''}}
}

// Every image path a piece of content points at (used to copy only used uploads).
export function imagePaths(value, out = new Set()) {
  if (typeof value === 'string') { if (/^(assets|content\/uploads)\/.+\.(webp|jpe?g|png|svg|avif)$/i.test(value)) out.add(value) }
  else if (Array.isArray(value)) value.forEach(v => imagePaths(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach(v => imagePaths(v, out))
  return out
}
