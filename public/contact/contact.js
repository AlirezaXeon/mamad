(function () {
  var $ = function (id) { return document.getElementById(id); };

  // آواتار: همان تصویر پروفایل سایت (از /api/site)؛ تا لود نشود، حروف MF نمایش داده میشود
  var av = $('avatar'), fb = $('avatarFallback');

  function resolve(src) {
    if (/^(https?:)?\/\//.test(src) || src.charAt(0) === '/') return src;
    return '/' + src.replace(/^\.?\//, '');
  }

  function loadSite() {
    return fetch('/api/site', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return fetch('/data/site.json').then(function (r) { return r.json(); }); });
  }

  if (av && fb) {
    av.addEventListener('load', function () { av.hidden = false; fb.style.display = 'none'; });
    av.addEventListener('error', function () { av.hidden = true; fb.style.display = 'grid'; });
    loadSite().then(function (site) {
      var src = site && site.profile && site.profile.image;
      if (src) av.src = resolve(String(src));
    }).catch(function () {});
  }

  document.body.classList.add('ready');
})();
