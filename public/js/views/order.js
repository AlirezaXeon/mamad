import { h, app, en, toEn, num, copyText } from '../utils.js';
import { load, loadOrder } from '../store.js';
import { openModal } from '../components/modal.js';
import { choices } from '../components/choice.js';
import { helpButton } from '../components/help.js';
import { icon, svg } from '../components/icons.js';
import { submitOrder, uploadOrderPhoto } from '../api.js';

const DRAFT = 'orderDraft', STEPS = 4, MAX_PHOTOS = 6, MAX_PHOTO_MB = 10;
const blank = () => ({ services: [], propertyType: '', city: '', area: '', styles: [], name: '', phone: '', contactMethod: 'call', website: '' });
let state = blank(), step = 0;
let photos = []; // فایلهای انتخابشده (در پیشنویس ذخیره نمیشوند)
try { const d = JSON.parse(sessionStorage.getItem(DRAFT)); if (d) { state = { ...blank(), ...d.state }; step = Math.min(d.step || 0, STEPS - 1); } } catch {}
const save = () => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ state, step })); } catch {} };
const set = (k, v) => { state[k] = v; save(); };
const lab = (list, id) => (list.find(o => o.id === id) || {}).label || '';
const phoneOk = p => /^(\+98|0098|98|0)?9\d{9}$/.test(toEn(p).replace(/[\s-]/g, ''));
const mb = n => en((n / 1048576).toFixed(1));
const isImg = f => /^image\//.test(f.type) || /\.(heic|heif|avif|jpe?g|png|webp|gif|bmp|tiff?)$/i.test(f.name);

// ---------- ورود ----------
export async function order() {
  const [{ site }, cfg] = await Promise.all([load(), loadOrder()]);
  document.title = 'ثبت سفارش | ' + site.name;
  draw(cfg, site);
}

// نکات قبل از ثبت: اختیاری، بدون تیک اجباری
function showGuide(cfg) {
  const g = cfg.guide;
  let dlg;
  dlg = openModal({
    title: g.title,
    content: h('div', {},
      h('p', { class: 'lead' }, g.intro),
      h('ol', { class: 'guide' }, g.points.map((t, i) => h('li', {}, h('b', {}, en(i + 1)), h('span', {}, t)))),
      h('button', { class: 'btn primary', type: 'button', onclick: () => dlg.close() }, 'متوجه شدم')),
  });
}

// ---------- ساختار فرم ----------
const title = (t, s, help) => [
  h('h2', { class: 'st' }, t),
  s && h('p', { class: 'ss', style: help ? 'display:flex;align-items:center;gap:8px' : null }, h('span', {}, s), help)
];
const field = (label, control, help, hint) => h('div', { class: 'field' },
  (label || help) ? h('div', { class: 'lbl' }, label ? h('span', {}, label) : null, help) : null,
  hint && h('p', { class: 'hint' }, hint),
  control
);
const text = (k, o = {}) => h('input', { class: 'in' + (o.ltr ? ' ltr' : ''), value: state[k], autocomplete: o.ac || 'off', placeholder: o.ph || '', inputmode: o.mode, dir: o.ltr ? 'ltr' : null, oninput: e => set(k, e.target.value) });

const sServices = cfg => h('div', {}, title('چه خدماتی نیاز دارید؟', 'یک یا چند مورد را انتخاب کنید.', helpButton(cfg.helps.services)),
  field('', choices({ options: cfg.services, multi: true, value: state.services, variant: 'cards', onchange: v => set('services', v),
    render: o => [icon(o.id), h('b', {}, o.label), h('small', {}, o.desc)] })));

// انتخابگر عکس: هر فرمت تصویری، حداکثر ۱۰ مگابایت برای هر عکس
function photoPicker() {
  const list = h('ul', { class: 'ph-list' });
  const msg = h('p', { class: 'ph-msg', role: 'alert' });
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', multiple: '', hidden: '' });
  const add = h('button', { class: 'btn', type: 'button', onclick: () => input.click() }, '+ افزودن عکس');
  const draw = () => {
    list.replaceChildren(...photos.map((f, i) => h('li', {},
      h('span', { class: 'ph-name' }, f.name),
      h('small', {}, mb(f.size) + ' MB'),
      h('button', { type: 'button', 'aria-label': 'حذف', onclick: () => { photos.splice(i, 1); draw(); } }, '×'))));
    add.disabled = photos.length >= MAX_PHOTOS;
  };
  input.addEventListener('change', () => {
    const errs = [];
    for (const f of input.files) {
      if (photos.length >= MAX_PHOTOS) { errs.push(`حداکثر ${en(MAX_PHOTOS)} عکس مجاز است.`); break; }
      if (!isImg(f)) errs.push(`«${f.name}» تصویر نیست.`);
      else if (f.size > MAX_PHOTO_MB * 1048576) errs.push(`«${f.name}» بیشتر از ${en(MAX_PHOTO_MB)} مگابایت است.`);
      else photos.push(f);
    }
    input.value = '';
    msg.textContent = errs.join(' ');
    draw();
  });
  draw();
  return h('div', { class: 'ph' }, add, input, msg, list);
}

const sProperty = cfg => {
  const area = h('input', { class: 'in', value: state.area, inputmode: 'decimal', autocomplete: 'off', placeholder: 'مثلاً 120', 'aria-label': 'متراژ', oninput: e => set('area', e.target.value) });
  const use = v => { area.value = en(v); set('area', String(v)); };
  return h('div', {}, title('مشخصات ملک', 'اطلاعات تقریبی هم کافی است.'),
    field('نوع ملک', choices({ options: cfg.propertyTypes, value: state.propertyType, onchange: v => set('propertyType', v) })),
    field('متراژ', h('div', { class: 'with-unit' }, area, h('span', { class: 'unit' }, 'متر مربع')), helpButton(cfg.helps.area, { onUse: use }),
      'بلد نیستید اندازه بگیرید؟ روی «؟» بزنید.'),
    field('شهر', text('city', { ph: 'مثلاً اردبیل', ac: 'address-level2' })),
    field('عکس یا نقشه ملک (اختیاری)', photoPicker(), null,
      `تا ${en(MAX_PHOTOS)} عکس، هر کدام حداکثر ${en(MAX_PHOTO_MB)} مگابایت، با هر فرمت تصویری.`));
};

const sStyle = cfg => h('div', {}, title('سبک طراحی', 'سلیقه شما مسیر طراحی را مشخص میکند.'),
  field('سبک طراحی (حداکثر 2 مورد)', choices({ options: cfg.styles, multi: true, max: 2, exclusive: 'unsure', value: state.styles, variant: 'cards', onchange: v => set('styles', v),
    render: o => [h('b', {}, o.label), h('small', {}, o.desc), o.palette.length ? h('span', { class: 'pal' }, o.palette.map(c => h('i', { style: `background:${c}` }))) : null] }), helpButton(cfg.helps.style)));

const row = (label, val, to, redraw) => val ? h('div', {}, h('dt', {}, label), h('dd', {}, val), h('button', { type: 'button', onclick: () => { step = to; save(); redraw(); scrollTo(0, 0); } }, 'ویرایش')) : null;

const sContact = (cfg, redraw) => {
  const prop = [lab(cfg.propertyTypes, state.propertyType), state.city, state.area && en(num(state.area)) + ' متر'].filter(Boolean).join('، ');
  return h('div', {}, title('اطلاعات تماس', 'برای هماهنگی سفارش با شما تماس میگیریم.'),
    field('نام و نام خانوادگی', text('name', { ac: 'name', ph: 'مثلاً علی رضایی' })),
    field('شماره موبایل', text('phone', { ac: 'tel', ph: '09123456789', ltr: true, mode: 'tel' }), helpButton(cfg.helps.contact)),
    field('ترجیح میدهید از چه راهی تماس بگیریم؟', choices({ options: cfg.contactMethods, value: state.contactMethod, onchange: v => set('contactMethod', v || 'call') })),
    h('input', { class: 'hp', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', oninput: e => set('website', e.target.value) }),
    h('h3', { class: 'sum-t' }, 'خلاصه سفارش'),
    h('dl', { class: 'sum' },
      row('خدمات', state.services.map(i => lab(cfg.services, i)).join('، '), 0, redraw),
      row('ملک', prop, 1, redraw),
      row('عکسها', photos.length ? en(photos.length) + ' عکس' : '', 1, redraw),
      row('سبک', state.styles.map(i => lab(cfg.styles, i)).join('، '), 2, redraw)));
};

const STEP_VIEWS = [sServices, sProperty, sStyle, sContact];

function validate(i) {
  if (i === 0 && !state.services.length) return 'حداقل یک خدمت را انتخاب کنید.';
  if (i === 1) {
    if (!state.propertyType) return 'نوع ملک را انتخاب کنید.';
    const a = num(state.area);
    if (!(a >= 5 && a <= 10000)) return 'متراژ را به متر مربع وارد کنید (بین 5 تا 10,000).';
  }
  if (i === 2 && !state.styles.length) return 'حداقل یک سبک را انتخاب کنید (یا «هنوز نمیدانم»).';
  if (i === 3) {
    if (state.name.trim().length < 2) return 'نام خود را وارد کنید.';
    if (!phoneOk(state.phone)) return 'شماره موبایل معتبر نیست (مثال: 09123456789).';
  }
  return '';
}

function draw(cfg, site) {
  const redraw = () => draw(cfg, site);
  const last = step === STEPS - 1;
  const err = h('p', { class: 'o-err', role: 'alert' });
  const go = d => { step += d; save(); redraw(); scrollTo(0, 0); };
  const next = h('button', { class: 'btn primary', type: 'button' }, last ? 'ثبت نهایی سفارش' : 'ادامه');
  next.addEventListener('click', () => {
    const msg = validate(step);
    err.textContent = msg;
    if (msg) { err.classList.remove('shake'); void err.offsetWidth; err.classList.add('shake'); return; }
    last ? send(next, err, site) : go(1);
  });
  app.replaceChildren(h('section', { class: 'order' },
    h('header', { class: 'o-head' },
      h('h1', { class: 'o-title' }, 'ثبت سفارش'),
      h('p', { class: 'o-meta' }, h('span', {}, `مرحله ${en(step + 1)} از ${en(STEPS)}`), h('span', {}, cfg.steps[step])),
      h('div', { class: 'o-steps', 'aria-hidden': 'true' }, cfg.steps.map((_, i) => h('i', { class: i < step ? 'is-done' : i === step ? 'is-cur' : '' }))),
      step === 0 && h('p', { class: 'o-note' }, `${en(STEPS)} مرحله، حدود 3 دقیقه، بدون تعهد · `,
        h('button', { class: 'o-guide', type: 'button', onclick: () => showGuide(cfg) }, 'نکات قبل از شروع'))),
    h('div', { class: 'step' }, STEP_VIEWS[step](cfg, redraw)),
    h('div', { class: 'o-bar' }, h('div', {}, err,
      h('div', { class: 'o-btns' },
        h('button', { class: 'btn', type: 'button', onclick: () => step ? go(-1) : (location.hash = '/') }, step ? 'قبلی' : 'انصراف'), next)))));
}

async function send(btn, err, site) {
  btn.disabled = true; btn.textContent = 'در حال ثبت…';
  try {
    const d = await submitOrder({ ...state, photoCount: photos.length, phone: toEn(state.phone).replace(/[\s-]/g, ''), area: num(state.area) });
    try { sessionStorage.removeItem(DRAFT); } catch {}
    const files = photos;
    state = blank(); step = 0; photos = [];
    done(d.code, site, d.token, files);
  } catch (e) {
    err.textContent = e.status ? e.message : 'اتصال برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.';
    btn.disabled = false; btn.textContent = 'ثبت نهایی سفارش';
  }
}

// ---------- ارسال عکسها بعد از ثبت سفارش (یکییکی، با تلاش مجدد) ----------
function photoStatus(code, token, files) {
  const list = h('ul', { class: 'up-list' });
  const items = files.map(f => {
    const st = h('span', { class: 'up-st' }, 'در صف');
    list.append(h('li', {}, h('span', { class: 'ph-name' }, f.name), st));
    return { f, st };
  });
  const run = async it => {
    it.st.className = 'up-st'; it.st.textContent = 'در حال ارسال…';
    try {
      await uploadOrderPhoto(code, token, it.f);
      it.st.className = 'up-st ok'; it.st.textContent = '✓ ارسال شد';
    } catch (e) {
      it.st.className = 'up-st bad';
      it.st.replaceChildren(h('button', { type: 'button', title: e.message, onclick: () => run(it) }, 'ناموفق، تلاش مجدد'));
    }
  };
  (async () => { for (const it of items) await run(it); })();
  return h('div', { class: 'up' },
    h('h3', { class: 'sum-t' }, 'ارسال عکسها'),
    h('p', { class: 'hint' }, 'تا پایان ارسال، این صفحه را نبندید.'),
    list);
}

// ---------- صفحه موفقیت ----------
function done(code, site, token, files = []) {
  const oc = site.orderContact || {};
  const tg = (oc.telegram && oc.telegram !== 'your_telegram_id') ? oc.telegram.trim() : '';
  const wa = (oc.whatsapp && oc.whatsapp !== '989120000000') ? oc.whatsapp.trim() : '';
  const copy = h('button', { class: 'code', type: 'button', 'aria-label': 'کپی کد پیگیری', onclick: async () => {
    const ok = await copyText(code);
    if (ok) {
      copy.dataset.ok = '1';
      setTimeout(() => delete copy.dataset.ok, 1400);
    }
  } }, code);
  scrollTo(0, 0);
  app.replaceChildren(h('section', { class: 'order order-done' },
    svg('<svg class="ok" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 14-16"/></svg>'),
    h('h1', {}, 'سفارش شما ثبت شد'),
    h('p', { class: 'lead' }, 'کد پیگیری شما (برای کپی لمس کنید):'),
    copy,
    files.length ? photoStatus(code, token, files) : null,
    h('ol', { class: 'guide next-steps' },
      ['ما در اولین فرصت با شمارهای که وارد کردید تماس میگیریم.',
       'اگر نقشه یا عکس بیشتری دارید، با ذکر کد پیگیری در تلگرام یا واتساپ برایمان بفرستید.',
       'بعد از گفتگو، قیمت و زمانبندی نهایی را هماهنگ میکنیم.'].map((t, i) => h('li', {}, h('b', {}, en(i + 1)), h('span', {}, t)))),
    h('div', { class: 'done-btns' },
      tg && h('a', { class: 'btn primary', href: `https://t.me/${tg}`, target: '_blank', rel: 'noopener' }, 'ارسال نقشه و عکس در تلگرام'),
      wa && h('a', { class: 'btn', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener' }, 'ارسال در واتساپ'),
      h('a', { class: 'btn', href: '#/' }, 'بازگشت به نمونهکارها'))));
}
