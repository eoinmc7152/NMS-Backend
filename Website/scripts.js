(function(){
  'use strict';

  // --- helpers ---
  async function hashPassword(pw){
    const enc = new TextEncoder();
    const data = enc.encode(pw || '');
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : []; } catch(e){ return []; } }

  // Admin creation code (demo only)
  const ADMIN_CREATION_CODE = 'ADMIN-INIT-2025'; // (unused, kept for your project)

  // ----------------------------
  // NEW: risk + notes cleanup helpers
  // ----------------------------
  function normalizeRiskLabel(label, score){
    const l = String(label || '').toLowerCase().trim();

    if (l.includes('high')) return 'High';
    if (l.includes('moderate') || l.includes('medium') || l === 'med') return 'Medium';
    if (l.includes('no risk') || l.includes('none')) return 'No Risk';
    if (l.includes('low')) return 'Low';

    // fallback from score
    if (typeof score === 'number') {
      if (score >= 0.66) return 'High';
      if (score >= 0.33) return 'Medium';
      return 'Low';
    }
    return 'Low';
  }

  function tryParseRiskScoreFromText(text){
    const raw = String(text || '');
    const m = raw.match(/risk\s*score\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  // removes cloud-result + risk-score fragments even if they are in the SAME line with bullets
  function cleanNotesInline(rawNotes){
    const raw = String(rawNotes || '').trim();
    if (!raw) return '';

    const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);

    const cleanedLines = lines.map(line => {
      const parts = line.split('•').map(s => s.trim()).filter(Boolean);

      const kept = parts.filter(part => {
        const t = part.toLowerCase();
        if (t.startsWith('cloud result:')) return false;
        if (t.includes('cloud result:')) return false;
        if (t.includes('risk score:')) return false;
        return true;
      });

      return kept.join(' • ').trim();
    }).filter(Boolean);

    // dedupe identical lines
    const seen = new Set();
    const deduped = [];
    cleanedLines.forEach(l => {
      const key = l.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(l);
    });

    return deduped.join('\n').trim();
  }

  // ----------------------------
  // NEW: one-time migration on load
  // This fixes OLD stored patients so your table stops showing cloud junk.
  // ----------------------------
  function migratePatientsStorage(){
    const key = 'nmsPatients';
    const patients = safeJSONParse(localStorage.getItem(key));
    if (!Array.isArray(patients) || !patients.length) return;

    let changed = false;

    patients.forEach(p => {
      if (!p || typeof p !== 'object') return;

      // 1) pull score out of old notes if missing
      if (typeof p.riskScore !== 'number') {
        const parsed = tryParseRiskScoreFromText(p.notes);
        if (typeof parsed === 'number') {
          p.riskScore = parsed;
          changed = true;
        }
      }

      // 2) normalize risk label (moderate -> Medium, etc.)
      const newRisk = normalizeRiskLabel(p.risk, (typeof p.riskScore === 'number' ? p.riskScore : null));
      if (String(p.risk || '') !== newRisk) {
        p.risk = newRisk;
        changed = true;
      }

      // 3) clean old cloud spam out of notes + dedupe
      const cleaned = cleanNotesInline(p.notes);
      if (String(p.notes || '') !== cleaned) {
        p.notes = cleaned;
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(key, JSON.stringify(patients));
    }
  }

  // Run migration ASAP on every page
  migratePatientsStorage();

  // Seed a default admin account if none exists (for testing/demo).
  (async function seedDefaultAdmin(){
    try {
      const users = safeJSONParse(localStorage.getItem('nmsUsers'));
      const hasAdmin = users.some(u => u.role === 'admin');
      if (!hasAdmin) {
        const pw = 'admin';
        const h = await hashPassword(pw);
        const admin = { id: Date.now(), name: 'Administrator', email: 'admin@example.com', passwordHash: h, createdAt: new Date().toISOString(), role: 'admin' };
        users.push(admin);
        localStorage.setItem('nmsUsers', JSON.stringify(users));
        console.log('Seeded admin account:', admin.email);
      }
    } catch (e) { console.error('Failed to seed admin', e); }
  })();

  // --- Registration handler  ---
  (function attachRegister(){
    const confirmEl = document.getElementById('confirm-password');
    if (!confirmEl) return;

    const form = document.querySelector('.auth-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmInput = confirmEl;
    const registerError = document.getElementById('register-error');
    const passwordError = document.getElementById('password-error');
    const confirmError = document.getElementById('confirm-error');

    function showError(input, element, message){ if (input) input.classList.add('input-error'); if (element) element.textContent = message; }
    function clearError(input, element){ if (input) input.classList.remove('input-error'); if (element) element.textContent = ''; }
    function isValidEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    if (!form) return;
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      if (registerError) registerError.textContent = '';
      let valid = true;

      if (!nameInput.value.trim()) { showError(nameInput, passwordError, 'Please enter your full name.'); valid = false; } else clearError(nameInput, passwordError);
      if (!emailInput.value.trim() || !isValidEmail(emailInput.value)) { showError(emailInput, confirmError, 'Please enter a valid email address.'); valid = false; } else clearError(emailInput, confirmError);
      if (!passwordInput.value || passwordInput.value.length < 8) { showError(passwordInput, passwordError, 'Password must be at least 8 characters.'); valid = false; } else clearError(passwordInput, passwordError);
      if (passwordInput.value !== confirmInput.value) { showError(confirmInput, confirmError, 'Passwords do not match.'); valid = false; } else clearError(confirmInput, confirmError);
      if (!valid) return;

      try {
        const email = emailInput.value.trim().toLowerCase();
        const name = nameInput.value.trim();
        const users = safeJSONParse(localStorage.getItem('nmsUsers'));
        if (users.find(u => u.email === email)) {
          if (registerError) registerError.textContent = 'An account with that email already exists.';
          if (emailInput) emailInput.classList.add('input-error');
          return;
        }

        const role = 'doctor';
        const hash = await hashPassword(passwordInput.value || '');
        const user = { id: Date.now(), name, email, passwordHash: hash, createdAt: new Date().toISOString(), role };
        users.push(user);
        localStorage.setItem('nmsUsers', JSON.stringify(users));
        localStorage.setItem('nmsCurrentUser', String(user.id));
        setTimeout(()=>{ window.location.href = 'patients.html'; }, 100);
      } catch(err){
        if (registerError) registerError.textContent = 'An error occurred creating the account.';
        console.error(err);
      }
    });

    [nameInput, emailInput, passwordInput, confirmInput].forEach(i=>{
      if (!i) return;
      i.addEventListener('input', ()=>{
        i.classList.remove('input-error');
        if (passwordError) passwordError.textContent='';
        if (confirmError) confirmError.textContent='';
        if (registerError) registerError.textContent='';
      });
    });
  })();

  // --- Login handler  ---
  (function attachLogin(){
    const form = document.getElementById('login-form');
    if (!form) return;
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('login-role');
    const loginError = document.getElementById('login-error');

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      if (loginError) loginError.textContent = '';
      const email = (emailInput.value || '').trim().toLowerCase();
      const pw = passwordInput.value || '';
      const selectedRole = roleSelect ? (roleSelect.value || '') : '';
      if (!email || !pw) { if (loginError) loginError.textContent = 'Please provide email and password.'; return; }
      try {
        const users = safeJSONParse(localStorage.getItem('nmsUsers'));
        const user = users.find(u => u.email === email);
        if (!user) { if (loginError) loginError.textContent = 'No account found for that email.'; return; }
        if (selectedRole && user.role !== selectedRole) {
          if (loginError) loginError.textContent = 'Account does not have the selected role.';
          return;
        }
        const h = await hashPassword(pw);
        if (h !== user.passwordHash) { if (loginError) loginError.textContent = 'Invalid password.'; return; }
        localStorage.setItem('nmsCurrentUser', String(user.id));
        const dest = (user.role === 'admin') ? 'admin.html' : 'patients.html';
        setTimeout(()=> window.location.href = dest, 50);
      } catch(err){ console.error(err); if (loginError) loginError.textContent = 'An error occurred during login.'; }
    });
  })();

  // --- Burger menu wiring (applies on any page) ---
  function setupBurgers(){
    const toggles = Array.from(document.querySelectorAll('[id^="burger-toggle"]'));
    toggles.forEach(btn => {
      const menuId = btn.id.replace('toggle','menu');
      let menu = document.getElementById(menuId);
      if (!menu) {
        let s = btn.nextElementSibling;
        while(s && !s.classList.contains('burger-menu')) s = s.nextElementSibling;
        menu = s;
      }
      if (!menu) return;

      function open(){ btn.setAttribute('aria-expanded','true'); menu.setAttribute('aria-hidden','false'); menu.classList.add('open'); }
      function close(){ btn.setAttribute('aria-expanded','false'); menu.setAttribute('aria-hidden','true'); menu.classList.remove('open'); }

      btn.addEventListener('click', (e)=>{ e.stopPropagation(); const expanded = btn.getAttribute('aria-expanded')==='true'; if (expanded) close(); else open(); });
      document.addEventListener('click', (e)=>{ if (!menu.contains(e.target) && e.target !== btn) close(); });
      document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupBurgers); else setupBurgers();

  // --- Current user display & logout ---
  function getCurrentUser() {
    const id = localStorage.getItem('nmsCurrentUser');
    if (!id) return null;
    const users = safeJSONParse(localStorage.getItem('nmsUsers'));
    return users.find(u => String(u.id) === String(id)) || null;
  }

  function renderUserArea() {
    const user = getCurrentUser();
    const href = window.location.href.toLowerCase();
    const isAuthPage = href.includes('login.html') || href.includes('register.html');
    const isPatientPage = href.includes('patient.html');

    if ((isAuthPage || isPatientPage) && !user) {
      const stray = document.querySelectorAll('.user-area');
      stray.forEach(n => { if (n && n.parentElement) n.parentElement.removeChild(n); });
      return;
    }
    if (isPatientPage) {
      const stray = document.querySelectorAll('.user-area');
      stray.forEach(n => { if (n && n.parentElement) n.parentElement.removeChild(n); });
      return;
    }

    let container = document.querySelector('.appbar');
    if (!container) container = document.body;

    let area = container.querySelector('.user-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'user-area';
      area.style.marginLeft = 'auto';
      area.style.display = 'flex';
      area.style.alignItems = 'center';
      area.style.gap = '10px';
      container.appendChild(area);
    }
    area.innerHTML = '';

    if (!user) {
      const a1 = document.createElement('a'); a1.href = 'login.html'; a1.textContent = 'Login'; a1.className = 'pill';
      const a2 = document.createElement('a'); a2.href = 'register.html'; a2.textContent = 'Register'; a2.className = 'pill';
      area.appendChild(a1); area.appendChild(a2);
      return;
    }

    const name = document.createElement('span');
    name.textContent = user.name || user.email || 'User';
    name.style.fontWeight = '700';
    name.title = user.email || '';

    const logout = document.createElement('button');
    logout.textContent = 'Logout';
    logout.className = 'btn-secondary';
    logout.addEventListener('click', ()=>{
      localStorage.removeItem('nmsCurrentUser');
      window.location.href = 'login.html';
    });

    area.appendChild(name);
    area.appendChild(logout);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderUserArea); else renderUserArea();

  // --- Cloud Run backend integration (public GET endpoints: /health/, /results/) ---
  const CLOUD_BASE_URL = "https://nms-backend-835155720402.europe-west1.run.app";

  async function cloudGet(path) {
    const res = await fetch(`${CLOUD_BASE_URL}${path}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = raw; }

    if (!res.ok) {
      throw new Error(`Cloud ${res.status} (${path}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    return data;
  }

  // --- Sync cloud results into your local nmsPatients (Android -> Cloud -> Web) ---
  function syncCloudResultsIntoPatients(results){
    const currentUserId = localStorage.getItem('nmsCurrentUser') || '';
    const patients = safeJSONParse(localStorage.getItem('nmsPatients'));
    const byId = {};
    patients.forEach(p => { byId[String(p.id)] = p; });

    function getAnswer(r, key){
      const a = (r.answers || []).find(x => String(x.q).toLowerCase() === String(key).toLowerCase());
      return a ? a.value : null;
    }

    let created = 0, updated = 0;

    (results || []).forEach(r => {
      const patientId = String(r.patientId || '').trim();
      if (!patientId) return;

      const age = getAnswer(r, 'age');
      const rawRiskLabel = (r.risk && r.risk.label) ? r.risk.label : '';
      const riskScore = (r.risk && typeof r.risk.score === 'number') ? r.risk.score : null;
      const riskLabel = normalizeRiskLabel(rawRiskLabel, riskScore);

      const createdAt = r.createdAt || new Date().toISOString();
      const incomingResultId = String(r.id || '');

      // notes: ONLY meaningful answers
      const notesBits = [];
      const memoryIssues = getAnswer(r, 'memory_issues');
      if (memoryIssues !== null && memoryIssues !== undefined && String(memoryIssues).trim() !== '') notesBits.push(`memory issues: ${memoryIssues}`);
      const smoker = getAnswer(r, 'smoker');
      if (smoker !== null && smoker !== undefined && String(smoker).trim() !== '') notesBits.push(`smoker: ${smoker}`);

      const cleanCloudSummary = notesBits.join(' • ');

      if (!byId[patientId]) {
        const p = {
          id: patientId,
          name: `Patient ${patientId}`,
          age: (age !== null && age !== undefined) ? age : '',
          risk: riskLabel,
          riskScore: riskScore,
          notes: cleanCloudSummary,
          lastUpdated: createdAt,
          ownerId: currentUserId || '',
          lastCloudResultId: incomingResultId || ''
        };
        patients.push(p);
        byId[patientId] = p;
        created++;
        return;
      }

      const p = byId[patientId];

      const alreadyApplied = incomingResultId && String(p.lastCloudResultId || '') === incomingResultId;

      p.risk = riskLabel;
      if (age !== null && age !== undefined) p.age = age;
      p.lastUpdated = createdAt;
      if (riskScore !== null) p.riskScore = riskScore;
      if (incomingResultId) p.lastCloudResultId = incomingResultId;

      const cleanedExisting = cleanNotesInline(p.notes);

      if (!alreadyApplied && cleanCloudSummary) {
        p.notes = cleanedExisting ? (cleanedExisting + '\n' + cleanCloudSummary) : cleanCloudSummary;
      } else {
        p.notes = cleanedExisting;
      }

      updated++;
    });

    localStorage.setItem('nmsPatients', JSON.stringify(patients));
    return { created, updated, total: (results || []).length };
  }

  // Reports page loader (GET /results/) - renders cards + can sync into Patients
  (function attachCloudResults(){
    const btn = document.getElementById('cloud-fetch-results');
    const syncBtn = document.getElementById('cloud-sync-patients'); // optional
    const statusEl = document.getElementById('cloud-status');
    const outEl = document.getElementById('cloud-output');
    if (!btn || !statusEl || !outEl) return;

    let lastPayload = null;

    function setStatus(t){ statusEl.textContent = t; }

    function esc(s){
      return String(s ?? '')
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'","&#039;");
    }

    function fmtDate(iso){
      try { return new Date(iso).toLocaleString(); } catch(e){ return String(iso || ''); }
    }

    function renderResults(payload){
      const results = (payload && payload.results) ? payload.results : [];
      lastPayload = payload || null;

      if (!results.length) {
        outEl.innerHTML = `<p class="muted">No cloud results yet. (Android submissions will appear here.)</p>`;
        return;
      }

      const wrap = document.createElement('div');
      wrap.style.display = 'grid';
      wrap.style.gap = '10px';

      results.forEach(r => {
        const riskLabel = r.risk && r.risk.label ? r.risk.label : 'unknown';
        const riskScore = (r.risk && typeof r.risk.score === 'number') ? r.risk.score : null;
        const scoreText = (riskScore === null) ? '' : ` • score: ${riskScore}`;

        const card = document.createElement('div');
        card.className = 'news-card';

        const body = document.createElement('div');
        body.className = 'news-card-body';

        const title = document.createElement('h3');
        title.className = 'news-title';
        title.textContent = `Patient: ${r.patientId || 'unknown'} — Risk: ${riskLabel}${scoreText}`;

        const meta = document.createElement('div');
        meta.className = 'news-meta';
        meta.innerHTML = `
          <span class="muted">Result ID: ${esc(r.id || '')}</span>
          <span class="muted">Created: ${esc(fmtDate(r.createdAt))}</span>
        `;

        const answersWrap = document.createElement('div');
        answersWrap.className = 'news-excerpt';

        const answers = Array.isArray(r.answers) ? r.answers : [];
        if (!answers.length) {
          const p = document.createElement('p');
          p.className = 'muted';
          p.textContent = 'No answers stored.';
          answersWrap.appendChild(p);
        } else {
          const ul = document.createElement('ul');
          ul.style.margin = '8px 0 0';
          ul.style.paddingLeft = '18px';
          answers.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${esc(a.q)}</strong>: ${esc(a.value)}`;
            ul.appendChild(li);
          });
          answersWrap.appendChild(ul);
        }

        const actions = document.createElement('div');
        actions.className = 'news-actions';

        const openPatientBtn = document.createElement('a');
        openPatientBtn.className = 'btn-chip';
        openPatientBtn.href = `patient.html?id=${encodeURIComponent(r.patientId || '')}`;
        openPatientBtn.textContent = 'Open Patient';

        actions.appendChild(openPatientBtn);

        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(answersWrap);
        body.appendChild(actions);

        card.appendChild(body);
        wrap.appendChild(card);
      });

      outEl.innerHTML = '';
      outEl.appendChild(wrap);
    }

    btn.addEventListener('click', async ()=>{
      setStatus('Checking backend health...');
      outEl.textContent = '';
      try {
        await cloudGet('/health/');
        setStatus('Backend online ✅ Loading results...');
        const data = await cloudGet('/results/?limit=20');
        setStatus(`Cloud results loaded ✅ (${(data.results || []).length})`);
        renderResults(data);
      } catch (e) {
        setStatus('Failed ❌ (see console)');
        outEl.textContent = String(e);
        console.error(e);
      }
    });

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        if (!lastPayload || !lastPayload.results) return alert('Load cloud results first.');
        const sync = syncCloudResultsIntoPatients(lastPayload.results || []);
        setStatus(`Synced to Web Patients ✅ (new: ${sync.created}, updated: ${sync.updated})`);
        try { window.dispatchEvent(new Event('storage')); } catch(e){}
        alert(`Synced patients.\nNew: ${sync.created}\nUpdated: ${sync.updated}`);
      });
    }
  })();

  // --- News page: Auto-load articles on page load ---
  (function attachNewsRefresh(){
    const newsList = document.getElementById('news-list');
    const newsEmpty = document.getElementById('news-empty');
    if (!newsList || !newsEmpty) return;

    let allArticles = [];

    function downloadJSON() {
      if (!allArticles.length) return alert('No articles to download.');
      const blob = new Blob([JSON.stringify(allArticles, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nms_articles.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function printArticles() {
      const articles = allArticles;
      if (!articles.length) return alert('No articles to print.');
      
      const win = window.open('', '', 'height=600,width=800');
      let html = `
        <html><head><title>NMS News Articles</title>
        <style>
          body { font-family: system-ui; margin: 20px; line-height: 1.6; }
          h1 { border-bottom: 2px solid #1e88f3; padding-bottom: 10px; }
          .article { page-break-inside: avoid; margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 8px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
          .source { color: #666; font-size: 13px; }
          .date { color: #999; font-size: 12px; }
        </style>
        </head><body>
        <h1>NeuroMind System - News Articles</h1>
        <p>Printed on ${new Date().toLocaleString()}</p>
      `;
      
      articles.forEach(article => {
        html += `
          <div class="article">
            <div class="title">${article.title || 'Untitled'}</div>
            <div class="source">${article.source || 'News'}</div>
            <div class="date">${article.date || new Date().toLocaleDateString()}</div>
            <p>${article.summary || article.description || ''}</p>
          </div>
        `;
      });
      
      html += '</body></html>';
      win.document.write(html);
      win.document.close();
      win.print();
    }

    // Load articles on page load
    async function loadArticles() {
      newsEmpty.textContent = 'Loading articles...';
      newsEmpty.style.display = 'block';
      newsList.innerHTML = '';
      newsList.appendChild(newsEmpty);

      try {
        const response = await fetch('https://ruaidhri.pythonanywhere.com/get_news');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('API Response:', data);
        
        let articles = [];
        
        if (data.weekly_summary && typeof data.weekly_summary === 'string') {
          articles = [{
            title: 'Weekly News Summary',
            summary: data.weekly_summary,
            source: 'Dementia Research',
            date: new Date().toLocaleDateString()
          }];
        } else if (Array.isArray(data)) {
          articles = data;
        } else if (data.articles && Array.isArray(data.articles)) {
          articles = data.articles;
        } else if (data.news && Array.isArray(data.news)) {
          articles = data.news;
        } else if (typeof data === 'object') {
          articles = Object.values(data).find(v => Array.isArray(v)) || [];
        }

        console.log('Extracted articles:', articles);

        if (!articles.length) {
          newsEmpty.textContent = 'No articles found.';
          return;
        }

        allArticles = articles;
        newsList.innerHTML = '';
        articles.forEach(article => {
          const card = document.createElement('article');
          card.className = 'news-card';
          card.innerHTML = `
            <div class="news-card-body">
              <h3 class="news-title">${article.title || 'Untitled'}</h3>
              <p class="news-excerpt">${article.summary || article.description || article.content || ''}</p>
            </div>
            <div class="news-meta">
              <span class="news-source muted">${article.source || 'News'}</span>
              <span class="news-date muted">${article.date || article.published_date || new Date().toLocaleDateString()}</span>
            </div>
          `;
          newsList.appendChild(card);
        });

        // Add Download and Print buttons below articles
        const spacer = document.createElement('div');
        spacer.style.height = '18px';
        newsList.appendChild(spacer);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.padding = '12px 16px';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn-primary';
        downloadBtn.textContent = 'Download Articles';
        downloadBtn.addEventListener('click', downloadJSON);
        
        const printBtn = document.createElement('button');
        printBtn.className = 'btn-chip';
        printBtn.textContent = 'Print Articles';
        printBtn.addEventListener('click', printArticles);
        
        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(printBtn);
        newsList.appendChild(buttonContainer);
      } catch (e) {
        newsEmpty.textContent = 'Failed to load articles.';
        newsEmpty.style.display = 'block';
        console.error('Error loading news:', e);
      }
    }

    // Auto-load on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadArticles);
    } else {
      loadArticles();
    }
  })();

})()
