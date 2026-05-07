(function() {
  // ==================== ЗАЩИТА ОТ F12 ====================
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
    }
  });

  // ==================== КОНФИГ ====================
  var PROXY_URL = 'https://cp169104.tw1.ru/index.php';
  var DISCORD_CLIENT_ID = '1494686473520287774';
  var REDIRECT_URI = 'https://style42124.github.io/lscsd/';
  
  var currentUser = null;
  var currentUserRole = null;
  var chartInstance = null;
  
  var allApplications = [];

  // ==================== ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ====================
  
  async function loadApplicationsFromServer() {
    if (!currentUser) return [];
    
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_applications', data: { userId: currentUser.id } })
      });
      const res = await response.json();
      if (res.success) {
        allApplications = res.applications || [];
        localStorage.setItem('lscsd_applications', JSON.stringify(allApplications));
        return allApplications;
      }
      return [];
    } catch(e) {
      console.error('Ошибка загрузки заявок:', e);
      return [];
    }
  }

  async function loadUserRoleFromServer() {
    if (!currentUser) return null;
    
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_user_role', data: { userId: currentUser.id, username: currentUser.username } })
      });
      const res = await response.json();
      
      if (res.success && res.role) {
        currentUserRole = res.role;
        localStorage.setItem('lscsd_user_role', JSON.stringify(currentUserRole));
        
        var panelContainer = document.getElementById('panelBtnContainer');
        var panelBtn = document.getElementById('panelBtn');
        if (panelContainer && panelBtn && currentUserRole && (currentUserRole.level >= 2 || currentUserRole.level === 9)) {
          panelContainer.style.display = 'flex';
          panelBtn.onclick = function() { window.location.href = '/lscsd/panel.html'; };
        }
        return currentUserRole;
      }
      return null;
    } catch(e) {
      console.error('Ошибка загрузки роли:', e);
      return null;
    }
  }

  function addApplication(app) {
    app.id = Date.now();
    app.created_at = new Date().toLocaleString();
    app.status = 'pending';
    allApplications.unshift(app);
    localStorage.setItem('lscsd_applications', JSON.stringify(allApplications));
    renderFormsList();
    renderStats();
  }

  // ==================== ОТПРАВКА В DISCORD ====================
  function sendToDiscord(action, formData) {
    if (!currentUser) return;
    var dataToSend = { action: action, data: formData || {} };
    dataToSend.data.userId = currentUser.id;
    dataToSend.data.username = currentUser.username;
    fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    }).catch(function() {});
  }

  // ==================== СПИСКИ ====================
  var FORMS_LIST = [
    {id:'department', label:'📋 Заявка в отдел', desc:'Подача заявления на перевод'},
    {id:'appeal', label:'⚖️ Обжалование выговора', desc:'Обжалование дисциплинарного взыскания'},
    {id:'workoff', label:'🛠️ Отработка выговора', desc:'Отработка для снятия выговора'},
    {id:'promotion', label:'⭐ Заявка на повышение', desc:'Повышение в должности'},
    {id:'leave', label:'🏖️ Заявка на отпуск', desc:'Плановый отпуск'},
    {id:'rest', label:'🌴 Заявка на отдых', desc:'Краткосрочный отдых'},
    {id:'spec-request', label:'🔫 Заявка на спецвооружение', desc:'Заявка на выдачу'},
    {id:'spec-receive', label:'📦 Получение спецвооружение', desc:'Отчёт о получении'},
    {id:'resignation', label:'📄 Рапорт на увольнение', desc:'Заявление об увольнении'}
  ];

  var DEPARTMENTS = ['SAI', 'GU', 'AF', 'IAD', 'SEB', 'K-9', 'DID', 'MED', 'SPD', 'HS'];

  var typeNames = {
    'submit_department': '📋 Заявка в отдел',
    'submit_promotion': '⭐ Повышение',
    'submit_appeal': '⚖ Обжалование',
    'submit_workoff': '🛠 Отработка',
    'submit_leave': '🏖 Отпуск',
    'submit_rest': '🌴 Отдых',
    'submit_spec_request': '🔫 Спецвооружение запрос',
    'submit_spec_receive': '📦 Получение спец',
    'submit_resignation': '📄 Увольнение'
  };

  // ==================== УВЕДОМЛЕНИЯ ====================
  function showNotification(msg, type) {
    var div = document.createElement('div');
    div.className = 'notification';
    div.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-triangle') + '"></i> ' + msg;
    document.body.appendChild(div);
    setTimeout(function() { div.remove(); }, 3000);
  }

  // ==================== РЕНДЕР КАРТОЧЕК ====================
  function renderCards() {
    var container = document.getElementById('cardsGrid');
    if (!container) return;
    container.innerHTML = '';
    FORMS_LIST.forEach(function(form) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="card-icon">' + form.label.split(' ')[0] + '</div><h3>' + form.label + '</h3><p>' + form.desc + '</p>';
      card.onclick = function() { openForm(form.id); };
      container.appendChild(card);
    });
  }

  // ==================== РЕНДЕР ИСТОРИИ ====================
  async function renderFormsList() {
    var container = document.getElementById('historyList');
    if (!container) return;
    
    await loadApplicationsFromServer();
    
    var searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    var filtered = allApplications.filter(function(app) {
      var typeName = typeNames[app.type] || app.type;
      return typeName.toLowerCase().indexOf(searchTerm) !== -1;
    });
    
    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#6b6f78;">Нет заявок</div>';
      return;
    }
    
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var app = filtered[i];
      var typeName = typeNames[app.type] || app.type;
      var statusText = app.status === 'pending' ? '⏳ На рассмотрении' : (app.status === 'approved' ? '✅ Одобрена' : '❌ Отклонена');
      var details = '';
      if (app.data && app.data.department) details += 'Отдел: ' + app.data.department;
      if (app.data && app.data.nickname) details += (details ? ' | ' : '') + 'От: ' + app.data.nickname;
      
      html += '<div class="history-item">' +
                '<div class="time" style="color:#9ca3af; font-size:11px;">' + (app.created_at || '-') + ' ' + statusText + '</div>' +
                '<div class="type" style="color:#d4af37; font-weight:600;">' + typeName + '</div>' +
                '<div class="details" style="color:#e8e8e8; font-size:12px; margin-top:4px;">' + details + '</div>' +
              '</div>';
    }
    container.innerHTML = html;
  }

  // ==================== РЕНДЕР СТАТИСТИКИ ====================
  async function renderStats() {
    await loadApplicationsFromServer();
    
    var stats = { total: allApplications.length, byType: {} };
    for (var i = 0; i < allApplications.length; i++) {
      var app = allApplications[i];
      var displayType = typeNames[app.type] || app.type;
      stats.byType[displayType] = (stats.byType[displayType] || 0) + 1;
    }
    
    var container = document.getElementById('statsGrid');
    if (container) {
      var html = '<div class="stat-card"><div class="stat-number">' + stats.total + '</div><div class="stat-label">Всего заявок</div></div>';
      for (var type in stats.byType) {
        html += '<div class="stat-card"><div class="stat-number">' + stats.byType[type] + '</div><div class="stat-label">' + type + '</div></div>';
      }
      container.innerHTML = html;
    }
    
    var canvas = document.getElementById('statsChart');
    if (canvas && typeof Chart !== 'undefined') {
      var ctx = canvas.getContext('2d');
      if (ctx) {
        if (chartInstance) {
          try { chartInstance.destroy(); } catch(e) {}
          chartInstance = null;
        }
        if (Object.keys(stats.byType).length > 0) {
          chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: Object.keys(stats.byType),
              datasets: [{
                data: Object.values(stats.byType),
                backgroundColor: ['#d4af37', '#5865F2', '#6bcf7f', '#ff6b6b', '#ffa500', '#4a90d9', '#9b59b6']
              }]
            },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#e8e8e8' } } } }
          });
        }
      }
    }
  }

  // ==================== АВТОРИЗАЦИЯ ====================
  function handleAuthCallback() {
    var hash = window.location.hash.substring(1);
    if (hash && hash.indexOf('access_token') !== -1) {
      var params = new URLSearchParams(hash);
      var token = params.get('access_token');
      if (token) {
        fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer '+token } })
          .then(function(r) { return r.json(); })
          .then(function(user) {
            localStorage.setItem('lscsd_user', JSON.stringify({ 
              id: user.id, 
              username: user.username, 
              avatar: user.avatar ? 'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.png' : '',
              token: token
            }));
            window.location.hash = '';
            location.reload();
          })
          .catch(function() { showNotification('Ошибка авторизации', 'error'); });
      }
    }
  }

  async function checkAuth() {
    var user = localStorage.getItem('lscsd_user');
    if (user) {
      currentUser = JSON.parse(user);
      
      var authContainer = document.getElementById('authContainer');
      var mainContainer = document.getElementById('mainContainer');
      var navUserEl = document.getElementById('navUser');
      var navNameEl = document.getElementById('navName');
      var navAvatarEl = document.getElementById('navAvatar');
      
      if (authContainer) authContainer.style.display = 'none';
      if (mainContainer) mainContainer.style.display = 'block';
      if (navUserEl) navUserEl.style.display = 'flex';
      if (navNameEl) navNameEl.innerText = currentUser.username;
      if (navAvatarEl && currentUser.avatar) navAvatarEl.src = currentUser.avatar;
      
      await loadUserRoleFromServer();
      await loadApplicationsFromServer();
      renderCards();
      renderFormsList();
      renderStats();
    } else {
      var authContainer = document.getElementById('authContainer');
      var mainContainer = document.getElementById('mainContainer');
      var navUserEl = document.getElementById('navUser');
      
      if (authContainer) authContainer.style.display = 'flex';
      if (mainContainer) mainContainer.style.display = 'none';
      if (navUserEl) navUserEl.style.display = 'none';
      
      handleAuthCallback();
    }
  }

  var authBtn = document.getElementById('authBtn');
  if (authBtn) {
    authBtn.onclick = function() { 
      window.location.href = 'https://discord.com/api/oauth2/authorize?client_id='+DISCORD_CLIENT_ID+'&redirect_uri='+encodeURIComponent(REDIRECT_URI)+'&response_type=token&scope=identify'; 
    };
  }
  
  var logoutBtn = document.getElementById('settingsLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = function() { 
      localStorage.removeItem('lscsd_user');
      localStorage.removeItem('lscsd_applications');
      location.reload(); 
    };
  }

  // ==================== НАСТРОЙКИ ====================
  var settingsPanel = document.getElementById('settingsPanel');
  var navUserEl = document.getElementById('navUser');
  if (navUserEl) {
    navUserEl.onclick = function(e) { 
      e.stopPropagation(); 
      if (settingsPanel) settingsPanel.classList.toggle('open'); 
    };
  }
  var closeSettings = document.getElementById('closeSettings');
  if (closeSettings) {
    closeSettings.onclick = function() { 
      if (settingsPanel) settingsPanel.classList.remove('open'); 
    };
  }
  document.onclick = function(e) { 
    if (settingsPanel && navUserEl && !settingsPanel.contains(e.target) && !navUserEl.contains(e.target)) 
      settingsPanel.classList.remove('open'); 
  };

  var currentTheme = localStorage.getItem('lscsd_theme') || 'dark';
  if (currentTheme === 'light') document.body.classList.add('light');
  var themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.classList.toggle('active', currentTheme === 'light');
    themeSwitch.onclick = function() {
      if (document.body.classList.contains('light')) { 
        document.body.classList.remove('light'); 
        localStorage.setItem('lscsd_theme','dark'); 
        this.classList.remove('active'); 
      } else { 
        document.body.classList.add('light'); 
        localStorage.setItem('lscsd_theme','light'); 
        this.classList.add('active'); 
      }
    };
  }

  var autoFillEnabled = localStorage.getItem('lscsd_autofill') === 'true';
  var autoFillSwitch = document.getElementById('autoFillSwitch');
  if (autoFillSwitch) {
    autoFillSwitch.classList.toggle('active', autoFillEnabled);
    autoFillSwitch.onclick = function() {
      autoFillEnabled = !autoFillEnabled;
      localStorage.setItem('lscsd_autofill', autoFillEnabled);
      this.classList.toggle('active', autoFillEnabled);
      showNotification(autoFillEnabled ? 'Автозаполнение включено' : 'Автозаполнение выключено', 'info');
    };
  }

  // ==================== ФУНКЦИИ ДЛЯ ФАЙЛОВ ====================
  function createFilePreview(container, files, inputId) {
    var previewDiv = container.querySelector('#filePreview');
    if (!previewDiv) { 
      previewDiv = document.createElement('div'); 
      previewDiv.id = 'filePreview'; 
      previewDiv.className = 'file-preview'; 
      container.appendChild(previewDiv); 
    }
    previewDiv.innerHTML = '';
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var item = document.createElement('div');
      item.className = 'file-preview-item';
      if (file.type.startsWith('image/')) {
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        item.appendChild(img);
      } else {
        var icon = document.createElement('i');
        icon.className = 'fas fa-file-alt';
        item.appendChild(icon);
      }
      var removeBtn = document.createElement('div');
      removeBtn.className = 'remove-file';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = (function(idx) { return function() {
        files.splice(idx, 1);
        createFilePreview(container, files);
        var fileInput = document.getElementById(inputId);
        if (fileInput) fileInput.value = '';
      }; })(i);
      item.appendChild(removeBtn);
      previewDiv.appendChild(item);
    }
  }

  function showError(container, msg) { 
    var err = container.querySelector('#formError'); 
    if(err) { 
      err.textContent = msg; 
      err.style.display='block'; 
      setTimeout(function(){ err.style.display='none'; },4000); 
    } else showNotification(msg,'error'); 
  }

  // ==================== ОТКРЫТИЕ ФОРМ ====================
  function openForm(type) {
    var modal = document.getElementById('modal');
    var modalBody = document.getElementById('modalBody');
    var modalTitle = document.getElementById('modalTitle');
    var form = FORMS_LIST.find(function(x){ return x.id===type; });
    if (!modal || !modalBody || !modalTitle) return;
    
    modalTitle.innerText = form ? form.label : 'Форма заявки';
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

  var modalClose = document.getElementById('modalClose');
  if (modalClose) {
    modalClose.onclick = function() { 
      var modal = document.getElementById('modal');
      if (modal) modal.style.display = 'none'; 
    };
  }
  window.onclick = function(e) { 
    var modal = document.getElementById('modal');
    if (e.target === modal && modal) modal.style.display = 'none'; 
  };

  // ==================== ФОРМА ЗАЯВКА В ОТДЕЛ ====================
  function renderDepartmentForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_department') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Статик *</label><input id="staticc" value="' + (saved.staticc || '') + '"></div><div class="form-group"><label>Ранг *</label><input id="rank" value="' + (saved.rank || '') + '"></div><div class="form-group"><label>Текущий отдел *</label><input id="currentDept" value="' + (saved.currentDept || '') + '"></div><div class="form-group"><label>Отдел подачи *</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="form-group"><label>Причина *</label><textarea id="reason" rows="3">' + (saved.reason || '') + '</textarea></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var btnsDiv = container.querySelector('#deptBtns');
    if (btnsDiv) {
      DEPARTMENTS.forEach(function(d) {
        var btn = document.createElement('div');
        btn.className = 'role-btn';
        btn.textContent = d;
        if (saved.department === d) btn.classList.add('selected');
        btn.onclick = function() {
          btnsDiv.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
          btn.classList.add('selected');
          var deptInput = document.getElementById('department');
          if (deptInput) deptInput.value = d;
        };
        btnsDiv.appendChild(btn);
      });
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticc: document.getElementById('staticc')?.value || '',
          rank: document.getElementById('rank')?.value || '',
          currentDept: document.getElementById('currentDept')?.value || '',
          department: document.getElementById('department')?.value || '',
          reason: document.getElementById('reason')?.value || ''
        };
        if(!data.department){ showError(container,'Выберите отдел'); return; }
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_department', JSON.stringify(data));
        addApplication({ type: 'submit_department', data: data });
        sendToDiscord('submit_department', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА ОБЖАЛОВАНИЕ ====================
  function renderAppealForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_appeal') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Статик *</label><input id="staticc" value="' + (saved.staticc || '') + '"></div><div class="form-group"><label>Вид наказания *</label><input id="reprimandType" value="' + (saved.reprimandType || '') + '"></div><div class="form-group"><label>Кем выдано *</label><input id="issuedBy" value="' + (saved.issuedBy || '') + '"></div><div class="form-group"><label>Когда выдано *</label><input type="date" id="issuedDate" value="' + (saved.issuedDate || '') + '"></div><div class="form-group"><label>Причина из выговора *</label><textarea id="reasonGiven" rows="2">' + (saved.reasonGiven || '') + '</textarea></div><div class="form-group"><label>Описание ситуации *</label><textarea id="description" rows="3">' + (saved.description || '') + '</textarea></div><div class="form-group"><label>Вложения</label><input type="file" id="attachments" multiple></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    if (fileInput) {
      fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticc: document.getElementById('staticc')?.value || '',
          reprimandType: document.getElementById('reprimandType')?.value || '',
          issuedBy: document.getElementById('issuedBy')?.value || '',
          issuedDate: document.getElementById('issuedDate')?.value || '',
          reasonGiven: document.getElementById('reasonGiven')?.value || '',
          description: document.getElementById('description')?.value || '',
          attachments: attachments
        };
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_appeal', JSON.stringify(data));
        addApplication({ type: 'submit_appeal', data: data });
        sendToDiscord('submit_appeal', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА ОТРАБОТКА ====================
  function renderWorkoffForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_workoff') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Статик *</label><input id="staticc" value="' + (saved.staticc || '') + '"></div><div class="form-group"><label>Ранг *</label><select id="rank"><option>1-4</option><option>5-8</option><option>9-11</option><option>13</option></select></div><div class="form-group"><label>За что выговор *</label><textarea id="reason" rows="2">' + (saved.reason || '') + '</textarea></div><div class="form-group"><label>Тип наказания *</label><select id="punishmentType"><option>Устный выговор</option><option>Строгий выговор</option></select></div><div class="form-group"><label>Док-ва</label><input type="file" id="attachments" multiple></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    if (saved.rank) { var rankSel = document.getElementById('rank'); if (rankSel) rankSel.value = saved.rank; }
    if (saved.punishmentType) { var ptSel = document.getElementById('punishmentType'); if (ptSel) ptSel.value = saved.punishmentType; }
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    if (fileInput) {
      fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticc: document.getElementById('staticc')?.value || '',
          rank: document.getElementById('rank')?.value || '',
          reason: document.getElementById('reason')?.value || '',
          punishmentType: document.getElementById('punishmentType')?.value || '',
          attachments: attachments
        };
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_workoff', JSON.stringify(data));
        addApplication({ type: 'submit_workoff', data: data });
        sendToDiscord('submit_workoff', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА ПОВЫШЕНИЕ ====================
  function renderPromotionForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_promotion') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Статик *</label><input id="staticc" value="' + (saved.staticc || '') + '"></div><div class="form-group"><label>Текущий ранг *</label><input id="currentRank" value="' + (saved.currentRank || '') + '"></div><div class="form-group"><label>Целевой ранг *</label><input id="targetRank" value="' + (saved.targetRank || '') + '"></div><div class="form-group"><label>Баллы *</label><input type="number" id="points" value="' + (saved.points || '') + '"></div><div class="form-group"><label>Док-ва баллов *</label><textarea id="proof" rows="2">' + (saved.proof || '') + '</textarea></div><div class="form-group"><label>Отдел подачи *</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var btnsDiv = container.querySelector('#deptBtns');
    if (btnsDiv) {
      DEPARTMENTS.forEach(function(d) {
        var btn = document.createElement('div');
        btn.className = 'role-btn';
        btn.textContent = d;
        if (saved.department === d) btn.classList.add('selected');
        btn.onclick = function() {
          btnsDiv.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
          btn.classList.add('selected');
          var deptInput = document.getElementById('department');
          if (deptInput) deptInput.value = d;
        };
        btnsDiv.appendChild(btn);
      });
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticc: document.getElementById('staticc')?.value || '',
          currentRank: document.getElementById('currentRank')?.value || '',
          targetRank: document.getElementById('targetRank')?.value || '',
          points: document.getElementById('points')?.value || '',
          proof: document.getElementById('proof')?.value || '',
          department: document.getElementById('department')?.value || ''
        };
        if(!data.department){ showError(container,'Выберите отдел'); return; }
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_promotion', JSON.stringify(data));
        addApplication({ type: 'submit_promotion', data: data });
        sendToDiscord('submit_promotion', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА ОТПУСК/ОТДЫХ ====================
  function renderLeaveForm(container, type) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_' + type) || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Отдел *</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="form-group"><label>Причина *</label><textarea id="reason" rows="2">' + (saved.reason || '') + '</textarea></div><div class="form-group"><label>С даты *</label><input type="datetime-local" id="fromDate" value="' + (saved.fromDate || '') + '"></div><div class="form-group"><label>По дату *</label><input type="datetime-local" id="toDate" value="' + (saved.toDate || '') + '"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var btnsDiv = container.querySelector('#deptBtns');
    if (btnsDiv) {
      DEPARTMENTS.forEach(function(d) {
        var btn = document.createElement('div');
        btn.className = 'role-btn';
        btn.textContent = d;
        if (saved.department === d) btn.classList.add('selected');
        btn.onclick = function() {
          btnsDiv.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
          btn.classList.add('selected');
          var deptInput = document.getElementById('department');
          if (deptInput) deptInput.value = d;
        };
        btnsDiv.appendChild(btn);
      });
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          department: document.getElementById('department')?.value || '',
          reason: document.getElementById('reason')?.value || '',
          fromDate: document.getElementById('fromDate')?.value || '',
          toDate: document.getElementById('toDate')?.value || ''
        };
        if(!data.department){ showError(container,'Выберите отдел'); return; }
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_' + type, JSON.stringify(data));
        var action = type === 'отпуск' ? 'submit_leave' : 'submit_rest';
        addApplication({ type: action, data: data });
        sendToDiscord(action, data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА ЗАПРОС СПЕЦВООРУЖЕНИЯ ====================
  function renderSpecRequestForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_spec_request') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Статик *</label><input id="staticc" value="' + (saved.staticc || '') + '"></div><div class="form-group"><label>Ранг *</label><input id="rank" value="' + (saved.rank || '') + '"></div><div class="form-group"><label>Отдел *</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="form-group"><label>Оружие *</label><input id="weapon" value="' + (saved.weapon || '') + '"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var btnsDiv = container.querySelector('#deptBtns');
    if (btnsDiv) {
      DEPARTMENTS.forEach(function(d) {
        var btn = document.createElement('div');
        btn.className = 'role-btn';
        btn.textContent = d;
        if (saved.department === d) btn.classList.add('selected');
        btn.onclick = function() {
          btnsDiv.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
          btn.classList.add('selected');
          var deptInput = document.getElementById('department');
          if (deptInput) deptInput.value = d;
        };
        btnsDiv.appendChild(btn);
      });
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticc: document.getElementById('staticc')?.value || '',
          rank: document.getElementById('rank')?.value || '',
          department: document.getElementById('department')?.value || '',
          weapon: document.getElementById('weapon')?.value || ''
        };
        if(!data.department){ showError(container,'Выберите отдел'); return; }
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_spec_request', JSON.stringify(data));
        addApplication({ type: 'submit_spec_request', data: data });
        sendToDiscord('submit_spec_request', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА ПОЛУЧЕНИЕ СПЕЦВООРУЖЕНИЯ ====================
  function renderSpecReceiveForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_spec_receive') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Статик *</label><input id="staticc" value="' + (saved.staticc || '') + '"></div><div class="form-group"><label>Ранг *</label><input id="rank" value="' + (saved.rank || '') + '"></div><div class="form-group"><label>Отдел *</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="form-group"><label>Оружие *</label><input id="weapon" value="' + (saved.weapon || '') + '"></div><div class="form-group"><label>Номер спецухи *</label><input id="weaponNumber" value="' + (saved.weaponNumber || '') + '"></div><div class="form-group"><label>Кто выдал *</label><input id="issuedBy" value="' + (saved.issuedBy || '') + '"></div><div class="form-group"><label>Скрин из инвентаря *</label><input type="file" id="attachments" multiple></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var btnsDiv = container.querySelector('#deptBtns');
    if (btnsDiv) {
      DEPARTMENTS.forEach(function(d) {
        var btn = document.createElement('div');
        btn.className = 'role-btn';
        btn.textContent = d;
        if (saved.department === d) btn.classList.add('selected');
        btn.onclick = function() {
          btnsDiv.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
          btn.classList.add('selected');
          var deptInput = document.getElementById('department');
          if (deptInput) deptInput.value = d;
        };
        btnsDiv.appendChild(btn);
      });
    }
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    if (fileInput) {
      fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticc: document.getElementById('staticc')?.value || '',
          rank: document.getElementById('rank')?.value || '',
          department: document.getElementById('department')?.value || '',
          weapon: document.getElementById('weapon')?.value || '',
          weaponNumber: document.getElementById('weaponNumber')?.value || '',
          issuedBy: document.getElementById('issuedBy')?.value || '',
          attachments: attachments
        };
        if(!data.department){ showError(container,'Выберите отдел'); return; }
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_spec_receive', JSON.stringify(data));
        addApplication({ type: 'submit_spec_receive', data: data });
        sendToDiscord('submit_spec_receive', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ФОРМА УВОЛЬНЕНИЕ ====================
  function renderResignationForm(container) {
    if (!container) return;
    var saved = autoFillEnabled ? JSON.parse(localStorage.getItem('lscsd_saved_resignation') || '{}') : {};
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Никнейм *</label><input id="nickname" value="' + (saved.nickname || '') + '"></div><div class="form-group"><label>Static ID *</label><input id="staticId" value="' + (saved.staticId || '') + '"></div><div class="form-group"><label>Отдел *</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="form-group"><label>Планшет *</label><input id="tablet" value="' + (saved.tablet || '') + '"></div><div class="form-group"><label>Инвентарь *</label><input id="inventory" value="' + (saved.inventory || '') + '"></div><div class="form-group"><label>Вложения</label><input type="file" id="attachments" multiple></div><div class="form-group"><label>Причина *</label><textarea id="reason" rows="3">' + (saved.reason || '') + '</textarea></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit">Отправить</button></form>';
    var btnsDiv = container.querySelector('#deptBtns');
    if (btnsDiv) {
      DEPARTMENTS.forEach(function(d) {
        var btn = document.createElement('div');
        btn.className = 'role-btn';
        btn.textContent = d;
        if (saved.department === d) btn.classList.add('selected');
        btn.onclick = function() {
          btnsDiv.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
          btn.classList.add('selected');
          var deptInput = document.getElementById('department');
          if (deptInput) deptInput.value = d;
        };
        btnsDiv.appendChild(btn);
      });
    }
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    if (fileInput) {
      fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    }
    var form = container.querySelector('#formEl');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        var data = { 
          nickname: document.getElementById('nickname')?.value || '',
          staticId: document.getElementById('staticId')?.value || '',
          department: document.getElementById('department')?.value || '',
          tablet: document.getElementById('tablet')?.value || '',
          inventory: document.getElementById('inventory')?.value || '',
          reason: document.getElementById('reason')?.value || '',
          attachments: attachments
        };
        if(!data.department){ showError(container,'Выберите отдел'); return; }
        if(autoFillEnabled) localStorage.setItem('lscsd_saved_resignation', JSON.stringify(data));
        addApplication({ type: 'submit_resignation', data: data });
        sendToDiscord('submit_resignation', data);
        var modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
      };
    }
  }

  // ==================== ТАБЫ ====================
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(btn) {
    btn.onclick = function() {
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(function(tab) { tab.classList.remove('active'); });
      var tabId = this.dataset.tab + '-tab';
      var tabEl = document.getElementById(tabId);
      if (tabEl) tabEl.classList.add('active');
      if (this.dataset.tab === 'stats') renderStats();
      if (this.dataset.tab === 'history') renderFormsList();
    };
  });

  var historySearch = document.getElementById('historySearch');
  if (historySearch) {
    historySearch.addEventListener('input', function() { renderFormsList(); });
  }

  // ==================== БАГ-РЕПОРТ ====================
  var bugModal = document.getElementById('bugModal');
  var reportBugBtn = document.getElementById('reportBugBtn');
  if (reportBugBtn) {
    reportBugBtn.onclick = function() { if(currentUser && bugModal) bugModal.style.display = 'flex'; else showNotification('Авторизуйтесь', 'warning'); };
  }
  var closeBugBtn = document.getElementById('closeBugBtn');
  if (closeBugBtn) {
    closeBugBtn.onclick = function() { if(bugModal) bugModal.style.display = 'none'; };
  }
  var sendBugBtn = document.getElementById('sendBugBtn');
  if (sendBugBtn) {
    sendBugBtn.onclick = function() {
      var bugType = document.getElementById('bugType')?.value || 'Другое';
      var bugDesc = document.getElementById('bugDescription')?.value || '';
      if(!bugDesc) { showNotification('Опишите проблему', 'warning'); return; }
      if(currentUser) {
        fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'report_bug', data: { userId: currentUser.id, username: currentUser.username, bugType: bugType, bugDescription: bugDesc } })
        }).catch(function() {});
      }
      if(bugModal) bugModal.style.display = 'none';
      var bugDescEl = document.getElementById('bugDescription');
      if (bugDescEl) bugDescEl.value = '';
      showNotification('Баг отправлен!', 'success');
    };
  }

  // ==================== ПРЕЛОАДЕР ====================
  var progress = 0;
  var progressBar = document.getElementById('preloaderProgress');
  var interval = setInterval(function() {
    progress += Math.floor(Math.random() * 8) + 4;
    if (progress > 100) progress = 100;
    if (progressBar) progressBar.style.width = progress + '%';
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(function() {
        var preloader = document.getElementById('preloader');
        var app = document.getElementById('app');
        if (preloader) {
          preloader.style.opacity = '0';
          setTimeout(function() {
            preloader.style.display = 'none';
            if (app) app.style.display = 'flex';
          }, 500);
        }
      }, 1000);
    }
  }, 80);
  
  setTimeout(function() {
    var preloader = document.getElementById('preloader');
    if (preloader && preloader.style.display !== 'none') {
      preloader.style.display = 'none';
      var app = document.getElementById('app');
      if (app) app.style.display = 'flex';
    }
  }, 5000);

  // ==================== ЗАПУСК ====================
  checkAuth();
})();
