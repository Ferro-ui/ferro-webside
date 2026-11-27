import {contactFields} from '../../lib/schema.mjs'
import {renderFields} from './fields.js'
import {siteDoc} from '../store.js'

export const contactSection = {
  id: 'kontakt', label: 'Kontakt', hash: '#kontakt', base: ['contact'],
  intro: 'Telefon, e-post og adresse brukes overalt på nettstedet: i menyen, nederst på hver side, på kontaktsiden og i e-postutkastet fra skjemaet.',
  render: ctx => renderFields(contactFields, siteDoc().current.contact, ctx, ['contact']),
}
