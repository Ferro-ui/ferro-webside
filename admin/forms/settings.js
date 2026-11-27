import {settingsFields, navFields} from '../../lib/schema.mjs'
import {renderFields} from './fields.js'
import {h} from '../dom.js'
import {siteDoc} from '../store.js'

export const settingsSection = {
  id: 'innstillinger', label: 'Innstillinger', hash: '#hjem', base: [],
  intro: 'Adressen til nettstedet, teksten søkemotorene viser, bildet ved deling og menyen øverst.',
  render: ctx => [
    h('h3', {class: 'sub'}, 'Søk og deling'),
    ...renderFields(settingsFields, siteDoc().current.settings, ctx, ['settings']),
    h('h3', {class: 'sub'}, 'Meny'),
    ...renderFields(navFields, siteDoc().current, ctx, []),
  ],
}
