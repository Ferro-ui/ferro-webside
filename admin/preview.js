// Live preview. The page is rendered with the same lib/render.mjs as the build
// and shown in a sandboxed iframe (scripts on, no access to the admin's origin,
// so the token in sessionStorage is out of reach). The admin talks to the frame
// with postMessage. Two frames take turns, so an update swaps in a ready page
// instead of flashing a blank one.

import {h} from './dom.js'
import {renderSite} from '../lib/render.mjs'
import {store, content, onChange} from './store.js'
import {imageUrl} from './images.js'

const DEVICES = {mobil: {w: 390, h: 844, label: 'Mobil'}, datamaskin: {w: 1280, h: 800, label: 'Datamaskin'}}
const DEVICE_KEY = 'ferro-admin:device'

// Runs inside the preview frame. Keeps it on the right screen and scroll
// position, stops links from leaving the page, and reports back.
const AGENT = `(function(){
  var cfg = __CFG__;
  var base = document.baseURI.split('#')[0];
  try { if (cfg.hash) location.hash = cfg.hash; } catch (e) {}
  function report(type) { parent.postMessage({ferroPreview: true, type: type, id: cfg.id, hash: location.hash, y: Math.round(scrollY)}, '*'); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    var url; try { url = new URL(a.href); } catch (x) { return; }
    e.preventDefault();
    if (url.href.split('#')[0] === base && url.hash) {
      if (location.hash === url.hash) dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = url.hash;
    }
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
  addEventListener('message', function (e) {
    if (e.source !== parent || !e.data || !e.data.ferroPreview) return;
    if (e.data.type === 'goto' && e.data.hash !== location.hash) location.hash = e.data.hash;
  });
  var t; addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(function () { report('state'); }, 150); }, {passive: true});
  addEventListener('hashchange', function () { report('state'); });
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () { requestAnimationFrame(function () { if (cfg.y) scrollTo(0, cfg.y); requestAnimationFrame(function () { report('ready'); }); }); }, 60);
  });
  addEventListener('load', function () { if (cfg.y && Math.abs(scrollY - cfg.y) > 2) scrollTo(0, cfg.y); });
})();`
const QUIET = `<style>*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;scroll-behavior:auto!important}
html{scrollbar-width:none}::-webkit-scrollbar{display:none}</style>
<script>document.documentElement.classList.remove('motion','logo-intro')</script>`

export function createPreview() {
  let template = null
  let device = localStorage.getItem(DEVICE_KEY) || 'datamaskin'
  if (!DEVICES[device]) device = 'datamaskin'
  let override = null
  let focus = null      // slug of the project being edited; shown even when hidden
  let seq = 0
  let state = {hash: '#hjem', y: 0}
  let timer
  const frames = [0, 1].map(i => h('iframe', {class: 'preview-frame' + (i ? '' : ' is-active'), title: 'Forhåndsvisning av nettstedet',
    sandbox: 'allow-scripts', referrerpolicy: 'no-referrer', tabindex: i ? '-1' : '0'}))
  let active = 0
  const device_ = h('div', {class: 'preview-device'}, frames)
  const stage = h('div', {class: 'preview-stage'}, device_)
  const banner = h('div', {class: 'preview-banner', hidden: true, role: 'status'})
  const error = h('p', {class: 'preview-error', hidden: true, role: 'alert'})
  const size = h('span', {class: 'preview-size', 'aria-live': 'polite'})
  const buttons = Object.entries(DEVICES).map(([key, d]) => h('button', {type: 'button', class: 'seg', 'aria-pressed': String(key === device),
    onclick: () => setDevice(key)}, d.label))
  const el = h('section', {class: 'preview', 'aria-label': 'Forhåndsvisning'},
    h('div', {class: 'preview-bar'}, h('div', {class: 'seg-group', role: 'group', 'aria-label': 'Skjermstørrelse'}, buttons), size),
    banner, error, stage)

  function setDevice(key) {
    device = key
    localStorage.setItem(DEVICE_KEY, key)
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(Object.keys(DEVICES)[i] === key)))
    fit()
  }

  function fit() {
    const d = DEVICES[device]
    const availW = stage.clientWidth - 24, availH = stage.clientHeight - 24
    if (availW <= 0 || availH <= 0) return
    let scale, height
    if (device === 'datamaskin') { scale = Math.min(1, availW / d.w); height = availH / scale }
    else { scale = Math.min(1, availW / d.w, availH / d.h); height = Math.min(d.h, availH / scale) }
    for (const f of frames) Object.assign(f.style, {width: d.w + 'px', height: height + 'px', transform: `scale(${scale})`})
    Object.assign(device_.style, {width: d.w * scale + 'px', height: height * scale + 'px'})
    device_.classList.toggle('is-phone', device === 'mobil')
    size.textContent = `${d.w} px bred · ${Math.round(scale * 100)} %`
  }

  // Uploads come from memory or GitHub; site assets come from the deployed site via <base>.
  const img = path => path.startsWith('content/uploads/') ? imageUrl(path) : path

  function html() {
    const siteBase = new URL('../', location.href).href
    let data = content(override)
    if (focus) data = {...data, projects: data.projects.map(p => p.slug === focus ? {...p, published: true} : p)}
    const {html} = renderSite(template, data, {inline: true, img})
    const cfg = JSON.stringify({hash: state.hash, y: state.y, id: seq}).replace(/</g, '\\u003c')
    return html.replace('<head>', () => `<head>\n<base href="${siteBase}">\n<script>${AGENT.replace('__CFG__', cfg)}</script>`)
      .replace('</head>', () => QUIET + '\n</head>')
  }

  function render() {
    if (!template) return
    seq++
    let doc
    try { doc = html(); error.hidden = true } catch (e) {
      error.textContent = 'Forhåndsvisningen feilet: ' + e.message
      error.hidden = false
      return
    }
    const next = frames[1 - active]
    const id = seq
    next.srcdoc = doc
    // Fallback in case the page never reports back.
    setTimeout(() => { if (id === seq && frames[active] !== next && next.dataset.loaded === String(id)) swap(id) }, 2500)
    next.onload = () => { next.dataset.loaded = String(id) }
  }

  function swap(id) {
    if (id !== seq) return
    const next = 1 - active
    frames[next].classList.add('is-active'); frames[next].tabIndex = 0
    frames[active].classList.remove('is-active'); frames[active].tabIndex = -1
    active = next
  }

  addEventListener('message', e => {
    const i = frames.findIndex(f => f.contentWindow === e.source)
    if (i < 0 || !e.data?.ferroPreview) return
    if (e.data.type === 'ready' && i !== active) swap(e.data.id)
    if (i === active || e.data.type === 'ready') state = {hash: e.data.hash || '#hjem', y: e.data.y || 0}
  })

  onChange(() => schedule())
  new ResizeObserver(fit).observe(stage)

  function schedule(delay = 300) {
    clearTimeout(timer)
    timer = setTimeout(render, delay)
  }

  return {
    el,
    async init() {
      const res = await fetch('./template.html', {cache: 'no-store'})
      template = await res.text()
      fit()
      render()
    },
    focusProject(slug) {
      if (slug === focus) return
      focus = slug
      render()
    },
    goto(hash) {
      if (!hash) return
      state = {hash, y: 0}
      frames[active].contentWindow?.postMessage({ferroPreview: true, type: 'goto', hash}, '*')
    },
    showVersion(path, data, label, actions) {
      override = data ? {path, data} : null
      banner.replaceChildren(...(data ? [h('span', {}, label), ...actions] : []))
      banner.hidden = !data
      render()
    },
    refresh: () => schedule(0),
    fit,
  }
}

export {store}
