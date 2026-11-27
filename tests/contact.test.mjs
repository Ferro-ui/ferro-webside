import test from 'node:test'
import assert from 'node:assert/strict'
import {renderSite, fillContact} from '../lib/render.mjs'
import {read, loadSeed, screen} from './helpers.mjs'

const template = read('index.html')
const seed = loadSeed()

test('fillContact updates every [data-contact] spot', () => {
  const out = fillContact('<a href="tel:+4711111111" data-contact="phone" data-prefix="Ring ">Ring 111</a><span data-contact="orgNr" data-prefix="Org.nr. ">x</span><a href="mailto:a@b.no" data-contact="email">a@b.no</a>',
    {phone: '22 33 44 55', orgNr: '123 456 789', email: 'post@ferro.no'})
  assert.equal(out, '<a href="tel:+4722334455" data-contact="phone" data-prefix="Ring ">Ring 22 33 44 55</a><span data-contact="orgNr" data-prefix="Org.nr. ">Org.nr. 123 456 789</span><a href="mailto:post@ferro.no" data-contact="email">post@ferro.no</a>')
})

test('changing the contact fields reaches menu, footer, bands, Kontakt and the form', () => {
  const site = structuredClone(seed.site)
  Object.assign(site.contact, {phone: '22 33 44 55', email: 'post@ferro.no', address: 'Storgata 1, 3830 Ulefoss', orgNr: '111 222 333',
    facebookUrl: 'https://facebook.com/ferro', brochureUrl: 'https://brosjyre.test/', privacyUrl: 'https://personvern.test/'})
  const {html} = renderSite(template, {...seed, site})
  assert.doesNotMatch(html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/data-screen="omoss"[\s\S]*?KONTAKT/, ''), /958 37 123|4795837123|vegard@ferrostal\.no/)
  assert.equal((html.match(/data-contact="phone" data-prefix="Ring ">Ring 22 33 44 55</g) || []).length, 2)
  assert.match(html, /<a class="site-footer__link" href="mailto:post@ferro\.no" data-contact="email">post@ferro\.no<\/a>/)
  assert.match(html, /data-contact="orgNr" data-prefix="Org\.nr\. ">Org\.nr\. 111 222 333</)
  assert.match(screen(html, 'kontakt'), /query=Storgata\+1\+3830\+Ulefoss/)
  assert.match(screen(html, 'kontakt'), /sende den til post@ferro\.no\./)
  assert.match(screen(html, 'kontakt'), /henvendelsen\. <a href="https:\/\/personvern\.test\/">/)
  assert.match(html, /window\.ferroContact=\{"email":"post@ferro\.no","phone":"22 33 44 55"/)
  assert.match(screen(html, 'omoss'), /href="tel:\+4722334455">Ring 22 33 44 55</)
})
