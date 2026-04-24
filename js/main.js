(function() {
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
    }
  });

  var PROXY_URL = 'https://cs324022.tw1.ru/index.php';
  var DISCORD_CLIENT_ID = '1494686473520287774';
  var REDIRECT_URI = 'https://style42124.github.io/lscsd/';
  var currentUser = null;
  var currentUserRole = null;
  var isSending = false;
  var currentTheme = localStorage.getItem('lscsd_theme') || 'dark';
  var autoFillEnabled = localStorage.getItem('lscsd_autofill') === 'true';

  if (currentTheme === 'light') document.body.classList.add('light');
  var themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) themeSwitch.classList.toggle('active', currentTheme === 'light');
  var autoFillSwitch = document.getElementById('autoFillSwitch');
  if (autoFillSwitch) autoFillSwitch.classList.toggle('active', autoFillEnabled);

  var blacklist = JSON.parse(localStorage.getItem('lscsd_blacklist') || '[]');
  var tempBlocked = JSON.parse(localStorage.getItem('lscsd_tempBlocked') || '{}');
  var userRequests = JSON.parse(localStorage.getItem('lscsd_requests') || '{}');
  var userHistory = JSON.parse(localStorage.getItem('lscsd_user_history') || '[]');

  var DEPARTMENTS = ['SAI', 'GU', 'AF', 'IAD', 'SEB', 'K-9', 'DID', 'MED', 'SPD', 'HS'];
  
  var FORMS_LIST = [
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

  function showNotification(message, type, title) {
    var icons = {success:'✅', error:'❌', warning:'⚠️', info:'ℹ️'};
    var div = document.createElement('div');
    div.className = 'notification ' + (type || 'info');
    div.innerHTML = '<div class="notification-title">' + (icons[type] || '🔔') + ' ' + (title || (type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : 'Внимание')) + '</div><div class="notification-message">' + message + '</div>';
    document.body.appendChild(div);
    setTimeout(function() { if(div) div.remove(); }, 3000);
  }

  function isTempBlocked(userId) { var b = tempBlocked[userId]; return b && b > Date.now(); }
  
  function checkRateLimit(userId) {
    var now = Date.now();
    var reqs = userRequests[userId] || [];
    reqs = reqs.filter(function(t) { return now - t < 5*60*1000; });
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
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        currentUserRole = res.role;
        var usersRoles = JSON.parse(localStorage.getItem('lscsd_users_roles') || '{}');
        usersRoles[currentUser.id] = currentUserRole;
        localStorage.setItem('lscsd_users_roles', JSON.stringify(usersRoles));
        return currentUserRole;
      }
      return null;
    });
  }

  function saveAutoFillData(data, formType) {
    if (autoFillEnabled && currentUser) {
      var saved = JSON.parse(localStorage.getItem('lscsd_saved_data_' + currentUser.id) || '{}');
      saved[formType] = data;
      localStorage.setItem('lscsd_saved_data_' + currentUser.id, JSON.stringify(saved));
    }
  }

  function loadAutoFillData(formType) {
    if (autoFillEnabled && currentUser) {
      var saved = JSON.parse(localStorage.getItem('lscsd_saved_data_' + currentUser.id) || '{}');
      return saved[formType] || {};
    }
    return {};
  }

  function addToHistory(type, data) {
    userHistory.unshift({type: type, data: data, time: new Date().toLocaleString(), userId: currentUser?.id});
    userHistory = userHistory.slice(0, 100);
    localStorage.setItem('lscsd_user_history', JSON.stringify(userHistory));
    renderHistory();
    renderStats();
  }

  function callAPI(action, formData, hasFile) {
    return new Promise(function(resolve, reject) {
      if (isSending) { showNotification('Подождите, заявка уже отправляется...', 'warning'); reject(); return; }
      if (currentUser && isTempBlocked(currentUser.id)) { showNotification('Вы заблокированы на 15 минут!', 'error'); reject(); return; }
      if (currentUser && !checkRateLimit(currentUser.id)) {
        tempBlocked[currentUser.id] = Date.now() + 15*60*1000;
        localStorage.setItem('lscsd_tempBlocked', JSON.stringify(tempBlocked));
        showNotification('Лимит заявок! Блокировка 15 мин.', 'error');
        reject(); return;
      }
      isSending = true;
      var dataToSend = { action: action, data: formData || {} };
      if (currentUser) { 
        dataToSend.data.userId = currentUser.id; 
        dataToSend.data.username = currentUser.username; 
        dataToSend.data.userRole = currentUserRole ? currentUserRole.level : 1;
      }
      var options = { method:'POST', headers:{}, body:null };
      if (hasFile) {
        var fd = new FormData();
        fd.append('action', action);
        fd.append('data', JSON.stringify(dataToSend.data));
        if (formData && formData.attachments) {
          for (var i = 0; i < formData.attachments.length; i++) {
            fd.append('attachments[]', formData.attachments[i]);
          }
        }
        options.body = fd;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(dataToSend);
      }
      fetch(PROXY_URL, options).then(function(r) { return r.json(); }).then(function(d){ 
        isSending = false;
        if(d.success) {
          showNotification('Заявка отправлена!', 'success');
          addToHistory(action, formData);
        }
        resolve(d); 
      }).catch(function(){ 
        isSending = false;
        showNotification('Ошибка соединения с сервером', 'error');
        reject(); 
      });
    });
  }

  function sendBugReport(bugType, bugDesc) {
    if (!currentUser) return;
    fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'report_bug',
        data: { userId: currentUser.id, username: currentUser.username, bugType: bugType, bugDescription: bugDesc }
      })
    }).then(function(r) { return r.json(); }).then(function(res){
      if(res.success) showNotification('Баг отправлен разработчику!', 'success');
      else showNotification('Ошибка отправки', 'error');
    }).catch(function(){ showNotification('Ошибка', 'error'); });
  }

  function checkAdminPassword(password) {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_auth', data: { password: password } })
    }).then(function(r) { return r.json(); }).then(function(res) { return res.success === true; });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'F7') {
      e.preventDefault();
      var pwd = prompt('Введите пароль администратора:');
      if (pwd) {
        checkAdminPassword(pwd).then(function(isValid) {
          if (isValid) {
            document.getElementById('adminPanel').style.display = 'flex';
            document.getElementById('blacklistInput').value = blacklist.join('\n');
            var blockedNow = Object.keys(tempBlocked).filter(function(id) { return tempBlocked[id] > Date.now(); });
            document.getElementById('tempBlockInput').value = blockedNow.join('\n');
          } else { showNotification('Неверный пароль!', 'error'); }
        });
      }
    }
  });

  function renderHistory() {
    var container = document.getElementById('historyList');
    if (!container) return;
    var searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    var filtered = userHistory.filter(function(h) { return h.type.toLowerCase().indexOf(searchTerm) !== -1 || JSON.stringify(h.data).toLowerCase().indexOf(searchTerm) !== -1; });
    container.innerHTML = '';
    filtered.forEach(function(h) {
      var div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = '<div class="time">' + h.time + '</div><div class="type">' + h.type + '</div><div class="details">' + JSON.stringify(h.data).substring(0, 100) + '</div>';
      container.appendChild(div);
    });
    if (filtered.length === 0) container.innerHTML = '<div style="text-align:center;padding:20px;color:#6b6f78;">Нет заявок</div>';
  }

  function renderStats() {
    var stats = {total: userHistory.length, byType: {}};
    userHistory.forEach(function(h) {
      stats.byType[h.type] = (stats.byType[h.type] || 0) + 1;
    });
    var container = document.getElementById('statsGrid');
    if (container) {
      container.innerHTML = '<div class="stat-card"><div class="stat-number">' + stats.total + '</div><div class="stat-label">Всего заявок</div></div>';
      for (var type in stats.byType) {
        container.innerHTML += '<div class="stat-card"><div class="stat-number">' + stats.byType[type] + '</div><div class="stat-label">' + type + '</div></div>';
      }
    }
    var ctx = document.getElementById('statsChart')?.getContext('2d');
    if (ctx && window.statsChart) window.statsChart.destroy();
    if (ctx) {
      window.statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(stats.byType), datasets: [{ data: Object.values(stats.byType), backgroundColor: ['#d4af37', '#5865F2', '#6bcf7f', '#ff6b6b', '#ffa500', '#4a90d9', '#9b59b6'] }] },
        options: { responsive: true, plugins: { legend: { labels: { color: '#e8e8e8' } } } }
      });
    }
  }

  function handleAuthCallback() {
    var hash = window.location.hash.substring(1);
    if (hash && hash.indexOf('access_token') !== -1) {
      var params = new URLSearchParams(hash);
      var token = params.get('access_token');
      if (token) {
        fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer '+token } })
          .then(function(r) { return r.json(); }).then(function(user) {
            var usersRoles = JSON.parse(localStorage.getItem('lscsd_users_roles') || '{}');
            if (!usersRoles[user.id]) {
              usersRoles[user.id] = { level: 1, name: 'Младший состав', department: null };
              localStorage.setItem('lscsd_users_roles', JSON.stringify(usersRoles));
            }
            localStorage.setItem('lscsd_user', JSON.stringify({ id:user.id, username:user.username, avatar:user.avatar ? 'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.png' : '' }));
            window.location.hash = '';
            location.reload();
          }).catch(function(){ showNotification('Ошибка авторизации', 'error'); });
      }
    }
  }

  function checkAuth() {
    var user = localStorage.getItem('lscsd_user');
    if (user) {
      currentUser = JSON.parse(user);
      if (blacklist.includes(currentUser.id)) { showNotification('Вы в чёрном списке!', 'error'); localStorage.removeItem('lscsd_user'); location.reload(); return; }
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
      document.getElementById('navUser').style.display = 'flex';
      document.getElementById('navName').innerText = currentUser.username;
      if (currentUser.avatar) document.getElementById('navAvatar').src = currentUser.avatar;
      loadUserRoleFromServer().then(function(role) {
        renderCards();
        renderHistory();
        renderStats();
        var panelBtn = document.getElementById('panelBtn');
        if (panelBtn && role && role.level >= 2) {
          panelBtn.style.display = 'block';
          panelBtn.onclick = function() { window.location.href = '/lscsd/panel.html'; };
        }
      });
    } else { 
      document.getElementById('authContainer').style.display = 'flex'; 
      document.getElementById('mainContainer').style.display = 'none'; 
      document.getElementById('navUser').style.display = 'none'; 
      handleAuthCallback(); 
    }
  }

  document.getElementById('authBtn').onclick = function() { window.location.href = 'https://discord.com/api/oauth2/authorize?client_id='+DISCORD_CLIENT_ID+'&redirect_uri='+encodeURIComponent(REDIRECT_URI)+'&response_type=token&scope=identify'; };
  document.getElementById('settingsLogoutBtn').onclick = function() { localStorage.removeItem('lscsd_user'); location.reload(); };

  var settingsPanel = document.getElementById('settingsPanel');
  document.getElementById('navUser').onclick = function(e) { e.stopPropagation(); settingsPanel.classList.toggle('open'); };
  document.getElementById('closeSettings').onclick = function() { settingsPanel.classList.remove('open'); };
  document.onclick = function(e) { if (!settingsPanel.contains(e.target) && !document.getElementById('navUser').contains(e.target)) settingsPanel.classList.remove('open'); };

  if (document.getElementById('themeSwitch')) {
    document.getElementById('themeSwitch').onclick = function() {
      if (document.body.classList.contains('light')) { document.body.classList.remove('light'); localStorage.setItem('lscsd_theme','dark'); this.classList.remove('active'); }
      else { document.body.classList.add('light'); localStorage.setItem('lscsd_theme','light'); this.classList.add('active'); }
    };
  }

  if (document.getElementById('autoFillSwitch')) {
    document.getElementById('autoFillSwitch').onclick = function() {
      autoFillEnabled = !autoFillEnabled;
      localStorage.setItem('lscsd_autofill', autoFillEnabled);
      this.classList.toggle('active', autoFillEnabled);
      showNotification(autoFillEnabled ? 'Автозаполнение включено' : 'Автозаполнение выключено', 'info');
    };
  }

  document.getElementById('historySearch')?.addEventListener('input', function() { renderHistory(); });

  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(btn) {
    btn.onclick = function() {
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(function(tab) { tab.classList.remove('active'); });
      document.getElementById(this.dataset.tab + '-tab').classList.add('active');
      if (this.dataset.tab === 'stats') renderStats();
      if (this.dataset.tab === 'history') renderHistory();
    };
  });

  function renderCards() {
    var c = document.getElementById('cardsGrid');
    if(!c) return;
    c.innerHTML = '';
    FORMS_LIST.forEach(function(f) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="card-icon">'+f.icon+'</div><h3>'+f.label+'</h3><p>'+f.desc+'</p>';
      card.onclick = function() { openForm(f.id); };
      c.appendChild(card);
    });
  }

  function openForm(type) {
    var m = document.getElementById('modal');
    var b = document.getElementById('modalBody');
    var t = document.getElementById('modalTitle');
    var f = FORMS_LIST.find(function(x){ return x.id===type; });
    t.innerText = f ? f.label : 'Форма';
    b.innerHTML = '<div style="text-align:center;padding:30px;">Загрузка...</div>';
    m.style.display = 'flex';
    switch(type) {
      case 'department': renderDepartmentForm(b); break;
      case 'appeal': renderAppealForm(b); break;
      case 'workoff': renderWorkoffForm(b); break;
      case 'promotion': renderPromotionForm(b); break;
      case 'leave': renderLeaveForm(b,'отпуск'); break;
      case 'rest': renderLeaveForm(b,'отдых'); break;
      case 'spec-request': renderSpecRequestForm(b); break;
      case 'spec-receive': renderSpecReceiveForm(b); break;
      case 'resignation': renderResignationForm(b); break;
      default: b.innerHTML = '<p>Форма не найдена</p>';
    }
  }

  document.getElementById('modalClose').onclick = function() { document.getElementById('modal').style.display = 'none'; };
  window.onclick = function(e) { if(e.target===document.getElementById('modal')) document.getElementById('modal').style.display = 'none'; };
  
  function showError(container, msg) { var err = container.querySelector('#formError'); if(err) { err.textContent = msg; err.style.display='block'; setTimeout(function(){ err.style.display='none'; },4000); } else showNotification(msg,'error'); }

  function createFilePreview(container, files, inputId) {
    var previewDiv = container.querySelector('#filePreview');
    if (!previewDiv) { previewDiv = document.createElement('div'); previewDiv.id = 'filePreview'; previewDiv.className = 'file-preview'; container.appendChild(previewDiv); }
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

  function renderDepartmentForm(container) {
    var saved = loadAutoFillData('department');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="' + (saved.staticc || '') + '" required></div><div class="form-group"><label>Ранг</label><input id="rank" value="' + (saved.rank || '') + '" required></div><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department" value="' + (saved.department || '') + '"></div><div class="form-group"><label>Причина</label><textarea id="reason" rows="3" required>' + (saved.reason || '') + '</textarea></div><div class="form-group"><label>Вложения (несколько файлов)</label><input type="file" id="attachments" multiple accept="image/*,application/pdf"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var btns = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(function(d) { var btn = document.createElement('div'); btn.className = 'role-btn'; btn.textContent = d; if (saved.department === d) btn.classList.add('selected'); btn.onclick = function() { btns.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); }); btn.classList.add('selected'); document.getElementById('department').value = d; }; btns.appendChild(btn); });
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticc:document.getElementById('staticc').value, rank:document.getElementById('rank').value, department:document.getElementById('department').value, reason:document.getElementById('reason').value, attachments: attachments };
      if(!data.department){ showError(container,'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData({ firstName:data.firstName, lastName:data.lastName, staticc:data.staticc, rank:data.rank, department:data.department, reason:data.reason }, 'department');
      callAPI('submit_department', data, true).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderAppealForm(container) {
    var saved = loadAutoFillData('appeal');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="' + (saved.staticc || '') + '" required></div><div class="form-group"><label>Вид наказания</label><input id="reprimandType" value="' + (saved.reprimandType || '') + '" required></div><div class="form-group"><label>Кем выдано</label><input id="issuedBy" value="' + (saved.issuedBy || '') + '" required></div><div class="form-group"><label>Когда выдано</label><input type="date" id="issuedDate" value="' + (saved.issuedDate || '') + '" required></div><div class="form-group"><label>Причина из выговора</label><textarea id="reasonGiven" rows="2" required>' + (saved.reasonGiven || '') + '</textarea></div><div class="form-group"><label>Описание ситуации</label><textarea id="description" rows="3" required>' + (saved.description || '') + '</textarea></div><div class="form-group"><label>Вложения (скриншоты)</label><input type="file" id="attachments" multiple accept="image/*"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticc:document.getElementById('staticc').value, reprimandType:document.getElementById('reprimandType').value, issuedBy:document.getElementById('issuedBy').value, issuedDate:document.getElementById('issuedDate').value, reasonGiven:document.getElementById('reasonGiven').value, description:document.getElementById('description').value, attachments: attachments };
      saveAutoFillData(data, 'appeal');
      callAPI('submit_appeal', data, true).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderWorkoffForm(container) {
    var saved = loadAutoFillData('workoff');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="' + (saved.staticc || '') + '" required></div><div class="form-group"><label>Ранг</label><select id="rank"><option>1-4</option><option>5-8</option><option>9-11</option><option>13</option></select></div><div class="form-group"><label>За что выговор</label><textarea id="reason" rows="2" required>' + (saved.reason || '') + '</textarea></div><div class="form-group"><label>Тип наказания</label><select id="punishmentType"><option>Устный выговор</option><option>Строгий выговор</option></select></div><div class="form-group"><label>Док-ва</label><textarea id="evidence" rows="2" required>' + (saved.evidence || '') + '</textarea></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    if (saved.rank) document.getElementById('rank').value = saved.rank;
    if (saved.punishmentType) document.getElementById('punishmentType').value = saved.punishmentType;
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticc:document.getElementById('staticc').value, rank:document.getElementById('rank').value, reason:document.getElementById('reason').value, punishmentType:document.getElementById('punishmentType').value, evidence:document.getElementById('evidence').value };
      saveAutoFillData(data, 'workoff');
      callAPI('submit_workoff', data, false).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderPromotionForm(container) {
    var saved = loadAutoFillData('promotion');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="' + (saved.staticc || '') + '" required></div><div class="form-group"><label>Текущий ранг</label><input id="currentRank" value="' + (saved.currentRank || '') + '" required></div><div class="form-group"><label>Целевой ранг</label><input id="targetRank" value="' + (saved.targetRank || '') + '" required></div><div class="form-group"><label>Баллы</label><input type="number" id="points" value="' + (saved.points || '') + '" required></div><div class="form-group"><label>Док-ва баллов</label><textarea id="proof" rows="2" required>' + (saved.proof || '') + '</textarea></div><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var btns = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(function(d) { var btn = document.createElement('div'); btn.className = 'role-btn'; btn.textContent = d; if (saved.department === d) btn.classList.add('selected'); btn.onclick = function() { btns.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); }); btn.classList.add('selected'); document.getElementById('department').value = d; }; btns.appendChild(btn); });
    if (saved.department) document.getElementById('department').value = saved.department;
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticc:document.getElementById('staticc').value, currentRank:document.getElementById('currentRank').value, targetRank:document.getElementById('targetRank').value, points:document.getElementById('points').value, proof:document.getElementById('proof').value, department:document.getElementById('department').value };
      if(!data.department){ showError(container,'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData(data, 'promotion');
      callAPI('submit_promotion', data, false).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderLeaveForm(container, type) {
    var saved = loadAutoFillData(type);
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department"></div><div class="form-group"><label>Причина</label><textarea id="reason" rows="2" required>' + (saved.reason || '') + '</textarea></div><div class="form-group"><label>С даты</label><input type="datetime-local" id="fromDate" value="' + (saved.fromDate || '') + '" required></div><div class="form-group"><label>По дату</label><input type="datetime-local" id="toDate" value="' + (saved.toDate || '') + '" required></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var btns = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(function(d) { var btn = document.createElement('div'); btn.className = 'role-btn'; btn.textContent = d; if (saved.department === d) btn.classList.add('selected'); btn.onclick = function() { btns.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); }); btn.classList.add('selected'); document.getElementById('department').value = d; }; btns.appendChild(btn); });
    if (saved.department) document.getElementById('department').value = saved.department;
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { department:document.getElementById('department').value, reason:document.getElementById('reason').value, fromDate:document.getElementById('fromDate').value, toDate:document.getElementById('toDate').value };
      if(!data.department){ showError(container,'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData(data, type);
      var action = type === 'отпуск' ? 'submit_leave' : 'submit_rest';
      callAPI(action, data, false).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderSpecRequestForm(container) {
    var saved = loadAutoFillData('spec-request');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="' + (saved.staticc || '') + '" required></div><div class="form-group"><label>Ранг</label><input id="rank" value="' + (saved.rank || '') + '" required></div><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department"></div><div class="form-group"><label>Оружие</label><input id="weapon" value="' + (saved.weapon || '') + '" required></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var btns = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(function(d) { var btn = document.createElement('div'); btn.className = 'role-btn'; btn.textContent = d; if (saved.department === d) btn.classList.add('selected'); btn.onclick = function() { btns.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); }); btn.classList.add('selected'); document.getElementById('department').value = d; }; btns.appendChild(btn); });
    if (saved.department) document.getElementById('department').value = saved.department;
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticc:document.getElementById('staticc').value, rank:document.getElementById('rank').value, department:document.getElementById('department').value, weapon:document.getElementById('weapon').value };
      if(!data.department){ showError(container,'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData(data, 'spec-request');
      callAPI('submit_spec_request', data, false).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderSpecReceiveForm(container) {
    var saved = loadAutoFillData('spec-receive');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Статик</label><input id="staticc" value="' + (saved.staticc || '') + '" required></div><div class="form-group"><label>Ранг</label><input id="rank" value="' + (saved.rank || '') + '" required></div><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department"></div><div class="form-group"><label>Оружие</label><input id="weapon" value="' + (saved.weapon || '') + '" required></div><div class="form-group"><label>Номер</label><input id="weaponNumber" value="' + (saved.weaponNumber || '') + '" required></div><div class="form-group"><label>Кто выдал</label><input id="issuedBy" value="' + (saved.issuedBy || '') + '" required></div><div class="form-group"><label>Скрин из инвентаря</label><input type="file" id="attachments" multiple accept="image/*"></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var btns = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(function(d) { var btn = document.createElement('div'); btn.className = 'role-btn'; btn.textContent = d; if (saved.department === d) btn.classList.add('selected'); btn.onclick = function() { btns.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); }); btn.classList.add('selected'); document.getElementById('department').value = d; }; btns.appendChild(btn); });
    if (saved.department) document.getElementById('department').value = saved.department;
    var attachments = [];
    var fileInput = container.querySelector('#attachments');
    fileInput.onchange = function(e) { attachments = Array.from(e.target.files); createFilePreview(container, attachments, 'attachments'); };
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticc:document.getElementById('staticc').value, rank:document.getElementById('rank').value, department:document.getElementById('department').value, weapon:document.getElementById('weapon').value, weaponNumber:document.getElementById('weaponNumber').value, issuedBy:document.getElementById('issuedBy').value, attachments: attachments };
      if(!data.department){ showError(container,'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData(data, 'spec-receive');
      callAPI('submit_spec_receive', data, true).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  function renderResignationForm(container) {
    var saved = loadAutoFillData('resignation');
    container.innerHTML = '<form id="formEl"><div class="form-group"><label>Имя</label><input id="firstName" value="' + (saved.firstName || '') + '" required></div><div class="form-group"><label>Фамилия</label><input id="lastName" value="' + (saved.lastName || '') + '" required></div><div class="form-group"><label>Static ID</label><input id="staticId" value="' + (saved.staticId || '') + '" required></div><div class="form-group"><label>Отдел</label><div id="deptBtns" class="role-buttons"></div><input type="hidden" id="department"></div><div class="form-group"><label>Планшет</label><input id="tablet" value="' + (saved.tablet || '') + '" required></div><div class="form-group"><label>Инвентарь</label><input id="inventory" value="' + (saved.inventory || '') + '" required></div><div class="form-group"><label>Причина</label><textarea id="reason" rows="3" required>' + (saved.reason || '') + '</textarea></div><div class="error-message" id="formError"></div><button type="submit" class="btn-submit" id="submitBtn">Отправить</button></form>';
    var btns = container.querySelector('#deptBtns');
    DEPARTMENTS.forEach(function(d) { var btn = document.createElement('div'); btn.className = 'role-btn'; btn.textContent = d; if (saved.department === d) btn.classList.add('selected'); btn.onclick = function() { btns.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); }); btn.classList.add('selected'); document.getElementById('department').value = d; }; btns.appendChild(btn); });
    if (saved.department) document.getElementById('department').value = saved.department;
    container.querySelector('#formEl').onsubmit = function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправка...';
      var data = { firstName:document.getElementById('firstName').value, lastName:document.getElementById('lastName').value, staticId:document.getElementById('staticId').value, department:document.getElementById('department').value, tablet:document.getElementById('tablet').value, inventory:document.getElementById('inventory').value, reason:document.getElementById('reason').value };
      if(!data.department){ showError(container,'Выберите отдел'); btn.disabled = false; btn.textContent = 'Отправить'; return; }
      saveAutoFillData(data, 'resignation');
      callAPI('submit_resignation', data, false).then(function(r){ if(r.success) document.getElementById('modal').style.display='none'; setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); }).catch(function() { setTimeout(function() { btn.disabled = false; btn.textContent = 'Отправить'; }, 3000); });
    };
  }

  document.getElementById('adminClose').onclick = function() { document.getElementById('adminPanel').style.display = 'none'; };
  document.getElementById('saveBlacklistBtn').onclick = function() {
    var ids = document.getElementById('blacklistInput').value.split(/[,\n]/).map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    blacklist = ids;
    localStorage.setItem('lscsd_blacklist', JSON.stringify(blacklist));
    showNotification('Чёрный список обновлён!', 'success');
    if (currentUser && blacklist.includes(currentUser.id)) { localStorage.removeItem('lscsd_user'); showNotification('Вы в чёрном списке!', 'error'); setTimeout(function(){ location.reload(); },2000); }
  };
  
  document.getElementById('tempBlockBtn').onclick = function() {
    var ids = document.getElementById('tempBlockInput').value.split(/[,\n]/).map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    ids.forEach(function(id) { tempBlocked[id] = Date.now() + 15*60*1000; });
    localStorage.setItem('lscsd_tempBlocked', JSON.stringify(tempBlocked));
    showNotification('Пользователи заблокированы на 15 минут!', 'success');
    if (currentUser && ids.includes(currentUser.id)) { showNotification('Вы заблокированы!', 'error'); setTimeout(function(){ location.reload(); },2000); }
  };
  
  document.getElementById('unblockBtn').onclick = function() {
    var ids = document.getElementById('tempBlockInput').value.split(/[,\n]/).map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    ids.forEach(function(id) { delete tempBlocked[id]; });
    localStorage.setItem('lscsd_tempBlocked', JSON.stringify(tempBlocked));
    showNotification('Пользователи разблокированы!', 'success');
    document.getElementById('tempBlockInput').value = '';
    if (currentUser && ids.includes(currentUser.id)) window.location.reload();
  };
  
  var bugModal = document.getElementById('bugModal');
  document.getElementById('reportBugBtn').onclick = function() { if(currentUser) bugModal.style.display = 'flex'; else showNotification('Авторизуйтесь', 'warning'); };
  document.getElementById('closeBugBtn').onclick = function() { bugModal.style.display = 'none'; };
  document.getElementById('sendBugBtn').onclick = function() {
    var bugType = document.getElementById('bugType').value;
    var bugDesc = document.getElementById('bugDescription').value;
    if(!bugDesc) { showNotification('Опишите проблему', 'warning'); return; }
    sendBugReport(bugType, bugDesc);
    bugModal.style.display = 'none';
    document.getElementById('bugDescription').value = '';
  };
  
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
            if (app) {
              app.style.display = 'flex';
              setTimeout(function() { app.style.opacity = '1'; }, 50);
            }
          }, 500);
        }
      }, 1000);
    }
  }, 70);
  
  checkAuth();
})();
