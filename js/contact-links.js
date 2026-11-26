/* Fills [data-contact] links (menu, footer, project cards) from window.ferroContact,
   which the CMS injects. Without it the markup keeps its built-in values. */
(function () {
  function telHref(phone) {
    var d = String(phone || '').replace(/\s+/g, '');
    return 'tel:' + (/^[0-9]{8}$/.test(d) ? '+47' + d : d);
  }
  var HREF = {
    phone: telHref,
    email: function (v) { return 'mailto:' + v; },
    facebook: function (v) { return v; },
    brochure: function (v) { return v; },
    privacy: function (v) { return v; }
  };
  var TEXT = { phone: true, email: true, address: true, orgNr: true };
  window.ferroApplyContact = function (root) {
    var c = window.ferroContact;
    if (!c) return;
    (root || document).querySelectorAll('[data-contact]').forEach(function (el) {
      var key = el.getAttribute('data-contact');
      var value = c[key];
      if (!value) return;
      if (TEXT[key]) el.textContent = (el.getAttribute('data-prefix') || '') + value;
      if (HREF[key] && el.tagName === 'A') {
        el.setAttribute('href', HREF[key](value));
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.ferroApplyContact(); });
  else window.ferroApplyContact();
})();
