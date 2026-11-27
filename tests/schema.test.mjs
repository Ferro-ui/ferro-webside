import test from 'node:test'
import assert from 'node:assert/strict'
import {validateSite, validateProject, checkValue, phone, email, url, image, link} from '../lib/schema.mjs'
import {loadSeed} from './helpers.mjs'
import {checkContent} from '../scripts/build.mjs'

const seed = loadSeed()
const ctx = {projects: seed.projects.map(p => p.slug), categories: seed.site.categories}

test('seeded content is valid', () => {
  assert.deepEqual(validateSite(seed.site, ctx), [])
  for (const p of seed.projects) assert.deepEqual(validateProject(p, {...ctx, fileSlug: p.slug}), [], p.slug)
})

test('bad phone numbers are rejected', () => {
  const def = phone('phone', 'Telefon', {required: true})
  for (const bad of ['abc', '958-37-123', '12', '+47 958 37 123 x', '<b>1</b>']) assert.notEqual(checkValue(def, bad), '', bad)
  for (const good of ['958 37 123', '+47 958 37 123', '95837123']) assert.equal(checkValue(def, good), '', good)
  assert.equal(checkValue(def, ''), 'Fyll ut feltet.')
})

test('bad e-mail addresses are rejected', () => {
  const def = email('email', 'E-post')
  for (const bad of ['vegard', 'vegard@', '@ferrostal.no', 'vegard@ferrostal', 'a b@ferrostal.no', 'x@y.no"><script>']) assert.notEqual(checkValue(def, bad), '', bad)
  assert.equal(checkValue(def, 'vegard@ferrostal.no'), '')
  assert.equal(checkValue(def, ''), '', 'optional field may be empty')
})

test('bad URLs are rejected', () => {
  const def = url('u', 'Adresse')
  for (const bad of ['javascript:alert(1)', 'ferrostal.no', 'ftp://x.no', 'https://', 'data:text/html,hi']) assert.notEqual(checkValue(def, bad), '', bad)
  assert.equal(checkValue(def, 'https://www.facebook.com/profile.php?id=1'), '')
  const nav = link('href', 'Lenke')
  assert.equal(checkValue(nav, '#kontakt'), '')
  assert.notEqual(checkValue(nav, 'javascript:void(0)'), '')
})

test('image paths stay inside assets/ and content/uploads/', () => {
  const def = image('i', 'Bilde')
  assert.equal(checkValue(def, 'content/uploads/hall.webp'), '')
  for (const bad of ['../secret.webp', 'https://evil.test/x.webp', 'content/uploads/../../x.webp', 'assets/x.exe']) assert.notEqual(checkValue(def, bad), '', bad)
})

test('images need a describing text', () => {
  const site = structuredClone(seed.site)
  site.about.heroAlt = ''
  assert.deepEqual(validateSite(site, ctx).map(e => [e.path.join('.'), e.message]), [['about.heroAlt', 'Bildet trenger en kort tekst som beskriver det.']])
})

test('scene start times must go up, and scenes must point at real projects', () => {
  const site = structuredClone(seed.site)
  site.home.scenes[2].start = 1
  site.home.featured[0].project = 'finnes-ikke'
  const errors = validateSite(site, ctx).map(e => e.path.join('.'))
  assert.deepEqual(errors.sort(), ['home.featured.0.project', 'home.scenes.2.start'])
})

test('project rules: slug, category, lengths', () => {
  const p = {...seed.projects[0], slug: 'Ny Hall', category: 'ukjent', title: 'x'.repeat(101)}
  const errors = validateProject(p, ctx).map(e => e.path.join('.'))
  assert.deepEqual(errors.sort(), ['category', 'slug', 'title'])
})

test('the build refuses broken content', () => {
  const projects = seed.projects.map(doc => ({file: `content/projects/${doc.slug}.json`, doc}))
  const site = structuredClone(seed.site)
  site.contact.email = 'ikke-epost'
  const problems = checkContent({site, projects})
  assert.equal(problems.length, 1)
  assert.match(problems[0], /contact\.email/)
})
