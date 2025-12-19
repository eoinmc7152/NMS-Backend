(function(){
  'use strict';

  async function hashPassword(pw){
    const enc = new TextEncoder();
    const data = enc.encode(pw || '');
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : []; } catch(e){ return []; } }

  
  function normalizeRiskLabel(label, score){
    const l = String(label || '').toLowerCase().trim();

    if (l.includes('high')) return 'High';
    if (l.includes('moderate') || l.includes('medium') || l === 'med') return 'Medium';
    if (l.includes('no risk') || l.includes('none')) return 'No Risk';
    if (l.includes('low')) return 'Low';

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

  
  function migratePatientsStorage(){
    const key = 'nmsPatients';
    const patients = safeJSONParse(localStorage.getItem(key));
    if (!Array.isArray(patients) || !patients.length) return;

    let changed = false;

    patients.forEach(p => {
      if (!p || typeof p !== 'object') return;

      if (typeof p.riskScore !== 'number') {
        const parsed = tryParseRiskScoreFromText(p.notes);
        if (typeof parsed === 'number') {
          p.riskScore = parsed;
          changed = true;
        }
      }

      const newRisk = normalizeRiskLabel(p.risk, (typeof p.riskScore === 'number' ? p.riskScore : null));
      if (String(p.risk || '') !== newRisk) {
        p.risk = newRisk;
        changed = true;
      }

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

  migratePatientsStorage();

  
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

  
  (function attachLogin(){
    const form = document.getElementById('login-form');
    if (!form) return;
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      if (loginError) loginError.textContent = '';
      const email = (emailInput.value || '').trim().toLowerCase();
      const pw = passwordInput.value || '';
      if (!email || !pw) { if (loginError) loginError.textContent = 'Please provide email and password.'; return; }
      try {
        const users = safeJSONParse(localStorage.getItem('nmsUsers'));
        const user = users.find(u => u.email === email);
        if (!user) { if (loginError) loginError.textContent = 'No account found for that email.'; return; }
        const h = await hashPassword(pw);
        if (h !== user.passwordHash) { if (loginError) loginError.textContent = 'Invalid password.'; return; }
        localStorage.setItem('nmsCurrentUser', String(user.id));
        setTimeout(()=> window.location.href = 'patients.html', 50);
      } catch(err){ if (loginError) loginError.textContent = 'An error occurred during login.'; }
    });
  })();

  
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

  
  function getCurrentUser() {
    const id = localStorage.getItem('nmsCurrentUser');
    if (!id) return null;
    const users = safeJSONParse(localStorage.getItem('nmsUsers'));
    return users.find(u => String(u.id) === String(id)) || null;
  }

  function renderUserArea() {
    const user = getCurrentUser();
    const href = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const hasLoginForm = !!document.getElementById('login-form');
    const hasAuthForm = !!document.querySelector('.auth-form');
    const isAuthPage = (
      href.includes('login.html') || href.includes('register.html') ||
      path.includes('/login') || path.includes('/register') ||
      hasLoginForm || hasAuthForm
    );
    const isPatientPage = href.includes('patient.html') || path.includes('/patient');

    if (isAuthPage || isPatientPage) {
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

  
  const CLOUD_BASE_URL = "https://nms-backend-835155720402.europe-west1.run.app";
  const CLOUD_API_KEY = "some-secret-key-123"; // hardcoded (college project)

  async function cloudFetch(path, options = {}) {
    const headers = {
      "Accept": "application/json",
      ...(options.headers || {}),
    };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    headers["X-API-Key"] = CLOUD_API_KEY;

    const res = await fetch(`${CLOUD_BASE_URL}${path}`, { ...options, headers });
    const raw = await res.text();

    let data;
    try { data = JSON.parse(raw); } catch { data = raw; }

    if (!res.ok) {
      throw new Error(`Cloud ${res.status} (${path}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    return data;
  }

  async function cloudGet(path) {
    return cloudFetch(path, { method: "GET" });
  }

  async function cloudPutPatient(id, payload) {
    try {
      return await cloudFetch(`/patients/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload || {}),
      });
    } catch (e) {
      console.warn('Cloud PUT patient failed', e);
      return null;
    }
  }

  async function cloudDeletePatient(id) {
    try {
      return await cloudFetch(`/patients/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn('Cloud DELETE patient failed', e);
      return null;
    }
  }

  async function cloudListPatients() {
    try {
      const data = await cloudGet(`/patients/?t=${Date.now()}`);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.patients)) return data.patients;
      return [];
    } catch (e) {
      try {
        const data = await cloudGet(`/patients?t=${Date.now()}`);
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.patients)) return data.patients;
      } catch (err) {
        console.warn('Cloud list patients failed', err);
      }
      return [];
    }
  }

  
  function syncCloudResultsIntoPatients(results){
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

          
          ownerId: '',

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

  
  (function attachCloudResults(){
    const btn = document.getElementById('cloud-fetch-results');
    const syncBtn = document.getElementById('cloud-sync-patients');
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

    async function fetchAndSync() {
      setStatus('Checking backend health...');
      outEl.textContent = '';
      try {
        await cloudFetch('/health/', { method: 'GET' });
        setStatus('Backend online - Loading results...');
        const data = await cloudFetch('/results/?limit=20', { method: 'GET' });
        setStatus(`Cloud results loaded (${(data.results || []).length})`);
        renderResults(data);

        if (data && data.results && data.results.length > 0) {
          const sync = syncCloudResultsIntoPatients(data.results);
          setStatus(`Synced to Web Patients (new: ${sync.created}, updated: ${sync.updated})`);
          try { window.dispatchEvent(new Event('storage')); } catch(e){}
        }
      } catch (e) {
        setStatus('Failed (see console)');
        outEl.textContent = String(e);
        console.error(e);
      }
    }

    btn.addEventListener('click', fetchAndSync);

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        if (!lastPayload || !lastPayload.results) return alert('Load cloud results first.');
        const sync = syncCloudResultsIntoPatients(lastPayload.results || []);
        setStatus(`Synced to Web Patients (new: ${sync.created}, updated: ${sync.updated})`);
        try { window.dispatchEvent(new Event('storage')); } catch(e){}
        alert(`Synced patients.\nNew: ${sync.created}\nUpdated: ${sync.updated}`);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fetchAndSync);
    } else {
      fetchAndSync();
    }
  })();

  
  (function attachPatientsPage(){
    function init() {
      const tbody = document.getElementById('patients-tbody');
      if (!tbody) return;

      function formatDate(d) {
        const dt = new Date(d);
        const day = String(dt.getDate()).padStart(2,'0');
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month = monthNames[dt.getMonth()];
        const year = dt.getFullYear();
        return `${day} ${month} ${year}`;
      }

      const STORAGE_KEY = 'nmsPatients';

      function loadPatients() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); } catch (e) { return []; }
      }

      function savePatients(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

      function renderPatients(list) {
        tbody.innerHTML = '';

        const visible = list || [];

        if (!visible.length) {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td colspan="7" style="text-align:center; color:var(--muted);">No patients yet. Add a patient or sync from cloud results.</td>`;
          tbody.appendChild(tr);
          return;
        }

        visible.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${p.name}</td>
            <td>${p.age}</td>
            <td><span class="date-pill">${p.lastUpdated}</span></td>
            <td>${p.risk}</td>
            <td>${p.notes || ''}</td>
            <td><a class="btn-chip" href="patient.html?id=${p.id}">Click here</a></td>
            <td class="action-buttons"><a class="btn-chip" href="checklist.html?patientId=${p.id}">Checklist</a><button class="btn-chip remove-btn" data-id="${p.id}" type="button">Remove</button></td>
          `;
          tbody.appendChild(tr);
        });
      }

      let patients = loadPatients();
      renderPatients(patients);

      (async () => {
        try {
          const remote = await cloudListPatients();
          if (remote && remote.length) {
            const byId = {};
            patients.forEach(p => { byId[String(p.id)] = p; });

            remote.forEach(r => {
              const rid = String(r.id ?? r.patientId ?? '').trim();
              if (!rid) return;
              const riskScore = typeof r.riskScore === 'number' ? r.riskScore : (typeof r.risk_score === 'number' ? r.risk_score : null);
              const riskLabelRaw = r.risk ?? r.risk_label ?? '';
              const risk = normalizeRiskLabel(riskLabelRaw, riskScore);
              const merged = {
                id: rid,
                name: r.name || `Patient ${rid}`,
                age: (r.age != null ? r.age : (byId[rid] ? byId[rid].age : '')),
                lastUpdated: r.lastUpdated || r.updatedAt || r.createdAt || (byId[rid] ? byId[rid].lastUpdated : ''),
                risk,
                riskScore: (riskScore != null ? riskScore : (byId[rid] ? byId[rid].riskScore : null)),
                notes: r.notes != null ? r.notes : (byId[rid] ? byId[rid].notes : '')
              };
              byId[rid] = merged;
            });

            patients = Object.values(byId);
            savePatients(patients);
            renderPatients(patients);
            try { window.dispatchEvent(new Event('storage')); } catch(e){}
          }
        } catch (e) {
          console.warn('Backend patients merge skipped', e);
        }
      })();

      const addBtn = document.getElementById('add-patient-btn');
      const formWrap = document.getElementById('patient-form');
      const newForm = document.getElementById('new-patient-form');
      const cancelBtn = document.getElementById('cancel-patient');

      if (addBtn) addBtn.addEventListener('click', () => { if (formWrap) { formWrap.style.display = ''; formWrap.setAttribute('aria-hidden','false'); formWrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
      if (cancelBtn) cancelBtn.addEventListener('click', () => { if (newForm) newForm.reset(); if (formWrap) { formWrap.style.display = 'none'; formWrap.setAttribute('aria-hidden','true'); } });

      if (newForm) {
        newForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = document.getElementById('p-name').value.trim();
          const age = document.getElementById('p-age').value.trim();
          const risk = document.getElementById('p-risk').value;
          const notes = document.getElementById('p-notes').value.trim();
          if (!name) return alert('Please enter a name');

          const currentUserId = localStorage.getItem('nmsCurrentUser');
          if (!currentUserId) return alert('You must be logged in to create a patient.');

          const p = {
            id: Date.now(),
            name,
            age: age || '—',
            lastUpdated: formatDate(new Date()),
            risk,
            notes
          };

          patients.push(p);
          savePatients(patients);
          renderPatients(patients);
          (async () => { await cloudPutPatient(p.id, p); })();
          newForm.reset();
          if (formWrap) { formWrap.style.display = 'none'; formWrap.setAttribute('aria-hidden','true'); }
        });
      }

      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-btn'); if (!btn) return;
        const id = btn.getAttribute('data-id');
        let targetId = id;
        if (!targetId) { const row = btn.closest('tr'); const idx = Array.from(tbody.children).indexOf(row); targetId = patients[idx] && patients[idx].id; }
        if (!targetId) return;
        const target = patients.find(p => String(p.id) === String(targetId));
        if (!target) return;

        let currentUser = null;
        try { const allUsers = JSON.parse(localStorage.getItem('nmsUsers')||'[]'); currentUser = allUsers.find(u=>String(u.id)===String(localStorage.getItem('nmsCurrentUser'))) || null; } catch(e){ currentUser = null; }
        if (!currentUser) return alert('You must be logged in to remove a patient.');
        if (!confirm('Remove patient '+target.name+'?')) return;
        patients = patients.filter(p => String(p.id) !== String(targetId)); savePatients(patients); renderPatients(patients);
        (async () => { await cloudDeletePatient(targetId); })();
      });

      window.addEventListener('storage', () => { patients = loadPatients(); renderPatients(patients); });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();

  
  (function attachNewsPage(){
    function init() {
      const newsList = document.getElementById('news-list');
      if (!newsList) return;

      const NEWS_API_URL = 'https://ruaidhri.pythonanywhere.com/get_news';

      function extractArticles(data){
        if (!data) return [];
        if (Array.isArray(data)) return data;
        const keys = ['articles','results','news','items','data'];
        for (const k of keys){ if (Array.isArray(data[k])) return data[k]; }
        // Deep search: find first array of objects that look like articles
        const seen = new Set();
        function looksLikeArticle(o){
          if (!o || typeof o !== 'object') return false;
          const s = JSON.stringify(o).toLowerCase();
          return s.includes('title') || s.includes('headline') || s.includes('summary') || s.includes('description');
        }
        function dfs(obj){
          if (!obj || typeof obj !== 'object') return null;
          if (seen.has(obj)) return null; seen.add(obj);
          if (Array.isArray(obj)) {
            if (obj.length && obj.every(x => typeof x === 'object')) return obj;
            return null;
          }
          for (const v of Object.values(obj)){
            if (Array.isArray(v)){
              if (v.length && v.every(x => typeof x === 'object') && v.some(looksLikeArticle)) return v;
            } else if (v && typeof v === 'object'){
              const r = dfs(v); if (r) return r;
            }
          }
          return null;
        }
        const found = dfs(data);
        if (found) return found;
        // Map of id -> article
        if (typeof data === 'object'){
          const vals = Object.values(data);
          if (vals.length && vals.every(v => typeof v === 'object')) return vals;
        }
        return [];
      }

      function normalize(a){
        if (a == null) return { title: 'Untitled', summary: '', source: 'News', date: '' };
        if (typeof a !== 'object') {
          const s = String(a);
          return { title: s || 'Untitled', summary: '', source: 'News', date: '' };
        }
        return {
          title: a.title || a.headline || a.name || 'Untitled',
          summary: a.summary || a.excerpt || a.description || a.text || '',
          source: a.source || a.publisher || a.site || a.domain || 'News',
          date: a.date || a.published_date || a.published || a.time || a.created_at || ''
        };
      }

      async function loadNews() {
        try {
          const response = await fetch(`${NEWS_API_URL}?t=${Date.now()}` , {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
            mode: 'cors',
            credentials: 'omit'
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const contentType = response.headers.get('content-type') || '';
          const raw = await response.text();
          let data = null; try { data = JSON.parse(raw); } catch(e) {}
          let rawArticles = extractArticles(data);

          // If API returns a summary-style JSON (e.g., { weekly_summary: "..." })
          if ((!rawArticles || rawArticles.length === 0) && data && typeof data === 'object'){
            // Common alternative arrays
            if (Array.isArray(data.headlines)) rawArticles = data.headlines;
            else if (Array.isArray(data.entries)) rawArticles = data.entries;
            else if (Array.isArray(data.stories)) rawArticles = data.stories;

            // Single summary field promoted to one article
            const summaryFields = ['weekly_summary','summary','highlights','overview'];
            for (const f of summaryFields){
              if ((!rawArticles || rawArticles.length === 0) && typeof data[f] === 'string' && data[f].trim()){
                rawArticles = [{ title: 'Weekly Summary', summary: data[f], source: 'API', date: '' }];
                break;
              }
            }

            // Generic: collect long string values as articles
            if (!rawArticles || rawArticles.length === 0){
              const strings = Object.entries(data)
                .filter(([k,v]) => typeof v === 'string' && v.trim().length > 30)
                .map(([k,v]) => ({ title: k.replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), summary: v, source: 'API', date: '' }));
              if (strings.length) rawArticles = strings;
            }
          }
          // Fallback: NDJSON or plain-text lines containing JSON objects
          if ((!rawArticles || rawArticles.length === 0) && raw && !data){
            const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            const objs = [];
            for (const line of lines){
              try { const o = JSON.parse(line); if (o && typeof o === 'object') objs.push(o); } catch {}
            }
            if (objs.length) rawArticles = objs; else if (lines.length) rawArticles = lines; // treat lines as titles
          }

          newsList.innerHTML = '';

          if (!rawArticles || rawArticles.length === 0) {
            const preview = (raw || '').slice(0, 180).replace(/[\n\r]+/g,' ').replace(/["<>]/g, '');
            const hint = raw && raw.trim().startsWith('<') ? 'Backend returned HTML' : (data && (data.error || data.message) ? String(data.error || data.message) : 'No articles parsed');
            newsList.innerHTML = `<div class="news-empty muted">${hint}. Content-Type: ${contentType || 'unknown'}. Preview: ${preview}</div>`;
            return;
          }

          rawArticles.forEach(src => {
            const article = normalize(src);
            const card = document.createElement('article');
            card.className = 'news-card';

            const cardBody = document.createElement('div');
            cardBody.className = 'news-card-body';

            const title = document.createElement('h3');
            title.className = 'news-title';
            title.textContent = article.title;

            const excerpt = document.createElement('p');
            excerpt.className = 'news-excerpt';
            excerpt.textContent = article.summary;

            cardBody.appendChild(title);
            cardBody.appendChild(excerpt);

            const meta = document.createElement('div');
            meta.className = 'news-meta';
            meta.innerHTML = `
              <span class="news-source muted">${article.source}</span>
              <span class="news-date muted">${article.date}</span>
            `;

            const actions = document.createElement('div');
            actions.className = 'news-actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn-chip';
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => {
              const text = `${article.title}\n\n${article.summary}\n\nSource: ${article.source}`;
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `article_${Date.now()}.txt`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            });

            const printBtn = document.createElement('button');
            printBtn.className = 'btn-chip';
            printBtn.textContent = 'Print';
            printBtn.addEventListener('click', () => {
              const printWindow = window.open('', '', 'height=600,width=800');
              printWindow.document.write(`
                <html>
                  <head>
                    <title>${article.title}</title>
                    <style>
                      body { font-family: system-ui, sans-serif; line-height: 1.6; margin: 20px; }
                      h1 { margin-bottom: 10px; }
                      .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                    </style>
                  </head>
                  <body>
                    <h1>${article.title}</h1>
                    <div class="meta">Source: ${article.source || 'News'} | ${article.date || ''}</div>
                    <p>${(article.summary || article.excerpt || '').replace(/\n/g, '<br>')}</p>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            });

            actions.appendChild(downloadBtn);
            actions.appendChild(printBtn);

            card.appendChild(cardBody);
            card.appendChild(meta);
            card.appendChild(actions);

            newsList.appendChild(card);
          });
        } catch (error) {
          newsList.innerHTML = `<div class="news-empty muted">Failed to load news: ${error.message}</div>`;
        }
      }

      const refreshBtn = document.getElementById('news-refresh');
      if (refreshBtn) {
        const setBusy = (b)=>{ refreshBtn.disabled = !!b; refreshBtn.textContent = b ? 'Refreshing…' : 'Refresh'; };
        refreshBtn.addEventListener('click', (e)=>{ e.preventDefault(); setBusy(true); loadNews().finally(()=> setBusy(false)); });
      }

      loadNews();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();

  
  (function attachChecklistPage(){
    function init(){
      const form = document.getElementById('checklist-form');
      if (!form) return; // not on checklist page

      const params = new URLSearchParams(location.search);
      const patientId = params.get('patientId') || '';

      const dateEl = document.getElementById('checklist-date');
      const statusEl = document.getElementById('checklist-status');
      const warnEl = document.getElementById('checklist-warning');
      const exportBtn = document.getElementById('checklist-export');
      const printBtn = document.getElementById('checklist-print');
      const clearBtn = document.getElementById('checklist-clear');
      const patientLabel = document.getElementById('checklist-patient-label');
      const sleepEl = document.getElementById('sleep-hours');
      const moodEl = document.getElementById('mood');
      const notesEl = document.getElementById('checklist-notes');

      if (patientLabel) {
        patientLabel.textContent = patientId ? `For patient ID: ${patientId}` : 'No patient selected';
      }

      const STORAGE_KEY = `nmsChecklist:${patientId || 'unknown'}`;
      const today = new Date();
      const toISODate = (d)=>{
        const dt = (d instanceof Date) ? d : new Date(d);
        const y = dt.getFullYear();
        const m = String(dt.getMonth()+1).padStart(2,'0');
        const day = String(dt.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
      };

      if (!dateEl.value) dateEl.value = toISODate(today);

      const routine = [
        { id: 'meds', label: 'Taken medication' },
        { id: 'hydration', label: 'Hydrated' },
        { id: 'meals', label: 'Had meals' },
        { id: 'hygiene', label: 'Completed hygiene' },
        { id: 'tracker', label: 'Wearing tracker' },
        { id: 'wandering', label: 'No wandering' },
        { id: 'agitation', label: 'No agitation' }
      ];

      // Build routine checklist UI
      form.innerHTML = '';
      routine.forEach(item => {
        const row = document.createElement('div');
        row.className = 'checklist-row';
        const label = document.createElement('label');
        label.setAttribute('for', `chk-${item.id}`);
        label.innerHTML = `<strong>${item.label}</strong>`;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `chk-${item.id}`;
        input.dataset.key = item.id;
        row.appendChild(label);
        row.appendChild(input);
        form.appendChild(row);
      });

      function loadAll(){
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
      }
      function saveAll(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data || {})); }

      function currentDateKey(){ return dateEl && dateEl.value ? dateEl.value : toISODate(new Date()); }

      function readUI(){
        const out = { routine: {}, wellbeing: {} };
        form.querySelectorAll('input[type="checkbox"]').forEach(chk => {
          out.routine[chk.dataset.key] = !!chk.checked;
        });
        out.wellbeing.sleepHours = sleepEl ? (sleepEl.value || '') : '';
        out.wellbeing.mood = moodEl ? (moodEl.value || '') : '';
        out.wellbeing.notes = notesEl ? (notesEl.value || '') : '';
        return out;
      }

      function writeUI(data){
        const d = data || { routine:{}, wellbeing:{} };
        form.querySelectorAll('input[type="checkbox"]').forEach(chk => {
          const key = chk.dataset.key;
          chk.checked = !!(d.routine && d.routine[key]);
        });
        if (sleepEl) sleepEl.value = d.wellbeing && d.wellbeing.sleepHours ? d.wellbeing.sleepHours : '';
        if (moodEl) moodEl.value = d.wellbeing && d.wellbeing.mood ? d.wellbeing.mood : '';
        if (notesEl) notesEl.value = d.wellbeing && d.wellbeing.notes ? d.wellbeing.notes : '';
        updateWarning();
      }

      function setStatus(msg){ if (statusEl) statusEl.textContent = msg; }

      let saveTimer = null;
      function scheduleSave(){
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const all = loadAll();
          const key = currentDateKey();
          all[key] = readUI();
          saveAll(all);
          const now = new Date();
          const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setStatus(`Saved at ${time}.`);
        }, 250);
      }

      function loadDate(key){
        const all = loadAll();
        writeUI(all[key] || { routine:{}, wellbeing:{} });
        setStatus('Loaded.');
      }

      function updateWarning(){
        if (!warnEl) return;
        const d = readUI();
        const issues = [];
        if (d && d.routine) {
          if (d.routine.meds === false) issues.push('Medication not recorded');
          if (d.routine.hydration === false) issues.push('Hydration not confirmed');
          if (d.routine.wandering === false) issues.push('Wandering risk noted');
          if (d.routine.agitation === false) issues.push('Agitation observed');
        }
        if (issues.length) {
          warnEl.textContent = issues.join(' • ');
          warnEl.style.display = '';
        } else {
          warnEl.style.display = 'none';
          warnEl.textContent = '';
        }
      }

      // Wire events
      form.addEventListener('change', () => { updateWarning(); scheduleSave(); });
      if (sleepEl) sleepEl.addEventListener('input', scheduleSave);
      if (moodEl) moodEl.addEventListener('change', scheduleSave);
      if (notesEl) notesEl.addEventListener('input', scheduleSave);
      if (dateEl) dateEl.addEventListener('change', () => { loadDate(currentDateKey()); setStatus('Date changed.'); });

      if (exportBtn) exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(loadAll(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nms_checklist_${patientId || 'unknown'}.json`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      });

      if (printBtn) printBtn.addEventListener('click', () => { window.print(); });

      if (clearBtn) clearBtn.addEventListener('click', () => {
        const key = currentDateKey();
        const all = loadAll();
        if (all[key]) delete all[key];
        saveAll(all);
        writeUI({ routine:{}, wellbeing:{} });
        setStatus('Cleared this date.');
      });

      // Initial load
      loadDate(currentDateKey());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  })();
})();
