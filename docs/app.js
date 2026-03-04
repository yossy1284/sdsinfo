/* ========== State ========== */
let allCourses = [];
let activeCategories = new Set();
let searchQuery = '';
let kubunFilter = '';

/* ========== Zemi State ========== */
let allZemis = [];
let zemiSearchQuery = '';

const ZEMI_FIELD_MAP = {
  '社会科学': { key: 'social', label: '社会科学' },
  '統計学':   { key: 'stats', label: '統計学' },
  '情報・AI': { key: 'ai', label: '情報・AI' },
};

let activeZemiFields = new Set();

/* ========== Category Mapping ========== */
const CAT_MAP = {
  'ソーシャル・データサイエンス科目': { key: 'sds', label: 'SDS科目' },
  '社会科学科目': { key: 'social', label: '社会科学' },
  'データサイエンス科目': { key: 'ds', label: 'データサイエンス' },
  'PACE': { key: 'pace', label: 'PACE' },
};

const KUBUN_MAP = {
  '学部導入科目': { key: 'intro', label: '導入' },
  '学部基礎科目': { key: 'basic', label: '基礎' },
  '学部発展科目': { key: 'advanced', label: '発展' },
  'ゼミ関連':     { key: 'seminar', label: 'ゼミ' },
  '全学共通科目': { key: 'common', label: '共通' },
};

const GRADE_COLORS = {
  'A+': { cls: 'g-aplus', color: 'var(--grade-aplus)' },
  'A':  { cls: 'g-a',     color: 'var(--grade-a)' },
  'B':  { cls: 'g-b',     color: 'var(--grade-b)' },
  'C':  { cls: 'g-c',     color: 'var(--grade-c)' },
  'F':  { cls: 'g-f',     color: 'var(--grade-f)' },
};

const HEADERS = ['カテゴリ','授業名','授業内容','開講日時','担当教員','評価基準','難易度_単位','難易度_成績','A+','A','B','C','F','科目区分'];

/* ========== Init ========== */
document.addEventListener('DOMContentLoaded', async () => {
  if (hasCourseIndex()) {
    await loadCourses();
    initFilters();
    renderCourses(allCourses);
    initModal();
  }

  if (hasZemiIndex()) {
    await loadZemis();
    initZemiFilters();
    renderZemis(allZemis);
    initModal();
  }

  if (hasGuideSection()) {
    loadGuide();
  }

  initNav();
  initHamburger();
});

function hasCourseIndex() {
  return Boolean(document.getElementById('card-grid'));
}

function hasZemiIndex() {
  return Boolean(document.getElementById('zemi-grid'));
}

function hasGuideSection() {
  return Boolean(document.getElementById('guide-content'));
}

/* ========== CSV Loading ========== */
async function loadCourses() {
  try {
    const res = await fetch('./courses.csv');
    const text = await res.text();
    allCourses = parseCSV(text);
  } catch (e) {
    const grid = document.getElementById('card-grid');
    if (grid) {
      grid.innerHTML = '<p class="loading">データの読み込みに失敗しました。</p>';
    }
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVRow(lines[0]);
  return lines.slice(1).map(line => {
    const cols = parseCSVRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
    return obj;
  });
}

function parseCSVRow(row) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  cols.push(cur);
  return cols;
}


/* ========== Rendering ========== */
function renderCourses(courses) {
  const grid = document.getElementById('card-grid');
  const count = document.getElementById('result-count');

  if (courses.length === 0) {
    grid.innerHTML = '<p class="loading">該当する科目がありません。</p>';
    count.textContent = '';
    return;
  }

  count.textContent = allCourses.length === courses.length
    ? `${courses.length} 科目`
    : `${allCourses.length} 科目中 ${courses.length} 件表示`;

  grid.innerHTML = '';
  courses.forEach((c, i) => grid.appendChild(createCard(c, i)));
}

function createCard(course, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.setProperty('--stagger', `${Math.min(index * 0.02, 0.24)}s`);
  card.addEventListener('click', () => openModal(course));

  const catInfo = CAT_MAP[course['カテゴリ']] || { key: 'sds', label: course['カテゴリ'] };
  const kubunInfo = KUBUN_MAP[course['科目区分']] || null;

  // Badge row
  const badgeRow = document.createElement('div');
  badgeRow.className = 'card-badges';

  const badge = document.createElement('span');
  badge.className = `card-cat cat-${catInfo.key}`;
  badge.textContent = catInfo.label;
  badgeRow.appendChild(badge);

  if (kubunInfo) {
    const kubun = document.createElement('span');
    kubun.className = `card-kubun kubun-${kubunInfo.key}`;
    kubun.textContent = kubunInfo.label;
    badgeRow.appendChild(kubun);
  }

  card.appendChild(badgeRow);

  // Name
  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = course['授業名'];
  card.appendChild(name);

  // Schedule
  if (course['開講日時'] && course['開講日時'] !== '―') {
    const meta1 = document.createElement('div');
    meta1.className = 'card-meta';
    meta1.textContent = course['開講日時'];
    card.appendChild(meta1);
  }

  // Instructor
  if (course['担当教員'] && course['担当教員'] !== '―') {
    const meta2 = document.createElement('div');
    meta2.className = 'card-meta';
    meta2.textContent = course['担当教員'];
    card.appendChild(meta2);
  }

  // Difficulty dots
  const unitDiff = parseInt(course['難易度_単位']);
  const gradeDiff = parseInt(course['難易度_成績']);
  if (unitDiff || gradeDiff) {
    const diffRow = document.createElement('div');
    diffRow.className = 'card-difficulty';
    if (unitDiff) diffRow.appendChild(createDots('単位', unitDiff));
    if (gradeDiff) diffRow.appendChild(createDots('成績', gradeDiff));
    card.appendChild(diffRow);
  }

  // Mini grade bar
  const grades = ['A+','A','B','C','F'].map(k => parseFloat(course[k]) || 0);
  if (grades.some(v => v > 0)) {
    const mini = document.createElement('div');
    mini.className = 'card-grade-mini';
    grades.forEach((v, i) => {
      if (v > 0) {
        const seg = document.createElement('span');
        seg.style.width = v + '%';
        seg.style.background = GRADE_COLORS[['A+','A','B','C','F'][i]].color;
        mini.appendChild(seg);
      }
    });
    card.appendChild(mini);
  }

  return card;
}

function createDots(label, value) {
  const wrap = document.createElement('span');
  let html = `<span class="difficulty-label">${label}</span>`;
  for (let i = 1; i <= 5; i++) {
    html += `<span class="dot ${i <= value ? 'filled' : 'empty'}"></span>`;
  }
  wrap.innerHTML = html;
  return wrap;
}

/* ========== Filters ========== */
function initFilters() {
  // Category buttons
  const container = document.getElementById('category-filters');
  if (!container) return;

  Object.entries(CAT_MAP).forEach(([fullName, info]) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = info.key;
    btn.dataset.fullName = fullName;
    btn.textContent = info.label;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      if (activeCategories.has(fullName)) {
        activeCategories.delete(fullName);
      } else {
        activeCategories.add(fullName);
      }
      applyFilters();
    });
    container.appendChild(btn);
  });

  // Search
  const searchInput = document.getElementById('search');
  if (!searchInput) return;

  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = searchInput.value;
      applyFilters();
    }, 200);
  });

  // Kubun filter
  const kubunSelect = document.getElementById('kubun-filter');
  if (!kubunSelect) return;

  kubunSelect.addEventListener('change', (e) => {
    kubunFilter = e.target.value;
    applyFilters();
  });
}

function applyFilters() {
  const filtered = allCourses.filter(c => {
    // Category
    if (activeCategories.size > 0 && !activeCategories.has(c['カテゴリ'])) return false;
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = (c['授業名'] + c['授業内容'] + c['担当教員']).toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // Kubun
    if (kubunFilter) {
      if (c['科目区分'] !== kubunFilter) return false;
    }
    return true;
  });
  renderCourses(filtered);
}

/* ========== Modal ========== */
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeButton = document.getElementById('modal-close');
  if (!overlay || !closeButton) return;

  closeButton.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(course) {
  const body = document.getElementById('modal-body');
  const overlay = document.getElementById('modal-overlay');
  if (!body || !overlay) return;

  const catInfo = CAT_MAP[course['カテゴリ']] || { key: 'sds', label: course['カテゴリ'] };
  const kubunInfo = KUBUN_MAP[course['科目区分']] || null;

  let html = '';

  // Category + Kubun badges
  html += `<span class="modal-cat cat-${catInfo.key}">${catInfo.label}</span>`;
  if (kubunInfo) {
    html += ` <span class="modal-kubun kubun-${kubunInfo.key}">${kubunInfo.label}</span>`;
  }

  // Name
  html += `<h2 class="modal-name">${esc(course['授業名'])}</h2>`;

  // Info grid
  html += '<dl class="modal-info">';
  const fields = [
    ['開講日時', course['開講日時']],
    ['担当教員', course['担当教員']],
    ['評価基準', course['評価基準']],
  ];
  fields.forEach(([label, val]) => {
    if (val && val !== '―') {
      html += `<dt>${label}</dt><dd>${esc(val)}</dd>`;
    }
  });

  // Difficulty
  const unitDiff = parseInt(course['難易度_単位']);
  const gradeDiff = parseInt(course['難易度_成績']);
  if (unitDiff) html += `<dt>難易度（単位）</dt><dd>${dotsHTML(unitDiff)}</dd>`;
  if (gradeDiff) html += `<dt>難易度（成績）</dt><dd>${dotsHTML(gradeDiff)}</dd>`;

  html += '</dl>';

  // Description
  if (course['授業内容']) {
    html += `<div class="modal-desc">${esc(course['授業内容'])}</div>`;
  }

  // Grade chart
  const gradeKeys = ['A+','A','B','C','F'];
  const grades = gradeKeys.map(k => parseFloat(course[k]) || 0);
  if (grades.some(v => v > 0)) {
    html += '<p class="grade-section-title">成績分布</p>';
    html += '<div class="grade-bar">';
    gradeKeys.forEach((k, i) => {
      if (grades[i] > 0) {
        const showLabel = grades[i] >= 8;
        html += `<span class="grade-segment ${GRADE_COLORS[k].cls}" style="width:${grades[i]}%" title="${k} ${grades[i]}%">${showLabel ? k : ''}</span>`;
      }
    });
    html += '</div>';
    // Legend
    html += '<div class="grade-legend">';
    gradeKeys.forEach((k, i) => {
      if (grades[i] > 0) {
        html += `<span class="grade-legend-item"><span class="grade-legend-dot" style="background:${GRADE_COLORS[k].color}"></span>${k} ${grades[i]}%</span>`;
      }
    });
    html += '</div>';
  } else {
    html += '<p class="no-grade-data">成績分布データなし</p>';
  }

  body.innerHTML = html;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function dotsHTML(value) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += `<span class="dot ${i <= value ? 'filled' : 'empty'}"></span>`;
  }
  return s;
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function parseActivityTime(str) {
  const isApprox = /程度/.test(str);
  const hasUnit = /時間/.test(str);
  const label = hasUnit ? str : str + '時間';
  const s = str.replace(/時間程度$/, '').replace(/時間$/, '').replace(/[〜～]/g, '~');
  const range = s.match(/(\d+)\s*~\s*(\d+)/);
  if (range) {
    return { min: parseInt(range[1]), max: parseInt(range[2]), label };
  }
  const prefix = s.match(/^~\s*(\d+)/);
  if (prefix) {
    return { min: 0, max: parseInt(prefix[1]), label };
  }
  const num = parseInt(s);
  if (!isNaN(num)) {
    if (isApprox) {
      return { min: Math.max(0, num - 5), max: num + 5, label };
    }
    return { min: num, max: num, label };
  }
  return { min: 0, max: 0, label: '' };
}

function linkify(html) {
  return html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

/* ========== Zemi Loading ========== */
async function loadZemis() {
  try {
    const res = await fetch('./zemi.csv');
    const text = await res.text();
    allZemis = parseCSV(text);
  } catch (e) {
    const grid = document.getElementById('zemi-grid');
    if (grid) grid.innerHTML = '<p class="loading">データの読み込みに失敗しました。</p>';
  }
}

/* ========== Zemi Rendering ========== */
function renderZemis(zemis) {
  const grid = document.getElementById('zemi-grid');
  const count = document.getElementById('zemi-count');

  if (zemis.length === 0) {
    grid.innerHTML = '<p class="loading">該当するゼミがありません。</p>';
    count.textContent = '';
    return;
  }

  count.textContent = allZemis.length === zemis.length
    ? `${zemis.length} ゼミ`
    : `${allZemis.length} ゼミ中 ${zemis.length} 件表示`;

  grid.innerHTML = '';
  zemis.forEach((z, i) => grid.appendChild(createZemiCard(z, i)));
}

function createZemiCard(zemi, index) {
  const card = document.createElement('div');
  card.className = 'card zemi-card';
  card.style.setProperty('--stagger', `${Math.min(index * 0.02, 0.24)}s`);
  card.addEventListener('click', () => openZemiModal(zemi));

  // Badge row
  const fieldInfo = ZEMI_FIELD_MAP[zemi['分野']];
  if (fieldInfo) {
    const badgeRow = document.createElement('div');
    badgeRow.className = 'card-badges';
    const fieldBadge = document.createElement('span');
    fieldBadge.className = `card-cat zemi-field-${fieldInfo.key}`;
    fieldBadge.textContent = fieldInfo.label;
    badgeRow.appendChild(fieldBadge);
    card.appendChild(badgeRow);
  }

  // Professor name
  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = zemi['教員名'];
  card.appendChild(name);

  // Research theme preview
  if (zemi['研究テーマ']) {
    const theme = document.createElement('div');
    theme.className = 'card-meta zemi-content-preview';
    const text = zemi['研究テーマ'];
    theme.textContent = text.length > 50 ? text.slice(0, 50) + '…' : text;
    card.appendChild(theme);
  }

  // Stats row
  const statsRow = document.createElement('div');
  statsRow.className = 'zemi-stats';

  if (zemi['受入予定人数']) {
    const cap = document.createElement('span');
    cap.className = 'zemi-stat';
    cap.textContent = '定員 ' + zemi['受入予定人数'];
    statsRow.appendChild(cap);
  }

  if (statsRow.children.length) card.appendChild(statsRow);

  // Empty state
  if (!zemi['研究テーマ'] && !zemi['活動時間_週'] && !zemi['3年次の内容']) {
    const empty = document.createElement('div');
    empty.className = 'card-meta';
    empty.textContent = '詳細情報なし';
    empty.style.fontStyle = 'italic';
    card.appendChild(empty);
  }

  return card;
}

/* ========== Zemi Modal ========== */
function openZemiModal(zemi) {
  const body = document.getElementById('modal-body');
  const overlay = document.getElementById('modal-overlay');
  if (!body || !overlay) return;

  let html = '';

  // Badge
  const fieldInfo = ZEMI_FIELD_MAP[zemi['分野']];
  if (fieldInfo) {
    html += `<span class="modal-cat zemi-field-${fieldInfo.key}">${fieldInfo.label}</span>`;
  }

  html += `<h2 class="modal-name">${esc(zemi['教員名'])}</h2>`;

  // Official info section
  const officialFields = [
    ['研究テーマ', zemi['研究テーマ']],
    ['受入予定人数', zemi['受入予定人数']],
    ['選考基準', zemi['選考基準']],
    ['推奨科目（公式）', zemi['推奨科目（公式）']],
    ['副ゼミ情報', zemi['副ゼミ情報']],
  ];

  const hasOfficial = officialFields.some(([, val]) => val && val.trim());

  if (hasOfficial) {
    html += '<p class="grade-section-title">公式情報</p>';
    html += '<dl class="modal-info">';
    officialFields.forEach(([label, val]) => {
      if (val && val.trim()) {
        html += `<dt>${label}</dt><dd>${esc(val)}</dd>`;
      }
    });
    html += '</dl>';
  }

  // Student info section — visual bars for 形態 / 活動時間 / 院進検討率
  const keitai = (zemi['"研究室"or"ゼミ"'] || '').trim();
  const katsudou = (zemi['活動時間_週'] || '').trim();
  const inshin = (zemi['院進検討率'] || '').trim();

  const studentTextFields = [
    ['新B4の人数', zemi['新B4の人数'] ? zemi['新B4の人数'] + '人' : ''],
    ['3年次の内容', zemi['3年次の内容']],
    ['取っておいた方がいい授業', zemi['取っておいた方がいい授業']],
    ['やったイベント', zemi['やったイベント']],
    ['来年のゼミの構成', zemi['来年のゼミの構成（学部生除く）（判明分）']],
    ['使えるリソース', zemi['使えるリソース']],
    ['外部との連携', zemi['外部との連携']],
    ['進路（就職）', zemi['進路(就職)']],
    ['進路（院進）', zemi['進路(院進)']],
  ];

  const hasBars = keitai || katsudou || inshin;
  const hasTextFields = studentTextFields.some(([, val]) => val && val.trim());
  const hasStudent = hasBars || hasTextFields;

  if (hasStudent) {
    html += '<p class="grade-section-title">学生情報</p>';

    // Visual bars
    if (hasBars) {
      html += '<div class="zemi-visual-bars">';

      // 形態 bar
      if (keitai) {
        const pos = keitai === 'ゼミ' ? 0 : keitai === '中間' ? 50 : 100;
        const markerCls = keitai === 'ゼミ' ? 'marker-zemi' : keitai === '中間' ? 'marker-mid' : 'marker-lab';
        const leftActive = keitai === 'ゼミ' ? ' active' : '';
        const rightActive = keitai === '研究室' ? ' active' : '';
        const showLabel = keitai === '中間' ? `<span class="zemi-spectrum-marker-label">${esc(keitai)}</span>` : '';
        html += '<div class="zemi-bar-item">';
        html += '<div class="zemi-bar-label">形態</div>';
        html += '<div class="zemi-spectrum-wrap">';
        html += `<span class="zemi-spectrum-end left${leftActive}">ゼミ</span>`;
        html += '<div class="zemi-spectrum-bar">';
        html += `<div class="zemi-spectrum-marker ${markerCls}" style="left:${pos}%">${showLabel}</div>`;
        html += '</div>';
        html += `<span class="zemi-spectrum-end right${rightActive}">研究室</span>`;
        html += '</div>';
        html += '</div>';
      }

      // 活動時間 bar
      if (katsudou) {
        const parsed = parseActivityTime(katsudou);
        const maxH = 25;
        const leftPct = (parsed.min / maxH) * 100;
        const widthPct = ((parsed.max - parsed.min) / maxH) * 100;
        html += '<div class="zemi-bar-item">';
        html += '<div class="zemi-bar-label">活動時間（週）</div>';
        html += '<div class="zemi-range-wrap">';
        html += '<div class="zemi-range-bar">';
        html += `<div class="zemi-range-fill" style="left:${leftPct}%;width:${Math.max(widthPct, 2)}%"></div>`;
        html += '</div>';
        html += '<div class="zemi-range-ticks">';
        for (let h = 0; h <= maxH; h += 5) {
          html += `<span class="zemi-range-tick" style="left:${(h / maxH) * 100}%">${h === maxH ? h + 'h〜' : h + 'h'}</span>`;
        }
        html += '</div>';
        html += '</div>';
        html += `<div class="zemi-bar-value">${esc(parsed.label)}</div>`;
        html += '</div>';
      }

      // 院進検討率 bar
      if (inshin) {
        const pct = parseInt(inshin) || 0;
        html += '<div class="zemi-bar-item">';
        html += '<div class="zemi-bar-label">新B4の院進検討率</div>';
        html += '<div class="zemi-pct-wrap">';
        html += '<div class="zemi-pct-bar">';
        html += `<div class="zemi-pct-fill" style="width:${pct}%"></div>`;
        html += '</div>';
        html += `<span class="zemi-pct-value">${esc(inshin)}</span>`;
        html += '</div>';
        html += '</div>';
      }

      html += '</div>';
    }

    // Remaining text fields
    if (hasTextFields) {
      html += '<dl class="modal-info">';
      studentTextFields.forEach(([label, val]) => {
        if (val && val.trim()) {
          html += `<dt>${label}</dt><dd>${esc(val)}</dd>`;
        }
      });
      html += '</dl>';
    }
  }

  // 備考（公式）- linkify URLs
  if (zemi['備考（公式）'] && zemi['備考（公式）'].trim()) {
    html += '<p class="grade-section-title">備考</p>';
    html += `<div class="modal-desc">${linkify(esc(zemi['備考（公式）']))}</div>`;
  }

  if (!hasOfficial && !hasStudent) {
    html += '<p class="no-grade-data">詳細情報はまだ登録されていません。</p>';
  }

  body.innerHTML = html;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ========== Zemi Filters ========== */
function initZemiFilters() {
  const fieldContainer = document.getElementById('zemi-field-filters');
  if (fieldContainer) {
    Object.entries(ZEMI_FIELD_MAP).forEach(([fullName, info]) => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.dataset.cat = info.key;
      btn.dataset.fullName = fullName;
      btn.textContent = info.label;
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        if (activeZemiFields.has(fullName)) {
          activeZemiFields.delete(fullName);
        } else {
          activeZemiFields.add(fullName);
        }
        applyZemiFilters();
      });
      fieldContainer.appendChild(btn);
    });
  }

  const searchInput = document.getElementById('zemi-search');
  if (!searchInput) return;

  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      zemiSearchQuery = searchInput.value;
      applyZemiFilters();
    }, 200);
  });
}

function applyZemiFilters() {
  const filtered = allZemis.filter(z => {
    if (activeZemiFields.size > 0 && !activeZemiFields.has(z['分野'])) return false;
    if (zemiSearchQuery) {
      const q = zemiSearchQuery.toLowerCase();
      const haystack = (z['教員名'] + z['研究テーマ'] + z['3年次の内容'] + z['取っておいた方がいい授業'] + z['使えるリソース'] + z['分野']).toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  renderZemis(filtered);
}

/* ========== Hamburger Menu ========== */
function initHamburger() {
  const btn = document.querySelector('.hamburger');
  const menu = document.querySelector('.topbar-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('open');
    menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });

  // メニュー内リンクをクリックしたら閉じる
  menu.querySelectorAll('.topnav-link').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ========== Navigation ========== */
function initNav() {
  const links = Array.from(document.querySelectorAll('.nav-link'))
    .filter(link => (link.getAttribute('href') || '').startsWith('#'));
  if (links.length === 0) return;

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // IntersectionObserver for active nav
  const sections = Array.from(document.querySelectorAll('.section'))
    .filter(section => links.some(link => link.getAttribute('href') === `#${section.id}`));

  if (sections.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => observer.observe(s));
}

/* ========== Guide.md ========== */
async function loadGuide() {
  try {
    const res = await fetch('./guide.md');
    const md = await res.text();
    const guideContent = document.getElementById('guide-content');
    if (guideContent) {
      guideContent.innerHTML = parseMarkdown(md);
    }
  } catch (e) {
    const guideContent = document.getElementById('guide-content');
    if (guideContent) {
      guideContent.innerHTML = '<p>ガイドの読み込みに失敗しました。</p>';
    }
  }
}

function parseMarkdown(md) {
  // Remove HTML comments
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${inline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${inline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1>${inline(line.slice(2))}</h1>`;
      continue;
    }

    // HR
    if (line.trim() === '---') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr>';
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
      continue;
    }

    // List item
    if (line.match(/^- /)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }

    // Table - pass through as simple table
    if (line.trim().startsWith('|')) {
      if (inList) { html += '</ul>'; inList = false; }
      // Collect all table lines
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      i--; // back up one
      html += renderTable(tableLines);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }

    // Paragraph
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p>${inline(line)}</p>`;
  }

  if (inList) html += '</ul>';
  return html;
}

function inline(text) {
  const safe = esc(text);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

function renderTable(lines) {
  let html = '<table>';
  lines.forEach((line, idx) => {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    // Skip separator row
    if (cells.every(c => c.match(/^-+$/))) return;
    const tag = idx === 0 ? 'th' : 'td';
    html += '<tr>' + cells.map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>';
  });
  html += '</table>';
  return html;
}
