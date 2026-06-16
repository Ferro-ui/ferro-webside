/* ============================================================
   Ferro Stålentreprenør — front-end runtime
   Small, dependency-free runtime for the site:
     · inline-style normalization (so the responsive [style*=] rules match)
     · data-hover / data-focus  → JS-driven :hover/:focus merge
     · hash-routed single-page navigation between the 5 screens
     · project grid + project-detail rendering from data
     · contact form "sent" state · image lightbox · card parallax tilt
     · hero <video> autoplay nudge
   ============================================================ */
(function () {
  'use strict';

  var U = 'https://ferrostal.no/wp-content/uploads/';

  /* ---- project grid cards (the /prosjekter listing) ---- */
  var GRID = [
    { img: U + '2024/09/image11.jpg',                       badge: 'Butikk',      title: 'Folkestadvegen 3',                  sub: 'Coop Extra · Forberg Eiendomsselskap' },
    { img: U + '2024/09/IMG_8290-1024x768.jpeg',            badge: 'Produksjon',  title: 'Storvegen 42 — Tokke Teknologipark', sub: 'Dalen Mekaniske AS' },
    { img: U + '2024/09/IMG_2054-768x1024.jpg',            badge: 'Næringsbygg', title: 'Skiensvegen 740',                   sub: 'NTT AS · Nome Eiendom AS' },
    { img: U + '2025/02/Orevella-2-e1738919120806.jpeg',   badge: 'Industri',    title: 'Ørevellavegen 6',                   sub: 'Ørevella Industrier AS' },
    { img: U + '2025/02/Mekan-1024x768.jpeg',              badge: 'Verksted',    title: 'Storvegen 97 — Mekan',              sub: 'G7 Eiendom' },
    { img: U + '2024/09/image9.jpg',                        badge: 'Næringsbygg', title: 'Torshølvegen 5',                    sub: 'Eika Eigedom AS' },
    { img: U + '2024/09/DJI_0031-1024x768.jpg',            badge: 'Lager',       title: 'Sætrevegen 265',                    sub: 'Bård Langkaas Transport AS' },
    { img: U + '2024/09/image5.jpg',                        badge: 'Vaskehall',   title: 'Hydrovegen 55 — Vaskehall Herøya',  sub: 'Alltidrenbil' },
    { img: U + '2024/09/image1.png',                        badge: 'Bolig',       title: 'Ringsevja 9',                       sub: 'Nye leiligheter' }
  ];

  /* ---- full project records (the detail view) ---- */
  var PROJECTS = [
    { title: 'Folkestadvegen 3', client: 'Coop Extra · Forberg Eiendomsselskap AS', type: 'Butikk', sted: 'Bø i Telemark', hero: U + '2024/09/image11.jpg',
      headline: 'Nytt Coop-bygg i Bø – solid og effektiv leveranse',
      body: ['Forberg Eiendomsselskap AS valgte oss til å oppføre stålbygget for den nye Coop-butikken i Bø sentrum. Vi leverte en komplett løsning med montering av skallvegger, hulldekker, stålkonstruksjon, vegger og tak – alt tilpasset kundens behov.', 'Med fokus på kvalitet og effektiv gjennomføring sørget vi for en smidig byggeprosess og et bygg som vil tjene lokalsamfunnet i mange år fremover.'],
      specs: ['2000 m² hulldekker for et stabilt og varig bygg', '1000 m² parkeringskjeller for god tilgjengelighet', '1000 m² butikkareal med praktisk utforming', '800 m² kontorlokaler i 2. etasje'],
      byggetid: '', gallery: [U + '2024/09/image12.jpg', U + '2024/09/image10.jpg', U + '2024/09/image8.jpg'] },
    { title: 'Storvegen 42 — Tokke Teknologipark', client: 'Dalen Mekaniske AS', type: 'Produksjon', sted: 'Tokke', hero: U + '2024/09/IMG_8290.jpeg',
      headline: 'Tokke Teknologipark – skreddersydd løsning for Dalen Mekaniske AS',
      body: ['Dalen Mekaniske AS valgte oss som totalentreprenør for utvidelsen av Tokke Teknologipark. Tilbygget på totalt 540 m² er skreddersydd for deres behov og gir økt kapasitet og funksjonalitet.', 'Med byggetid fra oktober 2022 til april 2023 sørget vi for en effektiv og kvalitetssikker leveranse.'],
      specs: ['270 m² grunnflate fordelt på to etasjer', 'Stålkonstruksjon med sandwichelementer', 'Hulldekker i etasjeskillet'],
      byggetid: 'Oktober 2022 – april 2023', gallery: [U + '2024/09/image13.jpg'] },
    { title: 'Skiensvegen 740', client: 'NTT AS · Nome Eiendom AS', type: 'Næringsbygg', sted: 'Nome', hero: U + '2024/09/IMG_2054-rotated.jpg',
      headline: 'Nytt kontor, verksted og lager for NTT AS – levert som totalentreprise',
      body: ['Da NTT AS skulle bygge nytt kontor, verksted og lager i Nome, valgte de oss som totalentreprenør. Resultatet er et moderne og funksjonelt bygg med 505 m² grunnflate fordelt på to etasjer, totalt 756 m².', 'Med en byggetid fra juni til november 2023 sørget vi for en smidig og kostnadseffektiv gjennomføring.'],
      specs: ['Stålkonstruksjon med sandwichelementer', 'Hulldekker i etasjeskillet', 'Skreddersydd for NTT AS sine behov'],
      byggetid: 'Juni – november 2023', gallery: [U + '2024/09/IMG_8596.jpeg', U + '2024/09/DJI_0024.jpg', U + '2024/09/DJI_0018.jpg', U + '2024/09/DJI_0030.jpg'] },
    { title: 'Ørevellavegen 6', client: 'Ørevella Industrier AS', type: 'Industri', sted: 'Telemark', hero: U + '2025/02/Orevella-2-e1738919120806.jpeg', headline: '', body: [], specs: [], byggetid: '', gallery: [] },
    { title: 'Storvegen 97 — Mekan', client: 'G7 Eiendom', type: 'Verksted', sted: 'Tokke', hero: U + '2025/02/Mekan-1024x768.jpeg', headline: '', body: [], specs: [], byggetid: '', gallery: [] },
    { title: 'Torshølvegen 5', client: 'Eika Eigedom AS', type: 'Næringsbygg', sted: 'Telemark', hero: U + '2024/09/image9.jpg', headline: '', body: [], specs: [], byggetid: '', gallery: [] },
    { title: 'Sætrevegen 265', client: 'Bård Langkaas Transport AS', type: 'Lager', sted: 'Telemark', hero: U + '2024/09/DJI_0031-1024x768.jpg', headline: '', body: [], specs: [], byggetid: '', gallery: [] },
    { title: 'Hydrovegen 55 — Vaskehall Herøya', client: 'Alltidrenbil', type: 'Vaskehall', sted: 'Herøya', hero: U + '2024/09/image5.jpg', headline: '', body: [], specs: [], byggetid: '', gallery: [] },
    { title: 'Ringsevja 9', client: 'Nye leiligheter', type: 'Bolig', sted: 'Ulefoss', hero: U + '2024/09/image1.png', headline: '', body: [], specs: [], byggetid: '', gallery: [] }
  ];

  var LOGO_WHITE = U + '2024/08/logo-white.png';

  /* ---- tiny helpers ---- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ============================================================
     Inline-style normalization.
     The responsive rules match the CSSOM-serialized form of inline
     styles, e.g. [style*="grid-template-columns: 1fr 1fr"].
     Re-serializing every [style] at startup guarantees that form,
     so the @media rules apply however the markup was written.
     ============================================================ */
  function normalize(root) {
    $all('[style]', root).forEach(function (el) {
      el.setAttribute('style', el.style.cssText);
    });
  }

  /* ============================================================
     Hover / focus styles (data-hover / data-focus)
     ============================================================ */
  function bindHoverFocus(root) {
    $all('[data-hover]', root).forEach(function (el) {
      if (el._hoverBound) return;
      el._hoverBound = true;
      var hover = el.getAttribute('data-hover');
      el.addEventListener('mouseenter', function () {
        el.setAttribute('style', (el.getAttribute('style') || '') + ';' + hover);
      });
      el.addEventListener('mouseleave', function () {
        el.setAttribute('style', el._baseStyle || '');
      });
      // refresh the captured base each time we leave-clean, so active-state
      // changes elsewhere don't get clobbered
      el._captureBase = function () { el._baseStyle = el.getAttribute('style') || ''; };
      el._captureBase();
    });
    $all('[data-focus]', root).forEach(function (el) {
      if (el._focusBound) return;
      el._focusBound = true;
      var focus = el.getAttribute('data-focus');
      el._baseFocus = el.getAttribute('style') || '';
      el.addEventListener('focus', function () {
        el.setAttribute('style', el._baseFocus + ';' + focus);
      });
      el.addEventListener('blur', function () {
        el.setAttribute('style', el._baseFocus);
      });
    });
  }

  /* ============================================================
     Card parallax tilt + spotlight
     ============================================================ */
  function initParallax() {
    var MAX = 6;
    var tilted = null;
    function reset(card) {
      card.style.transform = '';
      var sp = card.querySelector('[data-proj-spot]');
      if (sp) sp.style.opacity = '0';
    }
    document.addEventListener('pointermove', function (e) {
      var t = e.target;
      var card = (t && t.closest) ? t.closest('[data-proj]') : null;
      if (tilted && tilted !== card) { reset(tilted); tilted = null; }
      if (!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var rx = (0.5 - py) * MAX;
      var ry = (px - 0.5) * MAX;
      card.style.transform = 'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      var sp = card.querySelector('[data-proj-spot]');
      if (sp) {
        sp.style.opacity = '1';
        sp.style.background = 'radial-gradient(380px circle at ' + (px * 100).toFixed(1) + '% ' + (py * 100).toFixed(1) + '%, rgba(157,189,226,0.28), transparent 62%)';
      }
      tilted = card;
    }, { passive: true });
    window.addEventListener('blur', function () { if (tilted) { reset(tilted); tilted = null; } });
  }

  /* ============================================================
     Hero <video> autoplay nudge
     ============================================================ */
  function initHeroVideo() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var v = document.querySelector('video[data-hero]');
      if (v) {
        v.muted = true; v.loop = true;
        v.setAttribute('muted', ''); v.setAttribute('loop', ''); v.setAttribute('playsinline', '');
        if (!v._lw) { v._lw = true; v.addEventListener('ended', function () { try { v.currentTime = 0; v.play(); } catch (e) {} }); }
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
      if ((v && !v.paused) || tries > 25) clearInterval(t);
    }, 150);
  }

  /* ============================================================
     Lightbox
     ============================================================ */
  var lb = $('[data-lightbox]');
  var lbImg = $('[data-lightbox-img]');
  function openLightbox(url) {
    lbImg.setAttribute('src', url);
    lb.hidden = false;
  }
  function closeLightbox() { lb.hidden = true; lbImg.setAttribute('src', ''); }
  if (lb) {
    lb.addEventListener('click', function (e) {
      // click anywhere on backdrop (or the ✕) closes; clicking the image itself also closes (cursor:zoom-out)
      closeLightbox();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLightbox(); });
  }

  /* ============================================================
     Render: project grid (/prosjekter)
     ============================================================ */
  function gridCardHTML(i, c) {
    return '' +
      '<a data-proj data-action="openA' + i + '" style="position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid rgba(20,22,24,0.08);border-radius:22px;overflow:hidden;cursor:zoom-in;box-shadow:0 12px 34px -24px rgba(32,57,93,0.25);transition:box-shadow .4s,transform .28s cubic-bezier(.16,1,.3,1);text-decoration:none;color:inherit;animation:revealUp both linear;animation-timeline:view();animation-range:entry 0% cover 12%" data-hover="box-shadow:0 34px 64px -34px rgba(32,57,93,0.42)">' +
        '<div style="position:relative;aspect-ratio:4/3;overflow:hidden;background:#E4ECF6">' +
          '<img data-proj-img src="' + esc(c.img) + '" alt="' + esc(c.title) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.16,1,.3,1)">' +
          '<div data-proj-spot style="position:absolute;inset:0;z-index:1;opacity:0;transition:opacity .35s;pointer-events:none;mix-blend-mode:screen"></div>' +
          '<img src="' + LOGO_WHITE + '" alt="" style="position:absolute;top:12px;left:12px;height:17px;opacity:.9;z-index:2;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6));pointer-events:none">' +
          '<span style="position:absolute;bottom:12px;left:12px;z-index:2;font-family:\'Space Mono\',monospace;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#16263E;background:rgba(255,255,255,0.92);padding:5px 11px;border-radius:100px">' + esc(c.badge) + '</span>' +
        '</div>' +
        '<div style="padding:22px 22px 24px;display:flex;flex-direction:column;gap:6px;flex:1">' +
          '<h3 style="margin:0;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:19px;letter-spacing:-0.01em;line-height:1.15">' + esc(c.title) + '</h3>' +
          '<span style="font-size:13.5px;color:#6B6E6A;line-height:1.45">' + esc(c.sub) + '</span>' +
        '</div>' +
      '</a>';
  }

  function renderGrid() {
    var grid = $('[data-proj-grid]');
    if (!grid || grid._rendered) return;
    grid._rendered = true;
    grid.innerHTML = GRID.map(function (c, i) { return gridCardHTML(i, c); }).join('');
    normalize(grid);
    bindHoverFocus(grid);
  }

  /* ============================================================
     Render: project detail
     ============================================================ */
  function imgFill(src, alt) {
    return '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';
  }

  function detailHTML(d) {
    var bodyParas = (d.body && d.body.length)
      ? d.body.map(function (p) { return '<p style="margin:0">' + esc(p) + '</p>'; }).join('')
      : '<p style="margin:0">Ta kontakt med oss for mer informasjon og bilder fra dette prosjektet.</p>';

    var specsHTML = '';
    if (d.specs && d.specs.length) {
      var rows = d.specs.map(function (s) {
        return '<div style="display:flex;gap:11px;align-items:flex-start;font-size:14.5px;line-height:1.5;color:#23262A"><span style="flex-shrink:0;color:#2E5A8C;margin-top:1px">✓</span>' + esc(s) + '</div>';
      }).join('');
      var bygg = d.byggetid
        ? '<div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(20,22,24,0.08)"><div style="font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2E5A8C;margin-bottom:6px">Byggetid</div><div style="font-weight:600;font-size:15px;color:#16263E">' + esc(d.byggetid) + '</div></div>'
        : '';
      specsHTML =
        '<div style="background:#fff;border:1px solid rgba(20,22,24,0.08);border-radius:20px;padding:30px;box-shadow:0 16px 40px -28px rgba(32,57,93,0.3)">' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2E5A8C;margin-bottom:18px">Prosjektet omfattet</div>' +
          '<div style="display:flex;flex-direction:column;gap:14px">' + rows + '</div>' + bygg +
        '</div>';
    }

    var headlineHTML = d.headline
      ? '<h2 style="margin:0 0 30px;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:clamp(24px,3vw,38px);line-height:1.1;letter-spacing:-0.02em;max-width:22ch;color:#16263E">' + esc(d.headline) + '</h2>'
      : '';

    var galleryHTML = '';
    if (d.gallery && d.gallery.length) {
      var cells = d.gallery.map(function (u) {
        return '<div data-gallery-img data-src="' + esc(u) + '" style="position:relative;aspect-ratio:4/3;border-radius:16px;overflow:hidden;cursor:zoom-in;background:#E4ECF6">' + imgFill(u, '') + '</div>';
      }).join('');
      galleryHTML =
        '<div style="margin-top:50px">' +
          '<div style="font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2E5A8C;margin-bottom:18px">Flere bilder</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">' + cells + '</div>' +
        '</div>';
    }

    return '' +
      '<section style="background-color:#20395D;background-image:linear-gradient(rgba(157,189,226,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(157,189,226,0.06) 1px,transparent 1px);background-size:46px 46px;padding:140px 0 66px;color:#fff;position:relative;overflow:hidden">' +
        '<div style="position:absolute;left:0;right:0;top:0;height:170px;background:linear-gradient(180deg,rgba(157,189,226,0.12),transparent);animation:scanBeam 9s ease-in-out infinite;pointer-events:none"></div>' +
        '<div style="position:relative;max-width:1100px;margin:0 auto;padding:0 32px">' +
          '<span data-action="closeDetail" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:\'Space Mono\',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9DBDE2;margin-bottom:26px" data-hover="color:#fff"><span style="font-size:15px">←</span> Alle prosjekter</span>' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
            '<span style="font-family:\'Space Mono\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#16263E;background:#9DBDE2;padding:6px 13px;border-radius:100px">' + esc(d.type) + '</span>' +
            '<span style="font-family:\'Space Mono\',monospace;font-size:12px;color:rgba(255,255,255,0.6)">' + esc(d.sted) + '</span>' +
          '</div>' +
          '<h1 style="margin:0;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:clamp(32px,5vw,62px);line-height:1.0;letter-spacing:-0.025em;max-width:18ch;animation:revealUp .7s both">' + esc(d.title) + '</h1>' +
          '<p style="margin:16px 0 0;font-size:16px;color:rgba(255,255,255,0.74)">' + esc(d.client) + '</p>' +
        '</div>' +
      '</section>' +
      '<section style="background:transparent;padding:50px 0 110px">' +
        '<div style="max-width:1100px;margin:0 auto;padding:0 32px">' +
          '<div style="position:relative;border-radius:24px;overflow:hidden;box-shadow:0 40px 80px -40px rgba(22,38,62,0.45);margin-bottom:46px;aspect-ratio:16/10;background:#E4ECF6">' +
            imgFill(d.hero, d.title) +
            '<img src="' + LOGO_WHITE + '" alt="" style="position:absolute;top:16px;left:16px;height:22px;opacity:.9;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6));z-index:2">' +
          '</div>' +
          headlineHTML +
          '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:48px;align-items:start">' +
            '<div style="font-size:16.5px;line-height:1.7;color:#3a3d3a;display:flex;flex-direction:column;gap:18px">' + bodyParas + '</div>' +
            specsHTML +
          '</div>' +
          galleryHTML +
          '<div style="margin-top:54px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between;background:#16263E;border-radius:22px;padding:32px clamp(28px,4vw,44px);color:#fff">' +
            '<div>' +
              '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:clamp(20px,2.4vw,26px);letter-spacing:-0.01em">Har du et lignende prosjekt på gang?</div>' +
              '<div style="font-size:14.5px;color:rgba(255,255,255,0.7);margin-top:6px">Ta en uforpliktende prat med oss.</div>' +
            '</div>' +
            '<span data-action="goKontakt" style="cursor:pointer;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:15px;color:#16263E;background:#fff;padding:15px 28px;border-radius:100px;white-space:nowrap;transition:transform .25s,background .25s" data-hover="background:#E4ECF6;transform:translateY(-2px)">Kontakt oss →</span>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function renderDetail(i) {
    var host = $('[data-screen="prosjekt"]');
    host.innerHTML = detailHTML(PROJECTS[i]);
    normalize(host);
    bindHoverFocus(host);
    // gallery clicks → lightbox
    $all('[data-gallery-img]', host).forEach(function (cell) {
      cell.addEventListener('click', function () { openLightbox(cell.getAttribute('data-src')); });
    });
  }

  /* ============================================================
     Router / screen state
     ============================================================ */
  var state = { page: 'home', detail: null };
  var hashForPage = { home: 'hjem', prosjekter: 'prosjekter', omoss: 'omoss', kontakt: 'kontakt' };
  var pageForHash = { '': 'home', home: 'home', hjem: 'home', prosjekter: 'prosjekter', omoss: 'omoss', 'om-oss': 'omoss', kontakt: 'kontakt' };

  function resetForms() {
    $all('form[data-action="submitForm"]').forEach(function (f) {
      var sent = $('[data-form-sent]', f);
      var fields = $('[data-form-fields]', f);
      if (sent) sent.hidden = true;
      if (fields) fields.hidden = false;
    });
  }

  function render() {
    var active = state.detail != null ? 'prosjekt' : state.page;
    $all('.screen').forEach(function (s) {
      s.classList.toggle('is-active', s.getAttribute('data-screen') === active);
    });
    if (state.page === 'prosjekter' || state.detail != null) renderGrid();
    if (state.detail != null) renderDetail(state.detail);
    // nav highlight follows the page (stays on "Prosjekter" while a detail is open)
    $all('[data-navdot]').forEach(function (dot) {
      dot.hidden = dot.getAttribute('data-navdot') !== state.page;
    });
  }

  function scrollTop() {
    try { window.scrollTo(0, 0); } catch (e) {}
    try { (document.scrollingElement || document.documentElement).scrollTop = 0; } catch (e) {}
    try { document.body.scrollTop = 0; } catch (e) {}
  }

  function setPage(page) {
    state.page = page;
    state.detail = null;
    resetForms();
    render();
    scrollTop();
  }

  function applyHash() {
    var h = (location.hash || '').replace('#', '').toLowerCase();
    var pg = pageForHash[h] || 'home';
    if (pg !== state.page || state.detail != null) setPage(pg);
  }

  function navigate(page) {
    if (page === state.page && state.detail == null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (('#' + hashForPage[page]) === location.hash) {
      // hash unchanged (e.g. leaving a detail view) → apply directly
      setPage(page);
    } else {
      location.hash = '#' + hashForPage[page];
    }
  }

  /* ============================================================
     Action dispatch
     ============================================================ */
  var ACTIONS = {
    goHome: function () { navigate('home'); },
    goProsjekter: function () { navigate('prosjekter'); },
    goOmOss: function () { navigate('omoss'); },
    goKontakt: function () { navigate('kontakt'); },
    closeDetail: function () { state.detail = null; render(); scrollTop(); },
    closeLb: function () { closeLightbox(); }
  };
  PROJECTS.forEach(function (_, i) {
    ACTIONS['openA' + i] = function () { state.detail = i; render(); scrollTop(); };
  });

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    var name = el.getAttribute('data-action');
    if (name === 'submitForm') return; // handled on submit
    if (ACTIONS[name]) {
      // anchors with an in-page hash drive the router; let them, but block default for spans
      if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').charAt(0) === '#') {
        e.preventDefault();
      }
      ACTIONS[name]();
    }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.matches && f.matches('form[data-action="submitForm"]')) {
      e.preventDefault();
      var sent = $('[data-form-sent]', f);
      var fields = $('[data-form-fields]', f);
      if (fields) fields.hidden = true;
      if (sent) sent.hidden = false;
    }
  });

  /* ============================================================
     Boot
     ============================================================ */
  normalize(document);
  bindHoverFocus(document);
  initParallax();
  initHeroVideo();
  window.addEventListener('hashchange', applyHash);
  applyHash();           // sets initial screen from the URL hash
  render();              // ensure first paint reflects state
})();
