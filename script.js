/* ─── State ─── */
let lang = 'de';
let activeCategory = null;
let data = [];
let filtered = [];
let openCards = new Set(); // Speichert XML-Keys geöffneter Karten

/* ─── Init ─── */
(function() {
  if (typeof window.SANDBOX_DATA === 'undefined' || !window.SANDBOX_DATA.length) {
    document.getElementById('options-list').innerHTML = '<p style="color:var(--accent);padding:2rem;text-align:center">Fehler: Daten konnten nicht geladen werden.</p>';
    return;
  }
  data = window.SANDBOX_DATA;
  buildSidebar();
  applyHash();
  render();
  window.addEventListener('hashchange', applyHash);
})();

/* ─── L10n helper ─── */
function t(obj) {
  if (!obj || typeof obj !== 'object') return String(obj || '');
  return obj[lang] || obj['de'] || '';
}

/* ─── Hash ─── */
function applyHash() {
  const hash = window.location.hash.replace('#','').toLowerCase();
  if (!hash) return;
  // Find matching option
  for (let i = 0; i < data.length; i++) {
    const e = data[i];
    const id = makeId(e);
    if (id === hash) {
      // Select category
      activeCategory = t(e.category);
      updateSidebarActive();
      // Open card
      openCards.add(e.xmlKey);
      render();
      // Scroll to card after short delay
      setTimeout(function() {
        const el = document.getElementById('card-' + e.xmlKey);
        if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
      }, 100);
      return;
    }
  }
}

function makeId(e) {
  return t(e.displayName).toLowerCase().replace(/[^a-z0-9\u00e4\u00f6\u00fc\u00df]+/g,'-').replace(/^-|-$/g,'');
}

/* ─── Sidebar ─── */
function buildSidebar() {
  const nav = document.getElementById('category-nav');
  const counts = {};
  data.forEach(function(e) {
    const c = e.category.de;
    counts[c] = (counts[c] || 0) + 1;
  });

  const order = ['Spieler','Wesen','Welt','Rohstoffe','Fertigung','Händler','Aufgaben','Diverses'];

  // "Alle" button
  const allBtn = document.createElement('button');
  allBtn.className = 'cat-btn active';
  allBtn.dataset.cat = '';
  allBtn.innerHTML = '<span>' + (lang === 'de' ? 'Alle anzeigen' : 'Show All') + '</span><span class="count">' + data.length + '</span>';
  allBtn.addEventListener('click', function() { setCategory(null); });
  nav.appendChild(allBtn);

  order.forEach(function(c) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = c;
    btn.innerHTML = '<span>' + c + '</span><span class="count">' + (counts[c] || 0) + '</span>';
    btn.addEventListener('click', function() {
      setCategory(c);
      // Mobile: sidebar schließen
      closeSidebar();
    });
    nav.appendChild(btn);
  });
}

function setCategory(cat) {
  activeCategory = cat;
  updateSidebarActive();
  render();
}

function updateSidebarActive() {
  document.querySelectorAll('.cat-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.cat === (activeCategory || ''));
  });
}

/* ─── Sidebar mobil ─── */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
document.getElementById('sidebar-toggle').addEventListener('click', function() {
  const s = document.getElementById('sidebar');
  if (s.classList.contains('open')) { closeSidebar(); }
  else { openSidebar(); }
});
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

/* ─── Expand / Collapse All ─── */
document.getElementById('expand-all').addEventListener('click', function() {
  filtered.forEach(function(e) { openCards.add(e.xmlKey); });
  render();
});
document.getElementById('collapse-all').addEventListener('click', function() {
  openCards.clear();
  render();
});

/* ─── Search ─── */
document.getElementById('search').addEventListener('input', function() {
  render();
});

/* ─── Render ─── */
function render() {
  const query = document.getElementById('search').value.toLowerCase().trim();
  const list = document.getElementById('options-list');
  const empty = document.getElementById('empty-state');
  const countEl = document.getElementById('result-count');

  filtered = data.filter(function(e) {
    const catMatch = !activeCategory || t(e.category) === activeCategory;
    if (!catMatch) return false;
    if (!query) return true;
    const hay = (
      (t(e.displayName) || '') + ' ' +
      (t(e.effect) || '') + ' ' +
      (e.xmlKey || '') + ' ' +
      (t(e.category) || '')
    ).toLowerCase();
    return hay.indexOf(query) !== -1;
  });

  countEl.textContent = (lang === 'de' ? filtered.length + ' Optionen' : filtered.length + ' options');

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = '';
  filtered.forEach(function(e) {
    const card = buildCard(e);
    list.appendChild(card);
  });
}

/* ─── Build one card ─── */
function buildCard(e) {
  const card = document.createElement('div');
  card.className = 'option-card' + (openCards.has(e.xmlKey) ? ' open' : '');
  card.id = 'card-' + e.xmlKey;

  /* ── Header ── */
  const header = document.createElement('div');
  header.className = 'option-header';

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▶';
  header.appendChild(arrow);

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = t(e.displayName);
  header.appendChild(name);

  // XML-Key badge
  const keyBadge = document.createElement('span');
  keyBadge.className = 'key-badge';
  keyBadge.textContent = e.xmlKey;
  header.appendChild(keyBadge);

  // Status badge
  const sb = document.createElement('span');
  sb.className = 'status-badge';
  if (e.effectStatus === 'verified') {
    sb.className += ' ok';
    sb.textContent = lang === 'de' ? 'ok' : 'ok';
  } else {
    sb.className += ' review';
    sb.textContent = '?';
  }
  header.appendChild(sb);

  // Hash-Link
  const hash = makeId(e);
  header.addEventListener('click', function(ev) {
    if (ev.target.tagName === 'A') return;
    const wasOpen = openCards.has(e.xmlKey);
    if (wasOpen) { openCards.delete(e.xmlKey); }
    else { openCards.add(e.xmlKey); }
    // Hash aktualisieren
    if (!wasOpen && hash) {
      history.replaceState(null, '', '#' + hash);
    } else if (wasOpen && openCards.size === 0) {
      history.replaceState(null, '', window.location.pathname);
    }
    render();
  });

  card.appendChild(header);

  /* ── Details ── */
  const details = document.createElement('div');
  details.className = 'option-details';
  details.innerHTML = buildDetailsHTML(e);
  card.appendChild(details);

  return card;
}

/* ─── Details HTML ─── */
function buildDetailsHTML(e) {
  const defaultVal = e.defaultValue;
  const values = e.possibleValues || [];
  const effectText = t(e.effect);
  const effectStatus = e.effectStatus || 'needs_review';
  const lowestText = t(e.lowestValueEffect);
  const highestText = t(e.highestValueEffect);
  const notesText = t(e.notes);
  const sources = e.sources || [];
  const nameDe = e.displayName.de;
  const nameEn = e.displayName.en;

  let html = '<div class="detail-grid">';

  // Name DE
  html += '<div class="detail-label">DE</div>';
  html += '<div class="detail-value">' + esc(nameDe || '—') + '</div>';

  // Name EN
  html += '<div class="detail-label">EN</div>';
  html += '<div class="detail-value">' + esc(nameEn || '—') + '</div>';

  // XML Key
  html += '<div class="detail-label">XML-Key</div>';
  html += '<div class="detail-value"><span class="mono">' + esc(e.xmlKey) + '</span></div>';

  // Source file
  html += '<div class="detail-label">' + (lang === 'de' ? 'Quelldatei' : 'Source File') + '</div>';
  html += '<div class="detail-value"><span class="mono">' + esc(e.sourceFile) + '</span></div>';

  // Default value
  html += '<div class="detail-label">' + (lang === 'de' ? 'Standardwert' : 'Default') + '</div>';
  html += '<div class="detail-value">';
  if (defaultVal != null && defaultVal !== '') {
    html += '<span class="mono">' + esc(String(defaultVal)) + '</span>';
  } else {
    html += '<span style="color:var(--yellow);font-size:0.8rem">' + (lang === 'de' ? 'unbekannt' : 'unknown') + '</span>';
  }
  html += '</div>';

  // Values
  html += '<div class="detail-label">' + (lang === 'de' ? 'Werte' : 'Values') + '</div>';
  html += '<div class="detail-value"><div class="values-bar">';
  if (values.length > 0) {
    values.forEach(function(v) {
      const isDefault = String(v) === String(defaultVal);
      // Handle structured values (Wesen use {value, label})
      if (typeof v === 'object' && v !== null) {
        const label = t(v.label) || v.value;
        html += '<span class="value-chip structured">' + esc(String(label)) + '</span>';
      } else {
        html += '<span class="value-chip' + (isDefault ? ' default' : '') + '">' + esc(String(v)) + '</span>';
      }
    });
  } else {
    html += '<span style="color:var(--text-dim);font-size:0.78rem">' + (lang === 'de' ? 'nicht ermittelbar' : 'unknown') + '</span>';
  }
  html += '</div></div>';

  // Lowest / Highest
  html += '<div class="detail-label">' + (lang === 'de' ? 'Niedrigster' : 'Lowest') + '</div>';
  html += '<div class="detail-value">' + (lowestText || '—') + '</div>';
  html += '<div class="detail-label">' + (lang === 'de' ? 'Höchster' : 'Highest') + '</div>';
  html += '<div class="detail-value">' + (highestText || '—') + '</div>';

  html += '</div>'; // end detail-grid

  // Effect
  if (effectText) {
    html += '<div class="effect-box ' + effectStatus + '">';
    html += '<span class="label">' + (lang === 'de' ? 'Wirkung' : 'Effect') + '</span>';
    html += esc(effectText).replace(/\\\\n/g, '<br>');
    html += '</div>';
  }

  // Notes
  if (notesText) {
    html += '<div class="effect-box review" style="margin-top:0.35rem">';
    html += '<span class="label">' + (lang === 'de' ? 'Hinweis' : 'Note') + '</span>';
    html += esc(notesText);
    html += '</div>';
  }

  // Sources
  if (sources.length > 0) {
    html += '<div style="margin-top:0.5rem"><div class="sources-list">';
    sources.forEach(function(s) {
      html += '<span class="source-chip">' + esc(s) + '</span>';
    });
    html += '</div></div>';
  }

  return html;
}

function esc(s) {
  if (typeof s !== 'string') return String(s);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Language Toggle ─── */
document.getElementById('lang-toggle').addEventListener('click', function() {
  lang = (lang === 'de') ? 'en' : 'de';
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;

  this.textContent = (lang === 'de') ? 'DE / EN' : 'EN / DE';

  // UI Texte aktualisieren
  document.getElementById('page-title').textContent = (lang === 'de') ? 'Sandbox-Einstellungen' : 'Sandbox Settings';
  document.getElementById('search').placeholder = (lang === 'de') ? 'Suchen...' : 'Search...';

  // Sidebar "Alle anzeigen" Button
  const allBtn = document.querySelector('.cat-btn[data-cat=""]');
  if (allBtn) {
    allBtn.innerHTML = '<span>' + (lang === 'de' ? 'Alle anzeigen' : 'Show All') + '</span><span class="count">' + data.length + '</span>';
  }

  // "Alle aufklappen" / "Alle einklappen"
  document.getElementById('expand-all').textContent = (lang === 'de') ? 'Alle aufklappen' : 'Expand All';
  document.getElementById('collapse-all').textContent = (lang === 'de') ? 'Alle einklappen' : 'Collapse All';

  // Sidebar subtitle
  document.querySelector('.sidebar-sub').textContent = (lang === 'de') ? 'Sandbox-Referenz' : 'Sandbox Reference';

  // Re-render
  render();
});

/* ─── Back to Top ─── */
const btt = document.getElementById('back-to-top');
window.addEventListener('scroll', function() {
  btt.classList.toggle('visible', window.scrollY > 400);
});
btt.addEventListener('click', function() {
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ─── Tastatur: Escape schließt geöffnete Karten ─── */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && openCards.size > 0) {
    openCards.clear();
    render();
  }
});