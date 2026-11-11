(function () {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // لودر دیکود: حروف اسم یکی‌یکی از نویز رمزگشایی می‌شوند (حداکثر حدود ۳ ثانیه)
  var decWord = $('decWord'), decSub = $('decSub'), decBar = $('decBar'), decPct = $('decPct');
  var WORD = 'ALIREZA', CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@<>/|=+*';
  var letters = [], locked = [];
  decWord.textContent = '';
  for (var li = 0; li < WORD.length; li++) {
    var sp = document.createElement('span');
    sp.className = 'u'; sp.textContent = CH.charAt((Math.random() * CH.length) | 0);
    decWord.appendChild(sp); letters.push(sp); locked.push(false);
  }
  var pct = 0, loaded = false, done = false, hudT;
  var stages = [[0, 'DECRYPTING SIGNAL'], [30, 'BYPASSING FIREWALL'], [60, 'DECODING IDENTITY'], [92, 'ACCESS GRANTED']];
  function paint() {
    var p = Math.round(pct);
    decPct.textContent = p + '%'; decBar.style.width = p + '%';
    for (var i = stages.length - 1; i >= 0; i--) {
      if (p >= stages[i][0]) { decSub.textContent = stages[i][1]; break; }
    }
    for (var k = 0; k < letters.length; k++) {
      if (locked[k]) continue;
      if (pct >= (k + 1) / letters.length * 94) {
        locked[k] = true; letters[k].className = 'k'; letters[k].textContent = WORD.charAt(k);
      } else {
        letters[k].textContent = CH.charAt((Math.random() * CH.length) | 0);
      }
    }
  }
  function ready() {
    if (done) return;
    done = true; clearInterval(hudT); pct = 100; paint();
    setTimeout(function () { document.body.classList.add('ready'); }, 450);
  }
  hudT = setInterval(function () {
    if (loaded) pct += (100 - pct) * .22 + 1;
    else pct += Math.max(0, (88 - pct) * .04);
    if (pct >= 100) { ready(); return; }
    paint();
  }, 60);
  addEventListener('load', function () { loaded = true; });
  setTimeout(function () { loaded = true; }, 3000);

  // توست و کپی آیدی (دارای Fallback برای مرورگرهای تلگرام، اینستاگرام و وبویو)
  var toast = $('toast'), toastTimer;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
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
  $('cyberBadge').addEventListener('click', function () {
    copyText('@alirezaxeon').then(
      function () { say('کپی شد! ✅'); },
      function () { say('کپی انجام نشد'); }
    );
  });

  // فال‌بک آواتار
  var av = $('avatar'), fb = $('avatarFallback');
  function noImg() { av.style.display = 'none'; fb.style.display = 'grid'; }
  av.addEventListener('error', noImg);
  if (av.complete && av.naturalWidth === 0) noImg();

  // کارت‌های هولوگرافیک: درخشش دنبال‌کننده‌ی نشانگر + تیلت (فقط ماوس)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    document.querySelectorAll('.holo-card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', (x * 100) + '%');
        c.style.setProperty('--my', (y * 100) + '%');
        c.style.setProperty('--rx', ((.5 - y) * 10) + 'deg');
        c.style.setProperty('--ry', ((x - .5) * 12) + 'deg');
      });
      c.addEventListener('pointerleave', function () {
        ['--rx', '--ry', '--mx', '--my'].forEach(function (p) { c.style.removeProperty(p); });
      });
    });
  }

  // ---------- Three.js ----------
  var scene, cam, renderer, pts, meshes = [], running = false, raf;
  var ptr = { x: 0, y: 0 }, gyro = { x: 0, y: 0 };

  function initThree() {
    var mobile = innerWidth <= 768, N = mobile ? 3500 : 7000;
    var pal = [0x00ffff, 0xff00ff, 0x9945ff, 0xffff00, 0xffffff].map(function (h) { return new THREE.Color(h); });
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0008);
    cam = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 1, 4000);
    cam.position.z = 1000;

    var pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var c = pal[(Math.random() * pal.length) | 0];
      pos[i * 3] = Math.random() * 2000 - 1000;
      pos[i * 3 + 1] = Math.random() * 2000 - 1000;
      pos[i * 3 + 2] = Math.random() * 2000 - 1000;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    pts = new THREE.Points(g, new THREE.PointsMaterial({
      size: mobile ? 2.2 : 1.8, vertexColors: true, transparent: true, opacity: .8,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(pts);

    var geos = [new THREE.TetrahedronGeometry(90), new THREE.OctahedronGeometry(90), new THREE.IcosahedronGeometry(90)];
    for (var k = 0; k < (mobile ? 5 : 8); k++) {
      var m = new THREE.Mesh(geos[k % geos.length], new THREE.MeshBasicMaterial({ color: pal[k % 4], wireframe: true, transparent: true, opacity: .16 }));
      m.position.set(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);
      m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, 0);
      m.userData.s = { x: Math.random() * .006 - .003, y: Math.random() * .006 - .003 };
      meshes.push(m); scene.add(m);
    }
    renderer = new THREE.WebGLRenderer({ canvas: $('canvas-bg'), antialias: !mobile, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    pts.rotation.x += .00008; pts.rotation.y += .00014;
    for (var i = 0; i < meshes.length; i++) {
      meshes[i].rotation.x += meshes[i].userData.s.x;
      meshes[i].rotation.y += meshes[i].userData.s.y;
    }
    // ماوس و ژیروسکوپ در یک هدف ترکیب می‌شوند (بدون تداخل)
    cam.position.x += (ptr.x * .5 + gyro.x - cam.position.x) * .05;
    cam.position.y += (-ptr.y * .5 + gyro.y - cam.position.y) * .05;
    cam.lookAt(scene.position);
    renderer.render(scene, cam);
  }
  function start() { if (!running && renderer) { running = true; frame(); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') { ptr.x = e.clientX - innerWidth / 2; ptr.y = e.clientY - innerHeight / 2; }
  }, { passive: true });
  addEventListener('resize', function () {
    if (!renderer) return;
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (reduce) renderer.render(scene, cam);
  });
  // وقتی تب مخفی است رندر متوقف می‌شود
  document.addEventListener('visibilitychange', function () {
    if (reduce) return;
    document.hidden ? stop() : start();
  });

  // ---------- ژیروسکوپ (همیشه روشن، بدون دکمه) ----------
  function onTilt(e) {
    gyro.x = clamp((e.gamma || 0) / 45, -1, 1) * 80;
    gyro.y = clamp((45 - (e.beta || 0)) / 45, -1, 1) * 80;
  }
  var DOE = window.DeviceOrientationEvent;
  if (DOE && !reduce) {
    if (typeof DOE.requestPermission === 'function') {
      // iOS: اولین لمس صفحه مجوز را می‌خواهد (دکمه‌ای لازم نیست)
      var asked = false;
      var askGyro = function () {
        if (asked) return;
        asked = true;
        DOE.requestPermission().then(function (r) {
          if (r === 'granted') addEventListener('deviceorientation', onTilt, true);
        }).catch(function () {});
      };
      addEventListener('touchend', askGyro, { once: true, passive: true });
      addEventListener('click', askGyro, { once: true });
    } else {
      addEventListener('deviceorientation', onTilt, true);
    }
  }

  // بارگذاری Three.js: اول نسخه داخل خود پروژه، اگر نبود CDN (در حالت صرفه‌جویی داده لود نمی‌شود)
  function loadThree(src, next) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = function () {
      try { initThree(); if (reduce) renderer.render(scene, cam); else start(); }
      catch (err) { console.warn('WebGL unavailable', err); }
    };
    s.onerror = function () { if (next) loadThree(next); };
    document.head.appendChild(s);
  }
  var conn = navigator.connection;
  if (!(conn && conn.saveData)) loadThree('three.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
})();
