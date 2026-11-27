import {aboutFields} from '../../lib/schema.mjs'
import {renderFields} from './fields.js'
import {siteDoc} from '../store.js'

export const aboutSection = {
  id: 'om-oss', label: 'Om oss', hash: '#omoss', base: ['about'],
  intro: 'Teksten og bildene på Om oss-siden, de ansatte og punktene før første samtale.',
  render: ctx => renderFields(aboutFields, siteDoc().current.about, ctx, ['about']),
}
