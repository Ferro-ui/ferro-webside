import {homeFields} from '../../lib/schema.mjs'
import {renderFields} from './fields.js'
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
  render: ctx => renderFields(homeFields, siteDoc().current.home, {...ctx, onSelect: (def, row, slug) => { if (prefill(def, row, slug)) ctx.changed(true) }}, ['home']),
}
