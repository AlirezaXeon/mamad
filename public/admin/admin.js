(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ST = {
    new: ['جدید', '#8FB39E'],
    review: ['در حال بررسی', '#E0C27A'],
    contacted: ['تماس گرفته شد', '#7FB2D9'],
    contract: ['قرارداد شد', '#A3D9A0'],
    archived: ['بایگانی', '#8D978F']
  };

  let pass = sessionStorage.getItem('adm') || '';
  let cfg;
  let orders = [];
  let projects = [];
  let siteData = {};

  // وضعیت ویرایش پروژه
  let modalImages = [];
  let modalCover = '';

  const lab = (list, id) => (list.find(o => o.id === id) || {}).label || id || '—';
  const labs = (list, ids) => (ids || []).map(i => lab(list, i)).join('، ') || '—';
  const when = s => new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString('fa-IR');

  const toast = m => {
    const t = $('#toast');
    t.textContent = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  };

  async function api(path, opt = {}) {
    const isForm = opt.body instanceof FormData;
    const headers = {
      ...(opt.body && !isForm && { 'content-type': 'application/json' }),
      authorization: 'Bearer ' + encodeURIComponent(pass)
    };
    const r = await fetch(path, { ...opt, headers });
    if (r.status === 401) {
      logout();
      throw new Error('رمز ورود اشتباه است یا منقضی شده است.');
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'خطایی رخ داد.');
    return j;
  }

  function logout() {
    pass = '';
    sessionStorage.removeItem('adm');
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

    if (tabId === 'projects') loadProjects();
    if (tabId === 'profile') loadProfile();
  }

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ══════════════════════════════════════════════
  // اعتبارسنجی و آپلود WebP در کلاینت
  // ══════════════════════════════════════════════
  const MAX_FILE_SIZE = 3 * 1024 * 1024; // ۳ مگابایت

  function validateWebP(file) {
    if (!file) return false;
    const isNameWebP = file.name.toLowerCase().endsWith('.webp');
    const isTypeWebP = file.type === 'image/webp';
    if (!isNameWebP && !isTypeWebP) {
      toast(`فایل "${file.name}" باید با فرمت WebP باشد.`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast(`حجم فایل "${file.name}" بیشتر از ۳ مگابایت است.`);
      return false;
    }
    return true;
  }

  async function uploadWebPFile(file) {
    if (!validateWebP(file)) return null;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      return res.url;
    } catch (err) {
      toast(err.message);
      return null;
    }
  }

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
      return `
        <div class="project-item ${p.is_active ? '' : 'inactive'}" data-id="${p.id || p.slug}">
          <img class="project-thumb" src="../${cover}" alt="${esc(p.title)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%232A312D%22 width=%22100%22 height=%22100%22/></svg>'">
          <div class="project-meta">
            <h3>${esc(p.title)} ${p.is_active ? '' : '<span class="badge-dim">مخفی</span>'}</h3>
            <p>${esc(p.category)} &bull; <code dir="ltr">${esc(p.slug)}</code> &bull; ترتیب: ${p.sort_order ?? idx}</p>
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

  // مشخصات کلیدی داینامیک
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

  // آپلود عکس پروژه (فقط WebP)
  $('#projectFilesInput').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    toast('در حال آپلود تصاویر WebP...');
    for (const f of files) {
      const url = await uploadWebPFile(f);
      if (url) {
        modalImages.push(url);
        if (!modalCover) modalCover = url;
      }
    }
    renderModalGallery();
    e.target.value = '';
    toast('تصاویر با موفقیت اضافه شدند.');
  });

  function renderModalGallery() {
    if (!modalImages.length) {
      $('#pGallery').innerHTML = '<p class="empty-gallery">هنوز تصویری آپلود نشده است.</p>';
      return;
    }

    $('#pGallery').innerHTML = modalImages.map((src, i) => {
      const isCover = modalCover === src || (!modalCover && i === 0);
      return `
        <div class="gallery-item ${isCover ? 'is-cover' : ''}">
          <img src="../${src}" alt="تصویر ${i + 1}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%232A312D%22 width=%22100%22 height=%22100%22/></svg>'">
          <span class="cover-badge">${isCover ? 'کاور اصلی' : ''}</span>
          <button class="del-img" type="button" data-idx="${i}" title="حذف">✕</button>
          ${isCover ? '' : `<button class="make-cover" type="button" data-idx="${i}">انتخاب کاور</button>`}
        </div>
      `;
    }).join('');
  }

  $('#pGallery').addEventListener('click', e => {
    if (e.target.classList.contains('del-img')) {
      const i = Number(e.target.dataset.idx);
      const removed = modalImages.splice(i, 1)[0];
      if (modalCover === removed) {
        modalCover = modalImages[0] || '';
      }
      renderModalGallery();
    } else if (e.target.classList.contains('make-cover')) {
      const i = Number(e.target.dataset.idx);
      modalCover = modalImages[i] || '';
      renderModalGallery();
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

    // استخراج مشخصات پروژه
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
  // بخش پروفایل (Profile)
  // ══════════════════════════════════════════════
  let profileAvatarUrl = '';

  async function loadProfile() {
    try {
      siteData = await (await fetch('/api/site')).json().catch(() => ({}));
      const prof = siteData.profile || {};
      $('#profName').value = prof.name || 'محمد فهیمی';
      $('#profRoles').value = Array.isArray(prof.roles) ? prof.roles.join('، ') : (prof.roles || 'طراح داخلی، نقشه‌کش');

      const bubbles = Array.isArray(prof.bubbles) ? prof.bubbles : ['محمد فهیمی', 'طراح داخلی و نقشه‌کش'];
      $('#profBubble1').value = bubbles[0] || 'محمد فهیمی';
      $('#profBubble2').value = bubbles[1] || 'طراح داخلی و نقشه‌کش';

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

  $('#avatarFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    toast('در حال آپلود عکس پروفایل WebP...');
    const url = await uploadWebPFile(file);
    if (url) {
      profileAvatarUrl = url;
      updateAvatarPreview(url, $('#profName').value);
      toast('عکس پروفایل آپلود شد (جهت ثبت دکمه ذخیره را بزنید).');
    }
    e.target.value = '';
  });

  $('#profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#profName').value.trim() || 'محمد فهیمی';
    const roles = $('#profRoles').value.split(/[،,]/).map(s => s.trim()).filter(Boolean);
    const bubble1 = $('#profBubble1').value.trim() || name;
    const bubble2 = $('#profBubble2').value.trim() || (roles[0] || 'طراح داخلی');
    const about = $('#profAbout').value.trim();

    const payload = {
      profile: {
        name,
        roles,
        bubbles: [bubble1, bubble2],
        image: profileAvatarUrl
      },
      about
    };

    try {
      await api('/api/admin/site', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      toast('اطلاعات پروفایل و حباب‌ها با موفقیت ذخیره شد.');
    } catch (err) {
      toast(err.message);
    }
  });

  // ══════════════════════════════════════════════
  // ورود و مقداردهی اولیه
  // ══════════════════════════════════════════════
  async function enter() {
    $('#login').hidden = true;
    $('#panel').hidden = false;
    try {
      await refreshOrders();
      await loadProjects();
    } catch (e) {
      $('#loginErr').textContent = e.message;
    }
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    pass = $('#pass').value;
    sessionStorage.setItem('adm', pass);
    $('#loginErr').textContent = '';
    await enter();
  });

  $('#refresh').onclick = () => {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'orders';
    if (activeTab === 'orders') refreshOrders().then(() => toast('سفارش‌ها به‌روز شدند.')).catch(e => toast(e.message));
    if (activeTab === 'projects') loadProjects().then(() => toast('پروژه‌ها به‌روز شدند.')).catch(e => toast(e.message));
    if (activeTab === 'profile') loadProfile().then(() => toast('پروفایل به‌روز شد.')).catch(e => toast(e.message));
  };

  $('#logout').onclick = logout;
  $('#status').onchange = () => refreshOrders().catch(e => toast(e.message));
  let t;
  $('#q').oninput = () => {
    clearTimeout(t);
    t = setTimeout(() => refreshOrders().catch(() => {}), 300);
  };

  fetch('../data/order.json').then(r => r.json()).then(c => {
    cfg = c;
    $('#status').innerHTML = '<option value="">همه وضعیت‌ها</option>' + Object.entries(ST).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('');
    pass ? enter() : ($('#login').hidden = false);
  });
})();
