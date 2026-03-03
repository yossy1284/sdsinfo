/* ========== State ========== */
let allCourses = [];
let activeCategories = new Set();
let searchQuery = '';
let yearFilter = '';

/* ========== Category Mapping ========== */
const CAT_MAP = {
  'ソーシャル・データサイエンス科目': { key: 'sds', label: 'SDS科目' },
  '社会科学科目': { key: 'social', label: '社会科学' },
  'データサイエンス科目': { key: 'ds', label: 'データサイエンス' },
  'PACE': { key: 'pace', label: 'PACE' },
};

const GRADE_COLORS = {
  'A+': { cls: 'g-aplus', color: 'var(--grade-aplus)' },
  'A':  { cls: 'g-a',     color: 'var(--grade-a)' },
  'B':  { cls: 'g-b',     color: 'var(--grade-b)' },
  'C':  { cls: 'g-c',     color: 'var(--grade-c)' },
  'F':  { cls: 'g-f',     color: 'var(--grade-f)' },
};

const HEADERS = ['カテゴリ','授業名','授業内容','開講日時','担当教員','評価基準','難易度_単位','難易度_成績','A+','A','B','C','F'];

/* ========== Init ========== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadCourses();
  initFilters();
  renderCourses(allCourses);
  initModal();
  initNav();
  loadGuide();
});

/* ========== CSV Loading ========== */
async function loadCourses() {
  try {
    const res = await fetch('./courses.csv');
    const text = await res.text();
    allCourses = parseCSV(text);
  } catch (e) {
    document.getElementById('card-grid').innerHTML = '<p class="loading">データの読み込みに失敗しました。</p>';
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  // skip header
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    HEADERS.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
    return obj;
  });
}

/* ========== Detect Year ========== */
function detectYear(course) {
  const d = course['授業内容'];
  if (d.includes('１年生')) return 1;
  if (d.includes('２年生')) return 2;
  if (d.includes('３年生')) return 3;
  if (d.includes('４年生')) return 4;
  return 0;
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
  card.addEventListener('click', () => openModal(course));

  const catInfo = CAT_MAP[course['カテゴリ']] || { key: 'sds', label: course['カテゴリ'] };

  // Category badge
  const badge = document.createElement('span');
  badge.className = `card-cat cat-${catInfo.key}`;
  badge.textContent = catInfo.label;
  card.appendChild(badge);

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
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = searchInput.value;
      applyFilters();
    }, 200);
  });

  // Year filter
  document.getElementById('year-filter').addEventListener('change', (e) => {
    yearFilter = e.target.value;
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
    // Year
    if (yearFilter) {
      const y = detectYear(c);
      if (y !== parseInt(yearFilter) && y !== 0) return false;
    }
    return true;
  });
  renderCourses(filtered);
}

/* ========== Modal ========== */
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(course) {
  const body = document.getElementById('modal-body');
  const catInfo = CAT_MAP[course['カテゴリ']] || { key: 'sds', label: course['カテゴリ'] };

  let html = '';

  // Category badge
  html += `<span class="modal-cat cat-${catInfo.key}">${catInfo.label}</span>`;

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
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
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

/* ========== Navigation ========== */
function initNav() {
  const links = document.querySelectorAll('.nav-link');
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
  const sections = document.querySelectorAll('.section');
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
    document.getElementById('guide-content').innerHTML = parseMarkdown(md);
  } catch (e) {
    document.getElementById('guide-content').innerHTML = '<p>ガイドの読み込みに失敗しました。</p>';
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
  return text
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
