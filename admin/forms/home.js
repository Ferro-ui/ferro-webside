import {homeFields} from '../../lib/schema.mjs'
import {h} from '../dom.js'
import {imageUrl} from '../images.js'
import {renderField} from './fields.js'
import {store, siteDoc} from '../store.js'

// Picking a project fills the empty fields of a scene or card from it.
function prefill(def, row, slug) {
  if (def.type !== 'project') return false
  const p = [...store.docs.values()].find(d => d.kind === 'project' && d.current.slug === slug)?.current
  if (!p) return false
  const cats = siteDoc().current.categories
  const fill = (key, value) => { if (key in row && !row[key] && value) row[key] = value }
  if ('start' in row) {
    fill('label', p.sted)
    fill('title', `${p.title} · ${p.sted}`)
  } else {
    fill('title', p.title)
    fill('meta', [p.sted, cats[p.category]].filter(Boolean).join(' · '))
    fill('text', p.lead)
    fill('image', p.hero)
    fill('alt', p.heroAlt)
  }
  return true
}

export const homeSection = {
  id: 'forside', label: 'Forside', hash: '#hjem', base: ['home'],
  intro: 'Overskriften øverst, scenene i dronefilmen og prosjektkortene, byggtypene og trinnene i byggeprosessen. Dra kortene eller bruk pilene for å endre rekkefølgen.',
  render(ctx) {
    const home = siteDoc().current.home
    const context = {...ctx, onSelect: (def, row, slug) => { if (prefill(def, row, slug)) ctx.changed(true) }}
    const fields = Object.fromEntries(homeFields.map(def => [def.key, renderField(def, home, context, ['home', def.key])]))
    const preview = h('video', {controls: true, playsinline: true, preload: 'metadata', style: 'width:100%;display:block',
      src: home.mainFilm ? imageUrl(home.mainFilm) : '../assets/video/hero-drone-v4-480.mp4'})
    const group = h('section', {class: 'group'}, h('h2', {}, 'Filmer på forsiden'), h('h3', {}, 'Hovedfilm'),
      preview, fields.mainFilm, fields.scenes, fields.films)
    fields.mainFilm.addEventListener('filmselected', () => { preview.src = imageUrl(home.mainFilm) })
    return homeFields.flatMap(({key}) => key === 'mainFilm' ? [group] : ['scenes', 'films'].includes(key) ? [] : [fields[key]])
  },
}
