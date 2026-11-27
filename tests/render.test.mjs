import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {renderSite} from '../lib/render.mjs'
import {homeScenes} from '../lib/views/home.mjs'
import {publishedProjects} from '../lib/content.mjs'
import {read, loadSeed, screen, region, originalProjects} from './helpers.mjs'

const template = read('index.html')
const seed = loadSeed()
const {html, projectsJs} = renderSite(template, seed)

for (const name of ['home', 'prosjekter', 'prosjekt', 'omoss', 'kontakt']) {
  test(`screen "${name}" rendered from seeded content equals today's site`, () => {
    assert.equal(screen(html, name), screen(template, name))
  })
}

test('header menu and footer equal today\'s site', () => {
  assert.equal(region(html, /<header class="h26-header[\s\S]*?<\/header>/), region(template, /<header class="h26-header[\s\S]*?<\/header>/))
  assert.equal(region(html, /<footer[\s\S]*?<\/footer>/), region(template, /<footer[\s\S]*?<\/footer>/))
})

test('generated js/projects.js holds the same projects as today', () => {
  const ctx = {}
  vm.runInNewContext(projectsJs + ';this.c=projectCategories;this.p=ferroProjects', ctx)
  const original = originalProjects()
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.c)), original.categories)
  const withoutAlt = JSON.parse(JSON.stringify(ctx.p)).map(({heroAlt, ...rest}) => rest)
  assert.deepEqual(withoutAlt, original.projects)
})

test('drone film scenes match the defaults in js/home-2026.js', () => {
  const scenes = homeScenes(seed.site.home, publishedProjects(seed.projects))
  assert.deepEqual(scenes.map(s => [s.start, s.label, s.slug, s.image]), [
    [0, 'Dalen', 'tokke-teknologipark', 'assets/flight/tokke.webp'],
    [3.29, 'Nome', 'skiensvegen-740', 'assets/flight/nome.webp'],
    [7.31, 'Bø', 'folkestadvegen-3', 'assets/flight/bo.webp'],
    [11.66, 'Lunde', 'coop-extra-lunde', 'assets/flight/lunde.webp'],
  ])
  assert.match(html, /window\.ferroHomeScenes=\[\{"start":0,"label":"Dalen"/)
})

test('head gets SEO and Open Graph tags with absolute URLs', () => {
  assert.match(html, /<title>Stålbygg for næring og landbruk \| Ferro Stålentreprenør<\/title>/)
  assert.match(html, /<meta property="og:image" content="https:\/\/ferro-ui\.github\.io\/ferro-webside\/assets\/img\/hero-drone-v4-poster-1080\.webp">/)
  assert.match(html, /<link rel="canonical" href="https:\/\/ferro-ui\.github\.io\/ferro-webside\/">/)
})

test('unpublished projects and their cards leave the site', () => {
  const projects = seed.projects.map(p => p.slug === 'tokke-teknologipark' ? {...p, published: false} : p)
  const out = renderSite(template, {...seed, projects})
  assert.doesNotMatch(out.projectsJs, /tokke-teknologipark/)
  const grid = out.html.match(/<div class="h26-project-grid">[\s\S]*?<\/section>/)[0]
  assert.doesNotMatch(grid, /tokke-teknologipark/)
  assert.match(out.html, /<a href="#prosjekt\/skiensvegen-740" data-film-link>/)
})

test('text is escaped, so content cannot inject markup', () => {
  const site = structuredClone(seed.site)
  site.home.heading = '<img src=x onerror=alert(1)>'
  site.about.partners = ['A & B </ul><script>']
  const out = renderSite(template, {...seed, site}).html
  assert.match(out, /<h1>&lt;img src=x onerror=alert\(1\)&gt;<\/h1>/)
  assert.match(out, /<li>A &amp; B &lt;\/ul&gt;&lt;script&gt;<\/li>/)
})

test('preview mode inlines the data and maps image URLs', () => {
  const out = renderSite(template, seed, {inline: true, img: p => 'https://cdn.test/' + p})
  assert.doesNotMatch(out.html, /<script src="js\/projects\.js">/)
  assert.match(out.html, /const ferroProjects = /)
  assert.match(out.html, /src="https:\/\/cdn\.test\/assets\/photos\/2024\/09\/IMG_8290\.webp"/)
})

test('home editor updates the service links, process image and ordered steps', () => {
  const site = structuredClone(seed.site)
  site.home.building.items = [{label:'Lager & logistikk', category:'lager'}]
  site.home.process.steps = [{title:'Befaring',text:'Besøk på tomten.'}]
  site.home.process.image = ''
  const out = renderSite(template, {...seed,site}).html
  assert.match(out, /href="#prosjekter\/lager">Lager &amp; logistikk/)
  assert.match(out, /<div class="process-story"><ol class="h26-steps"><li><h3>Befaring/)
  assert.doesNotMatch(out, /<h3>Første samtale<\/h3>/)
})
