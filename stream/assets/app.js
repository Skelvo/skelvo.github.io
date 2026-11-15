/* ==========================================================================
   Skelvo Stream — outils partagés des pages éditeur.

   1) Traduction : le français est écrit directement dans le HTML. Pour une
      autre langue, il suffit d'ajouter un dictionnaire dans SK.dict (voir
      assets/lang-en.js à créer plus tard) : chaque élément qui porte
      data-i18n="clé" voit son texte remplacé. Rien à faire pour le français.

   2) Éditeur : lit le formulaire de réglages, fabrique l'URL de l'overlay à
      coller dans OBS, mémorise les réglages dans le navigateur, et prévient
      l'aperçu (iframe) à chaque changement sans le recharger.
   ========================================================================== */
(function(){
  'use strict';

  var SK = window.SK = window.SK || {};
  SK.dict = SK.dict || {};

  /* ---------- Stockage local (protégé : navigation privée, OBS…) ---------- */
  SK.store = {
    get: function(k){ try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } },
    set: function(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
    del: function(k){ try { localStorage.removeItem(k); } catch(e){} }
  };

  /* ---------- Traduction ---------- */
  var qs = new URLSearchParams(location.search);
  SK.lang = (qs.get('lang') || SK.store.get('sk-lang') || (navigator.language || 'fr')).slice(0, 2).toLowerCase();
  SK.t = function(key, fallback){
    var d = SK.dict[SK.lang];
    return (d && d[key]) || fallback;
  };
  SK.applyI18n = function(root){
    var d = SK.dict[SK.lang];
    if (!d) return; // français (ou langue sans dictionnaire) : le HTML fait foi
    document.documentElement.lang = SK.lang;
    (root || document).querySelectorAll('[data-i18n]').forEach(function(el){
      var v = d[el.getAttribute('data-i18n')]; if (v) el.innerHTML = v; // dictionnaires écrits par nous : le HTML (<b>, liens) est permis
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach(function(el){
      var v = d[el.getAttribute('data-i18n-ph')]; if (v) el.placeholder = v;
    });
  };

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  SK.toast = function(msg){
    if (!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 1800);
  };

  SK.copy = function(text){
    var done = function(){ SK.toast(SK.t('copied', 'Lien copié ! Colle-le dans OBS')); };
    if (navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback(){
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch(e){}
      ta.remove();
    }
  };

  /* ---------- Éditeur ---------- */
  function readForm(form){
    var p = {};
    Array.prototype.forEach.call(form.elements, function(el){
      if (!el.name || el.disabled) return;
      if (el.type === 'radio'){ if (el.checked) p[el.name] = el.value; return; }
      if (el.type === 'checkbox'){ p[el.name] = el.checked ? '1' : '0'; return; }
      if (el.type === 'color'){ p[el.name] = el.value.replace('#', '').toLowerCase(); return; }
      p[el.name] = String(el.value).trim();
    });
    return p;
  }

  function writeForm(form, p){
    Object.keys(p).forEach(function(name){
      var els = form.querySelectorAll('[name="' + name + '"]');
      els.forEach(function(el){
        var v = p[name];
        if (el.type === 'radio') el.checked = (el.value === v);
        else if (el.type === 'checkbox') el.checked = (v === '1');
        else if (el.type === 'color') { if (/^[0-9a-f]{6}$/i.test(v)) el.value = '#' + v; }
        else el.value = v;
      });
    });
  }

  function syncOutputs(form){
    form.querySelectorAll('input[type=range]').forEach(function(r){
      var out = form.querySelector('output[for="' + r.id + '"]');
      if (out) out.textContent = r.value + (out.dataset.unit || '');
    });
  }

  /**
   * opts = {
   *   form, overlay ('overlay.html'), storageKey,
   *   urlInput, copyBtn, resetBtn, openBtn,
   *   onChange(params, url)
   * }
   */
  SK.editor = function(opts){
    var form = opts.form;
    var defaults = readForm(form);
    var base = new URL(opts.overlay, location.href);

    // Réglages de départ : ceux de l'URL (lien "modifier") > ceux mémorisés > défauts
    var fromUrl = {};
    qs.forEach(function(v, k){ if (k in defaults) fromUrl[k] = v; });
    var saved = SK.store.get(opts.storageKey) || {};
    writeForm(form, Object.assign({}, defaults, saved, fromUrl));

    function buildUrl(p){
      var u = new URL(base.href);
      Object.keys(p).forEach(function(k){ u.searchParams.set(k, p[k]); });
      return u.href;
    }

    var raf;
    function update(){
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        syncOutputs(form);
        var p = readForm(form);
        var url = buildUrl(p);
        if (opts.urlInput) opts.urlInput.value = url;
        if (opts.openBtn) opts.openBtn.href = url;
        SK.store.set(opts.storageKey, p);
        if (opts.onChange) opts.onChange(p, url);
      });
    }

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', function(e){ e.preventDefault(); });

    if (opts.copyBtn) opts.copyBtn.addEventListener('click', function(){ SK.copy(opts.urlInput.value); });
    if (opts.urlInput) opts.urlInput.addEventListener('focus', function(){ this.select(); });
    if (opts.resetBtn) opts.resetBtn.addEventListener('click', function(){
      writeForm(form, defaults); SK.store.del(opts.storageKey); update();
    });

    update();

    return {
      get: function(){ return readForm(form); },
      set: function(p){ writeForm(form, p); update(); },
      update: update
    };
  };

  /* Envoie les réglages à un aperçu (iframe) sans le recharger */
  SK.sendToPreview = function(iframe, params){
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'sk-params', params: params }, location.origin);
  };

  document.addEventListener('DOMContentLoaded', function(){ SK.applyI18n(); });
})();
