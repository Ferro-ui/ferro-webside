// One-off: reads today's index.html and js/projects.js and writes content/.
// Kept for reference and for rebuilding the seed; running it overwrites content/.
// Usage: node scripts/seed.mjs [--force]

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {toFileText} from '../lib/util.mjs'
import {SITE_PATH, projectPath} from '../lib/content.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
if (fs.existsSync(path.join(root, SITE_PATH)) && !process.argv.includes('--force')) {
  console.error('content/site.json finnes allerede. Bruk --force for å overskrive.')
  process.exit(1)
}

const html = read('index.html')
const source = read('js/projects.js')
const categories = JSON.parse(source.match(/const projectCategories = ([\s\S]*?);/)[1])
const projects = JSON.parse(source.slice(source.indexOf('const ferroProjects = ') + 22).trim().replace(/;$/, ''))

const decode = s => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
const one = (re, text = html) => { const m = text.match(re); if (!m) throw new Error('Fant ikke ' + re); return decode(m[1]) }
const all = (re, text) => [...text.matchAll(re)]
const screen = name => html.match(new RegExp(`<div class="screen[^"]*" data-screen="${name}"[^>]*>([\\s\\S]*?)\\n    </div>\\s*(<!--|</main>)`))[1]

const home = screen('home'), about = screen('omoss'), kontakt = screen('kontakt')

const nav = all(/<a href="([^"]+)"(?: data-nav="\w+")?>([^<]+)<\/a>/g, html.match(/<nav id="ferro-menu"[^>]*>([\s\S]*?)<\/nav>/)[1])
  .map(m => ({label: decode(m[2]), href: m[1]}))

// Drone film scenes: the defaults in js/home-2026.js plus the chapter labels in the markup.
const film = read('js/home-2026.js')
const labels = all(/<button type="button" data-chapter="\d+"[^>]*>([^<]+)<\/button>/g, home).map(m => decode(m[1]))
const scenes = all(/\{start:([\d.]+), title:'([^']+)', slug:'([^']+)', photo:'([^']+)'\}/g, film)
  .map((m, i) => ({project: m[3], label: labels[i], start: Number(m[1]), title: m[2], image: `assets/flight/${m[4]}.webp`}))

const featured = all(/<article class="h26-project">([\s\S]*?)<\/article>/g, home).map(([, card]) => ({
  project: one(/href="#prosjekt\/([^"]+)"/, card),
  title: one(/<h3>([^<]*)<\/h3>/, card),
  meta: one(/<p class="h26-metadata">([^<]*)<\/p>/, card),
  text: one(/<\/h3>\s*<p>([^<]*)<\/p>/, card),
  image: one(/<img src="([^"]+)"/, card),
  alt: one(/ alt="([^"]*)"/, card),
}))

const site = {
  settings: {
    siteUrl: 'https://ferro-ui.github.io/ferro-webside/',
    title: one(/<title>([^<]*)<\/title>/),
    description: one(/<meta name="description" content="([^"]*)">/),
    ogImage: 'assets/img/hero-drone-v4-poster-1080.webp',
    ogImageAlt: 'Dronebilde av et stålbygg fra Ferro i Telemark',
  },
  nav,
  home: {
    heading: one(/<div class="flight-intro h26-shell">\s*<h1>([^<]*)<\/h1>/, home),
    intro: one(/<div class="flight-intro h26-shell">\s*<h1>[^<]*<\/h1>\s*<p>([^<]*)<\/p>/, home),
    scenes,
    featured,
  },
  about: {
    heading: one(/<h1>([^<]*)<\/h1>/, about),
    intro: one(/<\/div>\s*<p>([^<]*)<\/p>\s*<\/header>/, about),
    heroImage: one(/class="h26-detail-hero[^"]*" src="([^"]+)"/, about),
    heroAlt: one(/class="h26-detail-hero[^"]*"[^>]* alt="([^"]*)"/, about),
    teamHeading: one(/<h2 id="h26-team-title">([^<]*)<\/h2>/, about),
    teamIntro: one(/<h2 id="h26-team-title">[^<]*<\/h2>\s*<p>([^<]*)<\/p>/, about),
    people: all(/<article class="h26-person">([\s\S]*?)<\/article>/g, about).map(([, p]) => ({
      name: one(/<h3>([^<]*)<\/h3>/, p), role: one(/<\/h3>\s*<p>([^<]*)<\/p>/, p),
      email: one(/href="mailto:([^"]+)"/, p), phone: one(/href="tel:[^"]+">([^<]+)<\/a>/, p), photo: one(/<img src="([^"]+)"/, p),
    })),
    joinTitle: one(/<div class="h26-team-join">\s*<p><strong>([^<]*)<\/strong>/, about),
    joinText: one(/<div class="h26-team-join">\s*<p><strong>[^<]*<\/strong>([^<]*)<\/p>/, about),
    joinEmail: one(/<div class="h26-team-join">[\s\S]*?href="mailto:([^"]+)"/, about),
    officeHeading: one(/class="office-photo"[^>]*><div><h2>([^<]*)<\/h2>/, about),
    officeText: one(/class="office-photo"[^>]*><div><h2>[^<]*<\/h2><p>([^<]*)<\/p>/, about),
    officePhoto: one(/class="office-photo" src="([^"]+)"/, about),
    officeAlt: one(/class="office-photo"[^>]* alt="([^"]*)"/, about),
    partnersHeading: one(/<div><h2>([^<]*)<\/h2><p>[^<]*<\/p><\/div><ul class="h26-build-list">/, about),
    partnersText: one(/<div><h2>[^<]*<\/h2><p>([^<]*)<\/p><\/div><ul class="h26-build-list">/, about),
    partners: all(/<li>([^<]*)<\/li>/g, about.match(/<ul class="h26-build-list">([\s\S]*?)<\/ul>/)[1]).map(m => decode(m[1])),
    closingHeading: one(/<h2 id="h26-omoss-contact-title">([^<]*)<\/h2>/, about),
    closingText: one(/<h2 id="h26-omoss-contact-title">[^<]*<\/h2><p>([^<]*)<\/p>/, about),
  },
  contact: {
    heading: one(/<h1>([^<]*)<\/h1>/, kontakt),
    intro: one(/<\/div>\s*<p>([^<]*)<\/p>\s*<\/header>/, kontakt),
    phone: one(/<dt>Telefon<\/dt><dd><a [^>]*>([^<]+)<\/a>/, kontakt),
    email: one(/<dt>E-post<\/dt><dd><a [^>]*>([^<]+)<\/a>/, kontakt),
    address: one(/<dt>Adresse<\/dt><dd><a [^>]*>([^<]+?) ↗<\/a>/, kontakt),
    orgNr: one(/<dt>Org\.nr\.<\/dt><dd>([^<]+)<\/dd>/, kontakt),
    facebookUrl: one(/<dt>Facebook<\/dt><dd><a href="([^"]+)"/, kontakt),
    brochureUrl: one(/<dt>Brosjyre<\/dt><dd><a href="([^"]+)"/, kontakt),
    privacyUrl: one(/henvendelsen\. <a href="([^"]+)"/, kontakt),
    formTitle: one(/<h2 class="h26-form-title">([^<]*)<\/h2>/, kontakt),
    formIntro: one(/<p class="form-intro">([^<]*)<\/p>/, kontakt),
    buildingTypes: all(/<option>([^<]+)<\/option>/g, kontakt.match(/<select name="byggtype">([\s\S]*?)<\/select>/)[1]).map(m => decode(m[1])),
  },
  categories,
}

fs.mkdirSync(path.join(root, 'content/projects'), {recursive: true})
fs.writeFileSync(path.join(root, SITE_PATH), toFileText(site))
projects.forEach((p, i) => {
  const doc = {
    slug: p.slug, published: true, order: (i + 1) * 10, category: p.category, title: p.title, sted: p.sted, lead: p.lead,
    headline: p.headline || '', hero: p.hero || '', heroAlt: p.hero ? `${p.title} i ${p.sted}` : '',
    body: p.body || [], specs: p.specs || [], client: p.client || '', byggetid: p.byggetid || '',
    facts: Object.entries(p.facts || {}).map(([label, value]) => ({label, value})),
    gallery: p.gallery || [], quote: p.quote || {text: '', name: '', org: ''},
  }
  fs.writeFileSync(path.join(root, projectPath(p.slug)), toFileText(doc))
})
console.log(`Skrev ${SITE_PATH} og ${projects.length} prosjekter.`)
