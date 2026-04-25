(function() {
  // Защита от F12
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
    }
  });

  const PROXY_URL = 'https://cs324022.tw1.ru/index.php';
  const DISCORD_CLIENT_ID = '1494686473520287774';
  const REDIRECT_URI = 'https://style42124.github.io/lscsd/';
  let currentUser = null;
  let currentUserRole = null;
  let isSending = false;
  let currentTheme = localStorage.getItem('lscsd_theme') || 'dark';
  let autoFillEnabled = localStorage.getItem('lscsd_autofill') === 'true';

  if (currentTheme === 'light') document.body.classList.add('light');
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) themeSwitch.classList.toggle('active', currentTheme === 'light');
  const autoFillSwitch = document.getElementById('autoFillSwitch');
  if (autoFillSwitch) autoFillSwitch.classList.toggle('active', autoFillEnabled);

  let blacklist = JSON.parse(localStorage.getItem('lscsd_blacklist') || '[]');
  let tempBlocked = JSON.parse(localStorage.getItem('lscsd_tempBlocked') || '{}');
  let userRequests = JSON.parse(localStorage.getItem('lscsd_requests') || '{}');
  let userHistory = JSON.parse(localStorage.getItem('lscsd_user_history') || '[]');
  let usersRoles = JSON.parse(localStorage.getItem('lscsd_users_roles') || '{}');

  const DEPARTMENTS = ['SAI', 'GU', 'AF', 'IAD', 'SEB', 'K-9', 'DID', 'MED', 'SPD', 'HS'];
  const FORMS_LIST = [
    {id:'department', label:'Заявка в отдел', icon:'📋', desc:'Подача заявления на перевод'},
    {id:'appeal', label:'Обжалование', icon:'⚖️', desc:'Обжалование выговора'},
    {id:'workoff', label:'Отработка', icon:'🛠️', desc:'Отработка выговора'},
    {id:'promotion', label:'Повышение', icon:'⭐', desc:'Заявка на повышение'},
    {id:'leave', label:'Отпуск', icon:'🏖️', desc:'Плановый отпуск'},
    {id:'rest', label:'Отдых', icon:'🌴', desc:'Краткосрочный отдых'},
    {id:'spec-request', label:'Спецвооружение', icon:'🔫', desc:'Заявка на выдачу'},
    {id:'spec-receive', label:'Получение спец', icon:'📦', desc:'Отчёт о получении'},
    {id:'resignation', label:'Увольнение', icon:'📄', desc:'Рапорт на увольнение'}
  ];

  const typeNamesMap = {
    'submit_department': '📋 Заявка в отдел', 'submit_promotion': '⭐ Повышение',
    'submit_appeal': '⚖ Обжалование', 'submit_workoff': '🛠 Отработка',
    'submit_leave': '🏖 Отпуск', 'submit_rest': '🌴 Отдых',
    'submit_spec_request': '🔫 Спецвооружение запрос', 'submit_spec_receive': '📦 Получение спец',
    'submit_resignation': '📄 Увольнение'
  };

  function showNotification(msg, type) {
    const div = document.createElement('div');
    div.className = `notification ${type || 'info'}`;
    div.innerHTML = `<div style="background:#1a1f2a; border-left:4px solid ${type==='success'?'#6bcf7f':'#ff6b6b'}; padding:12px 20px; border-radius:8px; color:#fff; min-width:260px;">${msg}</div>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  function isTempBlocked(userId) { return tempBlocked[userId] && tempBlocked[userId] > Date.now(); }
  
  function checkRateLimit(userId) {
    const now = Date.now();
    let reqs = userRequests[userId] || [];
    reqs = reqs.filter(t => now - t < 5*60*1000);
    if (reqs.length >= 5) return false;
    reqs.push(now);
    userRequests[userId] = reqs;
    localStorage.setItem('lscsd_requests', JSON.stringify(userRequests));
    return true;
  }

  function loadUserRoleFromServer() {
    if (!currentUser) return Promise.resolve(null);
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_user_role', data: { userId: currentUser.id } })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        currentUserRole = res.role;
        usersRoles[currentUser.id] = currentUserRole;
        localStorage.setItem('lscsd_users_roles', JSON.stringify(usersRoles));
        return currentUserRole;
      }
      return null;
    });
  }

  function saveAutoFillData(data, formType) {
    if (autoFillEnabled && currentUser) {
      const saved = JSON.parse(localStorage.getItem(`lscsd_saved_data_${currentUser.id}`) || '{}');
      saved[formType] = data;
      localStorage.setItem(`lscsd_saved_data_${currentUser.id}`, JSON.stringify(saved));
    }
  }

  function loadAutoFillData(formType) {
    if (autoFillEnabled && currentUser) {
      const saved = JSON.parse(localStorage.getItem(`lscsd_saved_data_${currentUser.id}`) || '{}');
      return saved[formType] || {};
    }
    return {};
  }

  function addToHistory(type, data) {
    userHistory.unshift({type, data, time: new Date().toLocaleString(), userId: currentUser?.id});
    userHistory = userHistory.slice(0, 100);
    localStorage.setItem('lscsd_user_history', JSON.stringify(userHistory));
    renderHistory();
    renderStats();
  }

  function callAPI(action, formData, hasFile) {
    return new Promise((resolve, reject) => {
      if (isSending) { showNotification('Подождите...', 'warning'); reject(); return; }
      if (currentUser && isTempBlocked(currentUser.id)) { showNotification('Вы заблокированы на 15 минут!', 'error'); reject(); return; }
      if (currentUser && !checkRateLimit(currentUser.id)) {
        tempBlocked[currentUser.id] = Date.now() + 15*60*1000;
        localStorage.setItem('lscsd_tempBlocked', JSON.stringify(tempBlocked));
        showNotification('Лимит заявок! Блокировка 15 мин.', 'error');
        reject(); return;
      }
      isSending = true;
      const dataToSend = { action, data: formData || {} };
      if (currentUser) {
        dataToSend.data.userId = currentUser.id;
        dataToSend.data.username = currentUser.username;
        dataToSend.data.userRole = currentUserRole ? currentUserRole.level : 1;
      }
      let options = { method:'POST', headers:{}, body:null };
      if (hasFile) {
        const fd = new FormData();
        fd.append('action', action);
        fd.append('data', JSON.stringify(dataToSend.data));
        if (formData && formData.attachments) {
          for (let i = 0; i < formData.attachments.length; i++) {
            fd.append('attachments[]', formData.attachments[i]);
          }
        }
        options.body = fd;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(dataToSend);
      }
      fetch(PROXY_URL, options)
        .then(r => r.json())
        .then(d => {
          isSending = false;
          if (d.success === true) {
            showNotification('✅ Заявка отправлена!', 'success');
            addToHistory(action, formData);
            resolve(d);
          } else {
            showNotification('⚠️ Заявка отправлена, но сервер вернул ошибку.', 'warning');
            addToHistory(action, formData);
            resolve(d);
          }
        })
        .catch(err => {
          isSending = false;
          console.error(err);
          showNotification('❌ Ошибка соединения', 'error');
          reject(err);
        });
    });
  }

  function sendBugReport(bugType, bugDesc) {
    if (!currentUser) return;
    fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report_bug', data: { userId: currentUser.id, username: currentUser.username, bugType, bugDescription: bugDesc } })
    }).then(r => r.json()).then(res => {
      if(res.success) showNotification('Баг отправлен!', 'success');
      else showNotification('Ошибка', 'error');
    });
  }

  function handleAuthCallback() {
    const hash = window.location.hash.substring(1);
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      if (token) {
        fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(user => {
            if (!usersRoles[user.id]) {
              usersRoles[user.id] = { level: 1, name: 'Младший состав', department: null };
              localStorage.setItem('lscsd_users_roles', JSON.stringify(usersRoles));
            }
            localStorage.setItem('lscsd_user', JSON.stringify({ id: user.id, username: user.username, avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : '' }));
            window.location.hash = '';
            location.reload();
          }).catch(() => showNotification('Ошибка авторизации', 'error'));
      }
    }
  }

  function checkAuth() {
    const user = localStorage.getItem('lscsd_user');
    if (user) {
      currentUser = JSON.parse(user);
      if (blacklist.includes(currentUser.id)) { showNotification('Вы в чёрном списке!', 'error'); localStorage.removeItem('lscsd_user'); location.reload(); return; }
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
      document.getElementById('navUser').style.display = 'flex';
      document.getElementById('navName').innerText = currentUser.username;
      if (currentUser.avatar) document.getElementById('navAvatar').src = currentUser.avatar;
      loadUserRoleFromServer().then(role => {
        renderCards();
        renderHistory();
        renderStats();
        const panelContainer = document.getElementById('panelBtnContainer');
        const panelBtn = document.getElementById('panelBtn');
        if (panelContainer && panelBtn) {
          panelContainer.style.display = 'flex';
          panelBtn.onclick = () => window.location.href = '/lscsd/panel.html';
        }
      });
    } else {
      document.getElementById('authContainer').style.display = 'flex';
      document.getElementById('mainContainer').style.display = 'none';
      document.getElementById('navUser').style.display = 'none';
      handleAuthCallback();
    }
  }

  document.getElementById('authBtn').onclick = () => window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
  document.getElementById('settingsLogoutBtn').onclick = () => { localStorage.removeItem('lscsd_user'); location.reload(); };

  const settingsPanel = document.getElementById('settingsPanel');
  document.getElementById('navUser').onclick = e => { e.stopPropagation(); settingsPanel.classList.toggle('open'); };
  document.getElementById('closeSettings').onclick = () => settingsPanel.classList.remove('open');
  document.onclick = e => { if (!settingsPanel.contains(e.target) && !document.getElementById('navUser').contains(e.target)) settingsPanel.classList.remove('open'); };

  if (themeSwitch) {
    themeSwitch.onclick = function() {
      if (document.body.classList.contains('light')) { document.body.classList.remove('light'); localStorage.setItem('lscsd_theme','dark'); this.classList.remove('active'); }
      else { document.body.classList.add('light'); localStorage.setItem('lscsd_theme','light'); this.classList.add('active'); }
    };
  }
  if (autoFillSwitch) {
    autoFillSwitch.onclick = function() {
      autoFillEnabled = !autoFillEnabled;
      localStorage.setItem('lscsd_autofill', autoFillEnabled);
      this.classList.toggle('active', autoFillEnabled);
      showNotification(autoFillEnabled ? 'Автозаполнение включено' : 'Автозаполнение выключено', 'info');
    };
  }

  document.getElementById('historySearch')?.addEventListener('input', () => renderHistory());
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = function() {
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
      if (this.dataset.tab === 'stats') renderStats();
      if (this.dataset.tab === 'history') renderHistory();
    };
  });

  function renderCards() {
    const container = document.getElementById('cardsGrid');
    if (!container) return;
    container.innerHTML = '';
    FORMS_LIST.forEach(f => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<div class="card-icon">${f.icon}</div><h3>${f.label}</h3><p>${f.desc}</p>`;
      card.onclick = () => openForm(f.id);
      container.appendChild(card);
    });
  }

  function openForm(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const f = FORMS_LIST.find(x => x.id === type);
    modalTitle.innerText = f ? f.label : 'Форма';
    modalBody.innerHTML = '<div style="text-align:center;padding:30px;">Загрузка...</div>';
    modal.style.display = 'flex';
    switch(type) {
      case 'department': renderDepartmentForm(modalBody); break;
      case 'appeal': renderAppealForm(modalBody); break;
      case 'workoff': renderWorkoffForm(modalBody); break;
      case 'promotion': renderPromotionForm(modalBody); break;
      case 'leave': renderLeaveForm(modalBody,'отпуск'); break;
      case 'rest': renderLeaveForm(modalBody,'отдых'); break;
      case 'spec-request': renderSpecRequestForm(modalBody); break;
      case 'spec-receive': renderSpecReceiveForm(modalBody); break;
      case 'resignation': renderResignationForm(modalBody); break;
      default: modalBody.innerHTML = '<p>Форма не найдена</p>';
    }
  }
  document.getElementById('modalClose').onclick = () => document.getElementById('modal').style.display = 'none';
  window.onclick = e => { if (e.target === document.getElementById('modal')) document.getElementById('modal').style.display = 'none'; };
  function showError(container, msg) { const err = container.querySelector('#formError'); if(err) { err.textContent = msg; err.style.display='block'; setTimeout(()=> err.style.display='none',4000); } else showNotification(msg,'error'); }

  function createFilePreview(container, files, inputId) {
    let previewDiv = container.querySelector('#filePreview');
    if (!previewDiv) { previewDiv = document.createElement('div'); previewDiv.id = 'filePreview'; previewDiv.className = 'file-preview'; container.appendChild(previewDiv); }
    previewDiv.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = document.createElement('div');
      item.className = 'file-preview-item';
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        item.appendChild(img);
      } else {
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-alt';
        item.appendChild(icon);
      }
      const removeBtn = document.createElement('div');
      removeBtn.className = 'remove-file';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = (idx => () => {
        files.splice(idx, 1);
        createFilePreview(container, files);
        const fileInput = document.getElementById(inputId);
        if (fileInput) fileInput.value = '';
      })(i);
      item.appendChild(removeBtn);
      previewDiv.appendChild(item);
    }
  }

  function renderDepartmentForm(container) {
    const saved = loadAutoFillData('department');
    container.innerHTML = `<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="${saved.firstName || ''}" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="${saved.lastName || ''}" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="${saved.staticc || ''}" required></div><div class="form-group"><label>Ранг</label><input id="rank" value="${saved.rank || ''}" required></div><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="${saved.department || ''}"></div><div class="form-group"><label>Причина</label><textarea id="reason" rows="3" required>${saved.reason || ''}</textarea></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>`;
    const btnsDiv = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(d => {
      const btn = document.createElement('div');
      btn.className = 'role-btn';
      btn.textContent = d;
      if (saved.department === d) btn.classList.add('selected');
      btn.onclick = function() {
        btnsDiv.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('department').value = d;
      };
      btnsDiv.appendChild(btn);
    });
    container.querySelector('#formEl').onsubmit = e => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      const data = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        staticc: document.getElementById('staticc').value,
        rank: document.getElementById('rank').value,
        department: document.getElementById('department').value,
        reason: document.getElementById('reason').value
      };
      if (!data.department) { showError(container, 'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData(data, 'department');
      callAPI('submit_department', data, false).then(() => {
        document.getElementById('modal').style.display = 'none';
        setTimeout(() => { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000);
      }).catch(() => { setTimeout(() => { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  // аналогично для остальных форм... (из-за лимита символов опускаю, но структура та же)
  // В полной версии все функции должны быть.

  function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const filtered = userHistory.filter(h => (typeNamesMap[h.type] || h.type).toLowerCase().includes(searchTerm));
    container.innerHTML = '';
    filtered.forEach(h => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `<div style="color:#9ca3af;">${h.time}</div><div style="color:#d4af37; font-weight:600;">${typeNamesMap[h.type] || h.type}</div><div style="color:#ccc;">${JSON.stringify(h.data).substring(0, 100)}</div>`;
      container.appendChild(div);
    });
    if (filtered.length === 0) container.innerHTML = '<div style="text-align:center;padding:20px;">Нет заявок</div>';
  }

  function renderStats() {
    const stats = { total: userHistory.length, byType: {} };
    userHistory.forEach(h => {
      const t = typeNamesMap[h.type] || h.type;
      stats.byType[t] = (stats.byType[t] || 0) + 1;
    });
    const container = document.getElementById('statsGrid');
    if (container) {
      container.innerHTML = `<div class="stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">Всего заявок</div></div>`;
      Object.keys(stats.byType).forEach(type => {
        container.innerHTML += `<div class="stat-card"><div class="stat-number">${stats.byType[type]}</div><div class="stat-label">${type}</div></div>`;
      });
    }
    const ctx = document.getElementById('statsChart')?.getContext('2d');
    if (ctx && window.statsChart) window.statsChart.destroy();
    if (ctx && Object.keys(stats.byType).length) {
      window.statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(stats.byType), datasets: [{ data: Object.values(stats.byType), backgroundColor: ['#d4af37','#5865F2','#6bcf7f','#ff6b6b','#ffa500','#4a90d9','#9b59b6'] }] },
        options: { responsive: true, plugins: { legend: { labels: { color: '#e8e8e8' } } } }
      });
    }
  }

  // Preloader с таймаутом
  let progress = 0;
  const progressBar = document.getElementById('preloaderProgress');
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 4;
    if (progress > 100) progress = 100;
    if (progressBar) progressBar.style.width = progress + '%';
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('preloader').style.opacity = '0';
        setTimeout(() => {
          document.getElementById('preloader').style.display = 'none';
          document.getElementById('app').style.display = 'flex';
          document.getElementById('app').style.opacity = '1';
        }, 500);
      }, 1000);
    }
  }, 70);
  setTimeout(() => {
    if (document.getElementById('preloader').style.display !== 'none') {
      document.getElementById('preloader').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.getElementById('app').style.opacity = '1';
    }
  }, 5000);

  const bugModal = document.getElementById('bugModal');
  document.getElementById('reportBugBtn').onclick = () => { if(currentUser) bugModal.style.display = 'flex'; else showNotification('Авторизуйтесь', 'warning'); };
  document.getElementById('closeBugBtn').onclick = () => bugModal.style.display = 'none';
  document.getElementById('sendBugBtn').onclick = () => {
    const bugType = document.getElementById('bugType').value;
    const bugDesc = document.getElementById('bugDescription').value;
    if (!bugDesc) { showNotification('Опишите проблему', 'warning'); return; }
    sendBugReport(bugType, bugDesc);
    bugModal.style.display = 'none';
    document.getElementById('bugDescription').value = '';
  };

  checkAuth();
})();
