(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const thumb = u => String(u).replace('/api/media/img:', '/api/media/imgs:'); // پیش‌نمایش سبک (نسخه کوچک)

  const ST = {
    new: ['جدید', '#8FB39E'],
    review: ['در حال بررسی', '#E0C27A'],
    contacted: ['تماس گرفته شد', '#7FB2D9'],
    contract: ['قرارداد شد', '#A3D9A0'],
    archived: ['بایگانی', '#8D978F']
  };

  let cfg;
  let orders = [];
  let projects = [];
  let siteData = {};

  // وضعیت ویرایش پروژه
  let modalImages = [];
  let modalCover = '';

  // وضعیت کتابخانه رسانه
  let mediaItems = [];
  let mediaCursor = null;

  const lab = (list, id) => (list.find(o => o.id === id) || {}).label || id || '—';
  const labs = (list, ids) => (ids || []).map(i => lab(list, i)).join('، ') || '—';
  const when = s => new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString('fa-IR');

  const toast = m => {
    const t = $('#toast');
    t.textContent = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  };

  async function api(path, opt = {}) {
    const isForm = opt.body instanceof FormData;
    const headers = {
      ...(opt.body && !isForm && { 'content-type': 'application/json' }),
      ...(opt.headers || {})
    };
    const r = await fetch(path, { ...opt, headers, credentials: 'same-origin' });
    if (r.status === 401) {
      await logout(false);
      const msg = 'رمز ورود اشتباه است یا نشست منقضی شده است.';
      const errEl = $('#loginErr');
      if (errEl) errEl.textContent = msg;
      toast(msg);
      throw new Error(msg);
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'خطایی رخ داد.');
    return j;
  }

  async function logout(callApi = true) {
    if (callApi) {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    }
    $('#panel').hidden = true;
    $('#login').hidden = false;
  }

  // ══════════════════════════════════════════════
  // مدیریت تب‌ها
  // ══════════════════════════════════════════════
  function switchTab(tabId) {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    $('#tab-orders').hidden = tabId !== 'orders';
    $('#tab-projects').hidden = tabId !== 'projects';
    $('#tab-profile').hidden = tabId !== 'profile';
    $('#tab-site').hidden = tabId !== 'site';
    $('#tab-media').hidden = tabId !== 'media';

    if (tabId === 'projects') loadProjects();
    if (tabId === 'profile') loadProfile();
    if (tabId === 'site') loadSiteSettings();
    if (tabId === 'media') loadMediaLibrary(true);
  }

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ══════════════════════════════════════════════
  // اعتبارسنجی و آپلود WebP در کلاینت
  // ══════════════════════════════════════════════
  const MAX_FILE_SIZE = 3 * 1024 * 1024; // ۳ مگابایت

  const MAX_INPUT_SIZE = 30 * 1024 * 1024; // سقف فایل ورودی (قبل از فشرده‌سازی)

  // پیش‌تنظیم ابعاد (px لبه بلند) و کیفیت WebP بر اساس کاربرد تصویر
  const PRESETS = {
    gallery: { max: 1800, q: 0.8, small: true }, // به‌علاوه نسخه ۱۰۸۰px برای موبایل
    cover: { max: 900, q: 0.8 },
    avatar: { max: 500, q: 0.85, square: true },
    splash: { max: 800, q: 0.85 }
  };

  // تغییر اندازه و تبدیل به WebP در مرورگر؛ ورودی JPG / PNG / WebP
  async function compressImage(file, { max, q, square }) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    if (square) {
      const s = Math.min(sw, sh);
      sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s;
    }
    const k = Math.min(1, max / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * k));
    const h = Math.max(1, Math.round(sh * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', q));
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('مرورگر شما از تبدیل تصویر به WebP پشتیبانی نمی‌کند.');
    }
    // اگر WebP اصلی کوچک‌تر بود و نیازی به تغییر ابعاد نبود، همان را نگه دار
    if (!square && k === 1 && file.type === 'image/webp' && blob.size >= file.size) return file;
    return blob;
  }

  async function uploadWebPFile(file, preset = 'gallery') {
    if (!file || !file.type.startsWith('image/')) {
      toast('فایل انتخاب‌شده تصویر معتبر نیست.');
      return null;
    }
    if (file.size > MAX_INPUT_SIZE) {
      toast(`حجم فایل "${file.name}" بیشتر از ۳۰ مگابایت است.`);
      return null;
    }
    try {
      const blob = await compressImage(file, PRESETS[preset] || PRESETS.gallery);
      if (blob.size > MAX_FILE_SIZE) {
        toast(`حجم "${file.name}" پس از بهینه‌سازی هم بیشتر از ۳ مگابایت است.`);
        return null;
      }
      const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
      const formData = new FormData();
      formData.append('file', new File([blob], name, { type: 'image/webp' }));
      if ((PRESETS[preset] || PRESETS.gallery).small) {
        const small = await compressImage(file, { max: 1080, q: 0.75 });
        if (small.size < blob.size) formData.append('small', new File([small], name, { type: 'image/webp' }));
      }
      const res = await api('/api/admin/upload', { method: 'POST', body: formData });
      return res.url;
    } catch (err) {
      toast(err.message);
      return null;
    }
  }

  // ══════════════════════════════════════════════
  // کامپوننت مشترک انتخابگر تصویر (Unified Image Picker)
  // ══════════════════════════════════════════════
  let pickerCallback = null;
  let pickerPreset = 'gallery';

  async function openImagePicker({ title = 'انتخاب یا آپلود تصویر', onSelect, preset = 'gallery' }) {
    pickerCallback = onSelect;
    pickerPreset = preset;
    $('#imagePickerTitle').textContent = title;
    $('#imagePickerModal').hidden = false;
    $('#pickerFileInput').value = '';
    loadPickerMedia();
  }

  function closeImagePicker() {
    $('#imagePickerModal').hidden = true;
    pickerCallback = null;
  }

  $('#closeImagePickerBtn').onclick = closeImagePicker;

  async function loadPickerMedia() {
    $('#pickerMediaGrid').innerHTML = '<p class="hint">در حال بارگذاری تصاویر کتابخانه...</p>';
    try {
      const res = await api('/api/admin/media?limit=24');
      const items = res.items || [];
      if (!items.length) {
        $('#pickerMediaGrid').innerHTML = '<p class="hint">هنوز تصویری در کتابخانه آپلود نشده است.</p>';
        return;
      }
      $('#pickerMediaGrid').innerHTML = items.map(m => `
        <div class="picker-item" data-url="${esc(m.url)}" title="${esc(m.name)}">
          <img src="${esc(thumb(m.url))}" alt="${esc(m.name)}" loading="lazy">
          <span class="picker-item-name">${esc(m.name)}</span>
        </div>
      `).join('');
    } catch (e) {
      $('#pickerMediaGrid').innerHTML = '<p class="hint">خطا در دریافت لیست تصاویر.</p>';
    }
  }

  $('#pickerMediaGrid').addEventListener('click', e => {
    const item = e.target.closest('.picker-item');
    if (!item) return;
    const url = item.dataset.url;
    if (pickerCallback) pickerCallback(url);
    closeImagePicker();
  });

  $('#pickerFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    toast('در حال بهینه‌سازی و آپلود تصویر...');
    const url = await uploadWebPFile(file, pickerPreset);
    if (url) {
      toast('تصویر با موفقیت آپلود شد.');
      if (pickerCallback) pickerCallback(url);
      closeImagePicker();
    }
  });

  // پشتیبانی از Drag & Drop در پیکر
  const dropZone = $('#pickerDropZone');
  ['dragenter', 'dragover'].forEach(n => {
    dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
  });
  dropZone.addEventListener('drop', async e => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    toast('در حال بهینه‌سازی و آپلود تصویر...');
    const url = await uploadWebPFile(file, pickerPreset);
    if (url) {
      toast('تصویر با موفقیت آپلود شد.');
      if (pickerCallback) pickerCallback(url);
      closeImagePicker();
    }
  });

  // ══════════════════════════════════════════════
  // بخش سفارش‌ها (Orders)
  // ══════════════════════════════════════════════
  async function refreshOrders(openId) {
    const p = new URLSearchParams();
    if ($('#status').value) p.set('status', $('#status').value);
    if ($('#q').value.trim()) p.set('q', $('#q').value.trim());

    orders = (await api('/api/admin/orders?' + p)).orders;
    $('#count').textContent = `(${orders.length})`;
    $('#list').innerHTML = orders.length ? orders.map(card).join('') : '<p class="empty">سفارشی پیدا نشد.</p>';
    if (openId) {
      const d = $(`.o[data-id="${openId}"]`);
      if (d) d.open = true;
    }
  }

  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  function card(o) {
    const [t, c] = ST[o.status] || ST.new, wa = '98' + o.phone.slice(1);
    const prop = [lab(cfg.propertyTypes, o.property_type), o.property_state && lab(cfg.propertyStates, o.property_state), o.city, o.area && o.area + ' متر'].filter(Boolean).map(esc).join('، ');
    return `<details class="o" data-id="${o.id}">
      <summary><span class="dot" style="background:${c}"></span><b>${esc(o.name)}</b><span class="code">${esc(o.code)}</span><span class="st" style="color:${c}">${t}</span><small>${when(o.created_at)}</small></summary>
      <div class="act"><a href="tel:${esc(o.phone)}">تماس</a><a href="https://wa.me/${wa}" target="_blank" rel="noopener">واتساپ</a>${o.telegram_id ? `<a href="https://t.me/${esc(o.telegram_id)}" target="_blank" rel="noopener">تلگرام</a>` : ''}</div>
      <dl>
        ${row('موبایل', `<bdi dir="ltr">${esc(o.phone)}</bdi>`)}
        ${row('ترجیح تماس', `${esc(lab(cfg.contactMethods, o.contact_method))} | ${esc(lab(cfg.contactTimes, o.contact_time || 'any'))}${o.telegram_id ? ` | @${esc(o.telegram_id)}` : ''}`)}
        ${row('خدمات', esc(labs(cfg.services, o.services)))}
        ${row('ملک', prop || '—')}
        ${row('اتاق خواب', esc(lab(cfg.rooms, o.rooms)))}
        ${row('سبک', esc(labs(cfg.styles, o.styles)))}
        ${row('بودجه', esc(lab(cfg.budgets, o.budget)))}
        ${row('زمان شروع', esc(lab(cfg.timelines, o.timeline)))}
        ${o.notes ? row('توضیحات', esc(o.notes)) : ''}
        ${o.refs ? row('نمونه‌ها', esc(o.refs)) : ''}
      </dl>
      <div class="edit">
        <select class="in" data-f="status">${Object.entries(ST).map(([k, [n]]) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <textarea class="in" data-f="note" placeholder="یادداشت داخلی (فقط برای شما)">${esc(o.admin_note)}</textarea>
        <button class="btn primary" type="button" data-save="${o.id}">ذخیره</button>
      </div></details>`;
  }

  $('#list').addEventListener('click', async e => {
    const id = e.target.dataset.save;
    if (!id) return;
    const box = e.target.closest('.o');
    try {
      await api('/api/admin/orders/' + id, {
        method: 'PATCH',
        body: JSON.stringify({
          status: box.querySelector('[data-f=status]').value,
          admin_note: box.querySelector('[data-f=note]').value
        })
      });
      toast('تغییرات ذخیره شد');
      await refreshOrders(id);
    } catch (err) {
      toast(err.message);
    }
  });

  $('#csv').onclick = () => {
    const head = ['کد', 'تاریخ', 'وضعیت', 'نام', 'موبایل', 'خدمات', 'نوع ملک', 'شهر', 'متراژ', 'سبک', 'بودجه', 'زمان شروع', 'توضیحات'];
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = orders.map(o => [o.code, when(o.created_at), ST[o.status]?.[0], o.name, o.phone, labs(cfg.services, o.services), lab(cfg.propertyTypes, o.property_type), o.city, o.area, labs(cfg.styles, o.styles), lab(cfg.budgets, o.budget), lab(cfg.timelines, o.timeline), o.notes].map(q).join(','));
    const url = URL.createObjectURL(new Blob(['\ufeff' + [head.map(q).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: 'orders.csv' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ══════════════════════════════════════════════
  // بخش پروژه‌ها (Projects)
  // ══════════════════════════════════════════════
  async function loadProjects() {
    try {
      const res = await api('/api/admin/projects');
      projects = res.projects || [];
      if (res.fallback) {
        toast('دیتابیس در دسترس نیست؛ پروژه‌ها فقط‌خواندنی هستند.');
      }
      $('#pcount').textContent = `(${projects.length})`;
      renderProjectsList();
    } catch (err) {
      toast(err.message);
    }
  }

  function renderProjectsList() {
    if (!projects.length) {
      $('#projectsList').innerHTML = '<p class="empty">هنوز پروژه‌ای ثبت نشده است.</p>';
      return;
    }

    $('#projectsList').innerHTML = projects.map((p, idx) => {
      const cover = p.cover || (p.images && p.images[0]) || '';
      const coverSrc = cover.startsWith('/') || cover.startsWith('http') ? cover : '../' + cover;
      return `
        <div class="project-item ${p.is_active ? '' : 'inactive'}" data-id="${p.id || p.slug}">
          <img class="project-thumb" src="${esc(coverSrc)}" alt="${esc(p.title)}">
          <div class="project-meta">
            <h3>${esc(p.title)} ${p.is_active ? '' : '<span class="badge-dim">مخفی</span>'}</h3>
            <p>${esc(p.category)} &bull; <code dir="ltr">${esc(p.slug)}</code> &bull; ترتیب: ${p.sort_order ?? idx} &bull; ${Array.isArray(p.images) ? p.images.length : 0} تصویر</p>
          </div>
          <div class="project-actions">
            <button class="btn btn-sm" data-action="up" data-idx="${idx}" title="انتقال به بالا" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn btn-sm" data-action="down" data-idx="${idx}" title="انتقال به پایین" ${idx === projects.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="btn btn-sm primary" data-action="edit" data-idx="${idx}">ویرایش</button>
            <button class="btn btn-sm danger" data-action="del" data-idx="${idx}">حذف</button>
          </div>
        </div>
      `;
    }).join('');
  }

  $('#projectsList').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.idx);
    const p = projects[idx];
    if (!p) return;

    if (action === 'edit') {
      openProjectModal(p);
    } else if (action === 'del') {
      if (!confirm(`آیا از حذف پروژه «${p.title}» اطمینان دارید؟`)) return;
      try {
        await api('/api/admin/projects/' + (p.id || p.slug), { method: 'DELETE' });
        toast('پروژه با موفقیت حذف شد.');
        await loadProjects();
      } catch (err) {
        toast(err.message);
      }
    } else if (action === 'up' && idx > 0) {
      await swapSortOrder(idx, idx - 1);
    } else if (action === 'down' && idx < projects.length - 1) {
      await swapSortOrder(idx, idx + 1);
    }
  });

  async function swapSortOrder(idxA, idxB) {
    const pA = projects[idxA];
    const pB = projects[idxB];
    const orderA = pA.sort_order ?? idxA;
    const orderB = pB.sort_order ?? idxB;
    const targetA = orderA === orderB ? idxB : orderB;
    const targetB = orderA === orderB ? idxA : orderA;

    try {
      await Promise.all([
        api('/api/admin/projects/' + (pA.id || pA.slug), { method: 'PATCH', body: JSON.stringify({ sort_order: targetA }) }),
        api('/api/admin/projects/' + (pB.id || pB.slug), { method: 'PATCH', body: JSON.stringify({ sort_order: targetB }) })
      ]);
      await loadProjects();
    } catch (err) {
      toast(err.message);
    }
  }

  // ══════════════════════════════════════════════
  // مدال پروژه (افزودن / ویرایش)
  // ══════════════════════════════════════════════
  function openProjectModal(p = null) {
    $('#projectForm').reset();
    $('#factsList').innerHTML = '';
    modalImages = [];
    modalCover = '';

    if (p) {
      $('#modalTitle').textContent = 'ویرایش پروژه: ' + p.title;
      $('#pId').value = p.id || '';
      $('#pTitle').value = p.title || '';
      $('#pSlug').value = p.slug || '';
      $('#pCat').value = p.category || '';
      $('#pSort').value = p.sort_order ?? 0;
      $('#pSummary').value = p.summary || '';
      $('#pDesc').value = p.description || '';
      $('#pActive').checked = p.is_active !== 0;

      modalImages = Array.isArray(p.images) ? [...p.images] : [];
      modalCover = p.cover || modalImages[0] || '';

      const facts = p.facts || p.info || {};
      for (const [k, v] of Object.entries(facts)) {
        addFactRow(k, v);
      }
    } else {
      $('#modalTitle').textContent = 'پروژه جدید';
      $('#pId').value = '';
      $('#pSort').value = projects.length + 1;
      $('#pActive').checked = true;
      addFactRow('موقعیت', '');
      addFactRow('متراژ', '');
      addFactRow('سال', '');
    }

    renderModalGallery();
    $('#projectModal').hidden = false;
  }

  function closeProjectModal() {
    $('#projectModal').hidden = true;
  }

  $('#newProjectBtn').onclick = () => openProjectModal();
  $('#closeModalBtn').onclick = closeProjectModal;
  $('#cancelModalBtn').onclick = closeProjectModal;

  function addFactRow(k = '', v = '') {
    const row = document.createElement('div');
    row.className = 'fact-row';
    row.innerHTML = `
      <input class="in fact-k" type="text" placeholder="عنوان (مثلاً موقعیت)" value="${esc(k)}">
      <input class="in fact-v" type="text" placeholder="مقدار (مثلاً تهران)" value="${esc(v)}">
      <button class="btn btn-sm btn-del-fact" type="button" title="حذف مشخصه">✕</button>
    `;
    row.querySelector('.btn-del-fact').onclick = () => row.remove();
    $('#factsList').appendChild(row);
  }

  $('#addFactBtn').onclick = () => addFactRow();

  // افزودن تصویر به پروژه با Image Picker
  $('#btnAddProjectImages').onclick = () => {
    openImagePicker({
      title: 'افزودن تصویر به گالری پروژه',
      preset: 'gallery',
      onSelect: url => {
        modalImages.push(url);
        if (!modalCover) modalCover = url;
        renderModalGallery();
      }
    });
  };

  function renderModalGallery() {
    if (!modalImages.length) {
      $('#pGallery').innerHTML = '<p class="empty-gallery">هنوز تصویری برای این پروژه انتخاب نشده است.</p>';
      return;
    }

    $('#pGallery').innerHTML = modalImages.map((src, i) => {
      const isCover = modalCover === src || (!modalCover && i === 0);
      const displaySrc = src.startsWith('/') || src.startsWith('http') ? src : '../' + src;
      return `
        <div class="gallery-item ${isCover ? 'is-cover' : ''}">
          <img src="${esc(displaySrc)}" alt="تصویر ${i + 1}">
          <span class="cover-badge">${isCover ? 'کاور' : ''}</span>
          <div class="gallery-item-tools">
            <button class="btn-tool" type="button" data-act="up" data-idx="${i}" title="حرکت به چپ" ${i === 0 ? 'disabled' : ''}>◄</button>
            <button class="btn-tool" type="button" data-act="down" data-idx="${i}" title="حرکت به راست" ${i === modalImages.length - 1 ? 'disabled' : ''}>►</button>
            <button class="btn-tool primary" type="button" data-act="replace" data-idx="${i}" title="جایگزینی">🔄</button>
            <button class="btn-tool danger" type="button" data-act="del" data-idx="${i}" title="حذف">✕</button>
          </div>
          ${isCover ? '' : `<button class="make-cover" type="button" data-act="cover" data-idx="${i}">انتخاب کاور</button>`}
        </div>
      `;
    }).join('');
  }

  $('#pGallery').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const i = Number(btn.dataset.idx);

    if (act === 'del') {
      const removed = modalImages.splice(i, 1)[0];
      if (modalCover === removed) modalCover = modalImages[0] || '';
      renderModalGallery();
    } else if (act === 'cover') {
      modalCover = modalImages[i] || '';
      renderModalGallery();
    } else if (act === 'up' && i > 0) {
      const temp = modalImages[i];
      modalImages[i] = modalImages[i - 1];
      modalImages[i - 1] = temp;
      renderModalGallery();
    } else if (act === 'down' && i < modalImages.length - 1) {
      const temp = modalImages[i];
      modalImages[i] = modalImages[i + 1];
      modalImages[i + 1] = temp;
      renderModalGallery();
    } else if (act === 'replace') {
      openImagePicker({
        title: 'جایگزینی تصویر پروژه',
        onSelect: newUrl => {
          const oldUrl = modalImages[i];
          modalImages[i] = newUrl;
          if (modalCover === oldUrl) modalCover = newUrl;
          renderModalGallery();
        }
      });
    }
  });

  $('#projectForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('#pId').value;
    const slug = $('#pSlug').value.trim().toLowerCase();
    const title = $('#pTitle').value.trim();
    const category = $('#pCat').value.trim();
    const sort_order = Number($('#pSort').value) || 0;
    const summary = $('#pSummary').value.trim();
    const description = $('#pDesc').value.trim();
    const is_active = $('#pActive').checked ? 1 : 0;

    const facts = {};
    $$('#factsList .fact-row').forEach(r => {
      const k = r.querySelector('.fact-k').value.trim();
      const v = r.querySelector('.fact-v').value.trim();
      if (k) facts[k] = v;
    });

    const payload = {
      slug,
      title,
      category,
      sort_order,
      summary,
      description,
      is_active,
      cover: modalCover || modalImages[0] || '',
      images: modalImages,
      facts
    };

    try {
      if (id) {
        await api('/api/admin/projects/' + id, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        toast('پروژه با موفقیت به‌روزرسانی شد.');
      } else {
        await api('/api/admin/projects', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast('پروژه جدید با موفقیت ایجاد شد.');
      }
      closeProjectModal();
      await loadProjects();
    } catch (err) {
      toast(err.message);
    }
  });

  // ══════════════════════════════════════════════
  // بخش پروفایل و ۴ حباب (Profile & 4 Bubbles)
  // ══════════════════════════════════════════════
  let profileAvatarUrl = '';

  async function loadProfile() {
    try {
      siteData = await (await fetch('/api/site')).json().catch(() => ({}));
      const prof = siteData.profile || {};
      $('#profName').value = prof.name || 'محمد فهیمی';
      $('#profRoles').value = Array.isArray(prof.roles) ? prof.roles.join('، ') : (prof.roles || 'طراح داخلی، نقشه‌کش');

      const bubbles = Array.isArray(prof.bubbles) && prof.bubbles.length >= 4
        ? prof.bubbles
        : ['محمد فهیمی', 'طراح داخلی', 'نقشه‌کش', 'از ایده تا اجرا'];

      $('#profBubble1').value = bubbles[0] || 'محمد فهیمی';
      $('#profBubble2').value = bubbles[1] || 'طراح داخلی';
      $('#profBubble3').value = bubbles[2] || 'نقشه‌کش';
      $('#profBubble4').value = bubbles[3] || 'از ایده تا اجرا';

      $('#profAbout').value = siteData.about || '';
      profileAvatarUrl = prof.image || '';

      updateAvatarPreview(profileAvatarUrl, prof.name || 'محمد فهیمی');
    } catch (err) {
      toast('خطا در دریافت اطلاعات پروفایل: ' + err.message);
    }
  }

  function updateAvatarPreview(url, name) {
    const img = $('#avatarPreview');
    const fb = $('#avatarFallbackPreview');
    const initials = (name || 'م‌ف')
      .split(/\s+/)
      .filter(Boolean)
      .map(p => p[0])
      .slice(0, 2)
      .join('‌') || 'م‌ف';
    fb.textContent = initials;

    if (url) {
      img.src = url.startsWith('/') || url.startsWith('http') ? url : '../' + url;
      img.style.display = 'block';
      fb.style.display = 'none';
    } else {
      img.style.display = 'none';
      fb.style.display = 'flex';
    }
  }

  $('#btnPickAvatar').onclick = () => {
    openImagePicker({
      title: 'انتخاب تصویر آواتار پروفایل',
      preset: 'avatar',
      onSelect: url => {
        profileAvatarUrl = url;
        updateAvatarPreview(url, $('#profName').value);
      }
    });
  };

  $('#btnRemoveAvatar').onclick = () => {
    profileAvatarUrl = '';
    updateAvatarPreview('', $('#profName').value);
    toast('تصویر آواتار برداشته شد.');
  };

  $('#profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#profName').value.trim() || 'محمد فهیمی';
    const roles = $('#profRoles').value.split(/[،,]/).map(s => s.trim()).filter(Boolean);
    const bubble1 = $('#profBubble1').value.trim() || 'محمد فهیمی';
    const bubble2 = $('#profBubble2').value.trim() || 'طراح داخلی';
    const bubble3 = $('#profBubble3').value.trim() || 'نقشه‌کش';
    const bubble4 = $('#profBubble4').value.trim() || 'از ایده تا اجرا';
    const about = $('#profAbout').value.trim();

    const payload = {
      profile: {
        name,
        roles,
        bubbles: [bubble1, bubble2, bubble3, bubble4],
        image: profileAvatarUrl
      },
      about
    };

    try {
      await api('/api/admin/site', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      toast('اطلاعات پروفایل و ۴ حباب با موفقیت ذخیره شد.');
    } catch (err) {
      toast(err.message);
    }
  });

  // ══════════════════════════════════════════════
  // بخش تنظیمات سایت و اسپلش (Site Settings)
  // ══════════════════════════════════════════════
  let splashLogoUrl = '';
  let splashImageUrl = '';

  async function loadSiteSettings() {
    try {
      siteData = await (await fetch('/api/site')).json().catch(() => ({}));
      $('#siteName').value = siteData.name || '';
      $('#siteTagline').value = siteData.tagline || '';

      const splash = siteData.splash || {};
      splashLogoUrl = splash.logo || '';
      splashImageUrl = splash.image || '';

      updateSiteImagePreview('splashLogo', splashLogoUrl);
      updateSiteImagePreview('splashImage', splashImageUrl);
    } catch (err) {
      toast('خطا در دریافت تنظیمات سایت: ' + err.message);
    }
  }

  function updateSiteImagePreview(prefix, url) {
    const img = $(`#${prefix}Preview`);
    const empty = $(`#${prefix}Empty`);
    if (url) {
      img.src = url.startsWith('/') || url.startsWith('http') ? url : '../' + url;
      img.style.display = 'block';
      if (empty) empty.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (empty) empty.style.display = 'block';
    }
  }

  $('#btnPickSplashLogo').onclick = () => {
    openImagePicker({
      title: 'انتخاب لوگوی اسپلش',
      preset: 'splash',
      onSelect: url => {
        splashLogoUrl = url;
        updateSiteImagePreview('splashLogo', url);
      }
    });
  };

  $('#btnRemoveSplashLogo').onclick = () => {
    splashLogoUrl = '';
    updateSiteImagePreview('splashLogo', '');
  };

  $('#btnPickSplashImage').onclick = () => {
    openImagePicker({
      title: 'انتخاب تصویر پس‌زمینه اسپلش',
      preset: 'splash',
      onSelect: url => {
        splashImageUrl = url;
        updateSiteImagePreview('splashImage', url);
      }
    });
  };

  $('#btnRemoveSplashImage').onclick = () => {
    splashImageUrl = '';
    updateSiteImagePreview('splashImage', '');
  };

  $('#siteSettingsForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#siteName').value.trim();
    const tagline = $('#siteTagline').value.trim();

    const payload = {
      name,
      tagline,
      splash: {
        logo: splashLogoUrl,
        image: splashImageUrl,
        lines: siteData.splash?.lines || ['طراحی داخلی', 'معماری و اجرا', 'از ایده تا اجرا']
      }
    };

    try {
      await api('/api/admin/site', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      toast('تنظیمات استودیو و اسپلش ذخیره شد.');
    } catch (err) {
      toast(err.message);
    }
  });

  // ══════════════════════════════════════════════
  // بخش کتابخانه رسانه (Media Library - Workers KV)
  // ══════════════════════════════════════════════
  async function loadMediaLibrary(reset = false) {
    if (reset) {
      mediaItems = [];
      mediaCursor = null;
    }

    const p = new URLSearchParams({ limit: '30' });
    if (mediaCursor) p.set('cursor', mediaCursor);

    try {
      const res = await api('/api/admin/media?' + p);
      if (reset) mediaItems = res.items || [];
      else mediaItems = [...mediaItems, ...(res.items || [])];

      mediaCursor = res.cursor || null;
      $('#mcount').textContent = `(${mediaItems.length})`;
      renderMediaLibrary();

      $('#mediaLoadMoreWrap').hidden = Boolean(res.list_complete || !mediaCursor);
    } catch (err) {
      toast(err.message);
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderMediaLibrary() {
    if (!mediaItems.length) {
      $('#mediaGrid').innerHTML = '<p class="empty" style="grid-column:1/-1">هنوز تصویری در کتابخانه ذخیره نشده است.</p>';
      return;
    }

    $('#mediaGrid').innerHTML = mediaItems.map(m => {
      const cleanKey = m.key.replace(/^img:/, '');
      const usageBadges = m.in_use && m.used_in.length
        ? `<div class="in-use-pill" title="استفاده شده در: ${esc(m.used_in.join('، '))}">در حال استفاده (${m.used_in.length})</div>`
        : `<div class="unused-pill">بدون استفاده</div>`;

      return `
        <div class="media-card" data-key="${esc(m.key)}" data-url="${esc(m.url)}">
          <div class="media-thumb-wrap">
            <img class="media-thumb" src="${esc(thumb(m.url))}" alt="${esc(m.name)}" loading="lazy">
            ${usageBadges}
          </div>
          <div class="media-info">
            <div class="media-name" title="${esc(m.name)}">${esc(m.name)}</div>
            <div class="media-sub">${formatBytes(m.size)} &bull; <code dir="ltr">${esc(cleanKey.slice(0, 10))}...</code></div>
          </div>
          <div class="media-card-actions">
            <button class="btn btn-sm btn-copy-url" type="button" data-url="${esc(m.url)}">کپی آدرس</button>
            <button class="btn btn-sm danger btn-del-media" type="button" data-key="${esc(m.key)}" ${m.in_use ? 'data-inuse="1"' : ''}>حذف</button>
          </div>
        </div>
      `;
    }).join('');
  }

  $('#btnUploadMediaDirect').onclick = () => $('#mediaDirectFileInput').click();

  $('#mediaDirectFileInput').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    toast('در حال آپلود تصاویر به Workers KV...');
    let success = 0;
    for (const f of files) {
      const url = await uploadWebPFile(f);
      if (url) success++;
    }
    e.target.value = '';
    toast(`${success} تصویر با موفقیت به کتابخانه افزوده شد.`);
    await loadMediaLibrary(true);
  });

  $('#btnLoadMoreMedia').onclick = () => loadMediaLibrary(false);

  $('#mediaGrid').addEventListener('click', async e => {
    // کپی URL
    const btnCopy = e.target.closest('.btn-copy-url');
    if (btnCopy) {
      const url = btnCopy.dataset.url;
      const fullUrl = location.origin + url;
      navigator.clipboard.writeText(fullUrl).then(() => {
        toast('آدرس تصویر در کلیپ‌بورد کپی شد.');
      }).catch(() => {
        prompt('آدرس تصویر:', fullUrl);
      });
      return;
    }

    // حذف تصویر
    const btnDel = e.target.closest('.btn-del-media');
    if (btnDel) {
      const key = btnDel.dataset.key;
      if (btnDel.dataset.inuse) {
        toast('این تصویر در سایت در حال استفاده است و برای جلوگیری از خراب شدن صفحات حذف آن مجاز نیست.');
        return;
      }
      if (!confirm('آیا از حذف دائمی این تصویر از Workers KV اطمینان دارید؟')) return;

      try {
        await api('/api/admin/media/' + encodeURIComponent(key), { method: 'DELETE' });
        toast('تصویر با موفقیت حذف شد.');
        await loadMediaLibrary(true);
      } catch (err) {
        toast(err.message);
      }
    }
  });

  // ══════════════════════════════════════════════
  // ورود و مقداردهی اولیه
  // ══════════════════════════════════════════════
  async function enter() {
    try {
      await refreshOrders();
      await loadProjects();
      $('#login').hidden = true;
      $('#panel').hidden = false;
    } catch (e) {
      await logout(false);
      $('#loginErr').textContent = e.message;
      throw e;
    }
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const password = $('#pass').value;
    $('#loginErr').textContent = '';
    const btn = $('#loginForm button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      $('#pass').value = '';
      await enter();
    } catch (err) {
      $('#loginErr').textContent = err.message || 'رمز ورود نامعتبر است.';
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  $('#refresh').onclick = () => {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'orders';
    if (activeTab === 'orders') refreshOrders().then(() => toast('سفارش‌ها به‌روز شدند.')).catch(e => toast(e.message));
    if (activeTab === 'projects') loadProjects().then(() => toast('پروژه‌ها به‌روز شدند.')).catch(e => toast(e.message));
    if (activeTab === 'profile') loadProfile().then(() => toast('پروفایل به‌روز شد.')).catch(e => toast(e.message));
    if (activeTab === 'site') loadSiteSettings().then(() => toast('تنظیمات سایت به‌روز شد.')).catch(e => toast(e.message));
    if (activeTab === 'media') loadMediaLibrary(true).then(() => toast('کتابخانه به‌روز شد.')).catch(e => toast(e.message));
  };

  $('#logout').onclick = () => logout(true);
  $('#status').onchange = () => refreshOrders().catch(e => toast(e.message));
  let t;
  $('#q').oninput = () => {
    clearTimeout(t);
    t = setTimeout(() => refreshOrders().catch(() => {}), 300);
  };

  const fallbackSvg = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%232A312D' width='100' height='100'/></svg>";
  const avatarImg = $('#avatarPreview');
  if (avatarImg) {
    avatarImg.addEventListener('error', () => {
      avatarImg.style.display = 'none';
      const fb = $('#avatarFallbackPreview');
      if (fb) fb.style.display = 'flex';
    });
  }
  const splashLogoImg = $('#splashLogoPreview');
  if (splashLogoImg) {
    splashLogoImg.addEventListener('error', () => {
      splashLogoImg.style.display = 'none';
    });
  }
  const splashImageImg = $('#splashImagePreview');
  if (splashImageImg) {
    splashImageImg.addEventListener('error', () => {
      splashImageImg.style.display = 'none';
    });
  }
  $('#projectsList')?.addEventListener('error', e => {
    if (e.target && e.target.tagName === 'IMG' && e.target.src !== fallbackSvg) {
      e.target.src = fallbackSvg;
    }
  }, true);
  $('#modalImagesContainer')?.addEventListener('error', e => {
    if (e.target && e.target.tagName === 'IMG' && e.target.src !== fallbackSvg) {
      e.target.src = fallbackSvg;
    }
  }, true);

  fetch('../data/order.json').then(r => r.json()).then(c => {
    cfg = c;
    $('#status').innerHTML = '<option value="">همه وضعیت‌ها</option>' + Object.entries(ST).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('');
    enter().catch(() => {
      $('#login').hidden = false;
      $('#panel').hidden = true;
    });
  });
})();
