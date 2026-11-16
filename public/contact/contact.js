(function () {
  var $ = function (id) { return document.getElementById(id); };

  // توست و کپی آیدی (دارای Fallback برای مرورگرهای تلگرام، اینستاگرام و وب‌ویو)
  var toast = $('toast'), toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('execCommand failed'));
      } catch (err) {
        if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
        reject(err);
      }
    });
  }

  var badge = $('cyberBadge');
  if (badge) {
    badge.addEventListener('click', function () {
      copyText('@alirezaxeon').then(
        function () { say('کپی شد! ✅'); },
        function () { say('کپی انجام نشد'); }
      );
    });
  }

  // فال‌بک آواتار در صورت عدم بارگذاری تصویر
  var av = $('avatar'), fb = $('avatarFallback');
  if (av && fb) {
    function noImg() { av.style.display = 'none'; fb.style.display = 'grid'; }
    av.addEventListener('error', noImg);
    if (av.complete && av.naturalWidth === 0) noImg();
  }

  document.body.classList.add('ready');
})();
