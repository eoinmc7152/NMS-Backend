/* Shared UI + auth script for the site
   - Burger menu: finds all toggles with id starting with 'burger-toggle' and wires their menus
   - Login & Register: client-side handlers (uses SHA-256 via Web Crypto).
   Note: This is intended for demo/prototyping only (client-side auth). See README notes for production.
*/
(function(){
  'use strict';

  // --- helpers ---
  async function hashPassword(pw){
    const enc = new TextEncoder();
    const data = enc.encode(pw || '');
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  // Admin creation code (demo only). Change or remove for production.
  const ADMIN_CREATION_CODE = 'ADMIN-INIT-2025';

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

  function safeJSONParse(raw){ try { return raw ? JSON.parse(raw) : []; } catch(e){ return []; } }

  // --- Registration handler (if present) ---
  (function attachRegister(){
    const confirmEl = document.getElementById('confirm-password');
    if (!confirmEl) return; // no register form on this page

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
        // public registration always creates a doctor account
        const role = 'doctor';
        const hash = await hashPassword(passwordInput.value || '');
        const user = { id: Date.now(), name, email, passwordHash: hash, createdAt: new Date().toISOString(), role };
        users.push(user);
        localStorage.setItem('nmsUsers', JSON.stringify(users));
        localStorage.setItem('nmsCurrentUser', String(user.id));
        // redirect to dashboard for doctors
        setTimeout(()=>{ window.location.href = 'dashboard.html'; }, 100);
      } catch(err){
        if (registerError) registerError.textContent = 'An error occurred creating the account.';
        console.error(err);
      }
    });

    // live clear
    [nameInput, emailInput, passwordInput, confirmInput].forEach(i=>{ if (!i) return; i.addEventListener('input', ()=>{ i.classList.remove('input-error'); if (passwordError) passwordError.textContent=''; if (confirmError) confirmError.textContent=''; if (registerError) registerError.textContent=''; }); });
  })();

  // --- Admin-only login form (optional on the login page) ---
  (function attachAdminLogin(){
    const form = document.getElementById('admin-login-form');
    if (!form) return;
    const emailInput = form.querySelector('#admin-email');
    const passwordInput = form.querySelector('#admin-password');
    const adminError = form.querySelector('.admin-error');

    form.addEventListener('submit', async function(e){
      e.preventDefault(); if (adminError) adminError.textContent = '';
      const email = (emailInput.value || '').trim().toLowerCase();
      const pw = passwordInput.value || '';
      if (!email || !pw) { if (adminError) adminError.textContent = 'Please provide email and password.'; return; }
      try {
        const users = safeJSONParse(localStorage.getItem('nmsUsers'));
        const user = users.find(u => u.email === email);
        if (!user) { if (adminError) adminError.textContent = 'No account found for that email.'; return; }
        if (user.role !== 'admin') { if (adminError) adminError.textContent = 'This login is for administrators only.'; return; }
        const h = await hashPassword(pw);
        if (h !== user.passwordHash) { if (adminError) adminError.textContent = 'Invalid password.'; return; }
        localStorage.setItem('nmsCurrentUser', String(user.id));
        setTimeout(()=> window.location.href = 'admin.html', 50);
      } catch(err){ console.error(err); if (adminError) adminError.textContent = 'An error occurred during login.'; }
    });
  })();

  // --- Login handler (if present) ---
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
        // redirect by role: admins -> admin.html, doctors -> dashboard.html
        const dest = (user.role === 'admin') ? 'admin.html' : 'dashboard.html';
        setTimeout(()=> window.location.href = dest, 50);
      } catch(err){ console.error(err); if (loginError) loginError.textContent = 'An error occurred during login.'; }
    });
  })();

  // --- Burger menu wiring (applies on any page) ---
  function setupBurgers(){
    const toggles = Array.from(document.querySelectorAll('[id^="burger-toggle"]'));
    toggles.forEach(btn => {
      // prefer predictable id mapping: burger-toggle-xxx -> burger-menu-xxx
      const menuId = btn.id.replace('toggle','menu');
      let menu = document.getElementById(menuId);
      if (!menu) {
        // fallback: find next sibling that is .burger-menu
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
    // find a spot in the appbar or top of document
    // don't render login/register links on the auth pages (they cause duplicated links below footer)
    const href = window.location.href.toLowerCase();
    const isAuthPage = href.includes('login.html') || href.includes('register.html');
    if (isAuthPage && !user) {
      // remove any existing stray user-area nodes
      const stray = document.querySelectorAll('.user-area');
      stray.forEach(n => { if (n && n.parentElement) n.parentElement.removeChild(n); });
      return;
    }

    let container = document.querySelector('.appbar');
    if (!container) container = document.body;

    // prefer existing .user-area
    let area = container.querySelector('.user-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'user-area';
      area.style.marginLeft = 'auto'; area.style.display = 'flex'; area.style.alignItems = 'center'; area.style.gap = '10px';
      container.appendChild(area);
    }
    area.innerHTML = '';

    if (!user) {
      // show login/register links
      const a1 = document.createElement('a'); a1.href = 'login.html'; a1.textContent = 'Login'; a1.className = 'pill';
      const a2 = document.createElement('a'); a2.href = 'register.html'; a2.textContent = 'Register'; a2.className = 'pill';
      area.appendChild(a1); area.appendChild(a2);
      return;
    }

    const name = document.createElement('span'); name.textContent = user.name || user.email || 'User'; name.style.fontWeight = '700'; name.title = user.email || '';
    const logout = document.createElement('button'); logout.textContent = 'Logout'; logout.className = 'btn-secondary';
    logout.addEventListener('click', ()=>{
      localStorage.removeItem('nmsCurrentUser');
      // refresh to login page
      window.location.href = 'login.html';
    });

    area.appendChild(name); area.appendChild(logout);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderUserArea); else renderUserArea();

  // --- Admin page handlers ---
  (function attachAdmin(){
    const usersContainer = document.getElementById('admin-users');
    const patientsContainer = document.getElementById('admin-patients');
    if (!usersContainer && !patientsContainer) return; // not on admin page

    function getUsers(){ return safeJSONParse(localStorage.getItem('nmsUsers')); }
    function saveUsers(u){ localStorage.setItem('nmsUsers', JSON.stringify(u)); }
    function getPatients(){ return safeJSONParse(localStorage.getItem('nmsPatients')); }
    function savePatients(p){ localStorage.setItem('nmsPatients', JSON.stringify(p)); }

    // render users table
    function renderUsers(){
      const users = getUsers();
      usersContainer.innerHTML = '';
      if (!users.length) { usersContainer.innerHTML = '<p class="muted">No users.</p>'; return; }
      const table = document.createElement('table'); table.className = 'tracker';
      table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      users.forEach(u=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.id}</td><td>${u.name || ''}</td><td>${u.email || ''}</td><td>${u.role||'doctor'}</td><td></td>`;
        const actionsTd = tr.querySelector('td:last-child');
        const resetBtn = document.createElement('button'); resetBtn.textContent='Reset PW'; resetBtn.className='btn-chip';
        resetBtn.addEventListener('click', async ()=>{
          // Prompt admin to enter a new password for the user instead of generating one
          const promptMsg = 'Enter new password for ' + (u.email || u.name || 'user') + ' (cancel to abort)';
          const newPw = prompt(promptMsg);
          if (newPw === null) return; // cancelled
          if (String(newPw).length < 8) { alert('Password must be at least 8 characters.'); return; }
          try {
            const h = await hashPassword(newPw);
            const all = getUsers();
            const idx = all.findIndex(x=>String(x.id)===String(u.id));
            if (idx > -1) { all[idx].passwordHash = h; saveUsers(all); alert('Password updated for ' + (u.email || u.name || 'user') + '.'); }
          } catch(e){ console.error('Failed to set password', e); alert('Failed to update password. See console.'); }
          renderUsers();
        });
        const delBtn = document.createElement('button'); delBtn.textContent='Delete'; delBtn.className='remove-btn';
        delBtn.addEventListener('click', ()=>{
          if (!confirm('Delete user '+(u.email||u.name)+'? This cannot be undone.')) return;
          let all = getUsers(); all = all.filter(x=>String(x.id)!==String(u.id)); saveUsers(all); renderUsers();
        });
        actionsTd.appendChild(resetBtn); actionsTd.appendChild(delBtn);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); usersContainer.appendChild(table);
    }

    // create user action
    const createBtn = document.getElementById('create-user');
    if (createBtn){
      createBtn.addEventListener('click', async ()=>{
        const email = (document.getElementById('new-user-email').value||'').trim().toLowerCase();
        const name = (document.getElementById('new-user-name').value||'').trim();
        const password = (document.getElementById('new-user-password').value||'');
        const role = (document.getElementById('new-user-role').value||'doctor');
        if (!email) return alert('Email required');
        if (!password) return alert('Password required');
        const all = getUsers();
        if (all.find(u=>u.email===email)) return alert('User exists');
        const h = await hashPassword(password);
        const user = { id: Date.now(), name, email, passwordHash: h, createdAt: new Date().toISOString(), role };
        all.push(user); saveUsers(all);
        alert('User created.');
        document.getElementById('new-user-email').value=''; document.getElementById('new-user-name').value=''; document.getElementById('new-user-password').value='';
        renderUsers();
      });
    }

    // render patients table and allow delete
    function renderPatients(){
      const pts = getPatients();
      patientsContainer.innerHTML='';
      if (!pts.length) { patientsContainer.innerHTML = '<p class="muted">No patients.</p>'; return; }
      const table = document.createElement('table'); table.className='tracker';
      table.innerHTML = `<thead><tr><th>Name</th><th>Age</th><th>Risk</th><th>Notes</th><th>Actions</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      pts.forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.name}</td><td>${p.age}</td><td>${p.risk}</td><td>${p.notes||''}</td><td></td>`;
        const td = tr.querySelector('td:last-child');
        const del = document.createElement('button'); del.textContent='Remove'; del.className='remove-btn';
        del.addEventListener('click', ()=>{
          if (!confirm('Remove patient '+p.name+'?')) return; const list = getPatients().filter(x=>String(x.id)!==String(p.id)); savePatients(list); renderPatients();
        });
        td.appendChild(del); tbody.appendChild(tr);
      }); table.appendChild(tbody); patientsContainer.appendChild(table);
    }

    renderUsers(); renderPatients();
  })();

})();
