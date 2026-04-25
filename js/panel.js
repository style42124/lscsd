(function() {
  var PROXY_URL = 'https://cs324022.tw1.ru/index.php';
  var currentUser = null;
  var currentUserRole = null;
  var allUsers = {};
  var allApplications = [];
  var currentFilter = 'all';
  
  var progress = 0;
  var progressBar = document.getElementById('preloaderProgress');
  if (progressBar) {
    var interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress > 100) progress = 100;
      if (progressBar) progressBar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          var preloader = document.getElementById('preloader');
          if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
              preloader.style.display = 'none';
              var app = document.getElementById('app');
              if (app) {
                app.style.display = 'flex';
                setTimeout(() => app.style.opacity = '1', 50);
              }
            }, 500);
          }
        }, 1000);
      }
    }, 70);
  }
  
  function showNotification(msg, type) {
    var div = document.createElement('div');
    div.className = 'notification ' + (type || 'info');
    div.innerHTML = '<div class="notification-title">' + (type==='success'?'✅':'⚠️') + '</div><div>' + msg + '</div>';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
  
  function loadUserRole() {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_user_role', data: { userId: currentUser.id } })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        currentUserRole = res.role;
        var badge = document.getElementById('userRoleBadge');
        if (badge) badge.innerText = currentUserRole.name || 'Младший состав';
        return currentUserRole;
      }
      return null;
    });
  }
  
  function loadAllUsers() {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_all_users_roles' })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        allUsers = res.users;
        renderUsers();
      }
    });
  }
  
  function loadApplications() {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_applications', data: { userId: currentUser.id, userRole: currentUserRole ? currentUserRole.level : 1, userDept: currentUserRole ? (currentUserRole.department || '') : '' } })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        allApplications = res.applications || [];
        renderApplications();
      }
    });
  }
  
  function performAction(action, targetUserId, extra = {}) {
    var data = { targetUserId, executorId: currentUser.id };
    Object.assign(data, extra);
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        showNotification('Операция выполнена!', 'success');
        loadAllUsers();
        loadApplications();
      } else {
        showNotification(res.error || 'Ошибка', 'error');
      }
    });
  }
  
  function setUserRole(targetUserId, level, department, roleName) {
    var levelNames = {1:'Младший состав',2:'Dep.Head',3:'Head',4:'Curator',5:'Assist Sheriff',6:'SK/Dep.SK',7:'UnderSheriff',8:'Sheriff',9:'Разработчик'};
    return performAction('set_user_role', targetUserId, { level, department, roleName: roleName || levelNames[level] });
  }
  
  function banUser(targetUserId) { return performAction('ban_user', targetUserId); }
  function unbanUser(targetUserId) { return performAction('unban_user', targetUserId); }
  function tempBanUser(targetUserId, hours = 1) { return performAction('temp_ban_user', targetUserId, { hours }); }
  function excludeFromDuty(targetUserId) { return performAction('exclude_from_duty', targetUserId); }
  function includeToDuty(targetUserId) { return performAction('include_to_duty', targetUserId); }
  
  function reviewApplication(appId, status, comment, appData, appType) {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review_application', data: { applicationId: appId, status, comment, reviewer: currentUser.id, reviewerRole: currentUserRole ? currentUserRole.name : '', applicationType: appType, applicationData: appData } })
    }).then(r => r.json()).then(res => {
      if (res.success) showNotification('Решение отправлено!', 'success');
      else showNotification('Ошибка', 'error');
      return res;
    });
  }
  
  function renderUsers() {
    var container = document.getElementById('usersGrid');
    var searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    if (!container) return;
    var roleLevels = {1:'Младший состав',2:'Dep.Head',3:'Head',4:'Curator',5:'Assist Sheriff',6:'SK/Dep.SK',7:'UnderSheriff',8:'Sheriff',9:'Разработчик'};
    var usersList = Object.keys(allUsers).map(id => ({ id, role: allUsers[id] }));
    if (currentUserRole && currentUserRole.level < 7) {
      usersList = usersList.filter(u => u.role.level <= currentUserRole.level);
    }
    usersList = usersList.filter(u => u.id.toLowerCase().indexOf(searchTerm) !== -1 || (u.role.name || '').toLowerCase().indexOf(searchTerm) !== -1);
    container.innerHTML = '';
    usersList.forEach(user => {
      var card = document.createElement('div');
      card.className = 'user-card';
      var roleClass = 'role-' + (user.role.level || 1);
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="badge-icon"><i class="fab fa-discord"></i></div>
          <div><strong style="color:#fff;">${user.id}</strong><br><span class="user-role-tag ${roleClass}">${roleLevels[user.role.level] || 'Младший состав'}</span>${user.role.department ? `<span style="margin-left:5px; color:#d4af37;">(${user.role.department})</span>` : ''}</div>
          <div class="user-actions"><button class="cog-btn" data-id="${user.id}"><i class="fas fa-cog"></i></button><div class="user-menu" id="menu-${user.id}" style="display:none;"></div></div>
        </div>
      `;
      container.appendChild(card);
      var cogBtn = card.querySelector('.cog-btn');
      var menu = card.querySelector('.user-menu');
      cogBtn.onclick = (e) => {
        e.stopPropagation();
        var isVisible = menu.style.display === 'block';
        document.querySelectorAll('.user-menu').forEach(m => m.style.display = 'none');
        menu.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
          menu.innerHTML = `
            <button class="ban-btn" data-id="${user.id}">🔨 Забанить</button>
            <button class="unban-btn" data-id="${user.id}">🔓 Разбанить</button>
            <button class="tempban-btn" data-id="${user.id}">⏱ Временный бан (1 час)</button>
            <div><select class="rank-select" data-id="${user.id}"><option value="1">Младший состав</option><option value="2">Dep.Head</option><option value="3">Head</option><option value="4">Curator</option><option value="5">Assist Sheriff</option><option value="6">SK/Dep.SK</option><option value="7">UnderSheriff</option><option value="8">Sheriff</option><option value="9">Разработчик</option></select><button class="rank-apply" data-id="${user.id}">Назначить ранг</button></div>
            <div><select class="dept-select" data-id="${user.id}"><option value="">Без отдела</option><option value="SAI">SAI</option><option value="GU">GU</option><option value="AF">AF</option><option value="IAD">IAD</option><option value="SEB">SEB</option><option value="K9">K-9</option><option value="DID">DID</option><option value="MED">MED</option><option value="SPD">SPD</option><option value="HS">High Staff</option></select><button class="dept-apply" data-id="${user.id}">Назначить отдел</button></div>
            <button class="exclude-btn" data-id="${user.id}">🚫 Исключить от обязанностей</button>
            <button class="include-btn" data-id="${user.id}">✅ Включить в обязанности</button>
          `;
          menu.querySelector('.ban-btn')?.addEventListener('click', () => banUser(user.id));
          menu.querySelector('.unban-btn')?.addEventListener('click', () => unbanUser(user.id));
          menu.querySelector('.tempban-btn')?.addEventListener('click', () => tempBanUser(user.id, 1));
          menu.querySelector('.rank-apply')?.addEventListener('click', () => {
            var level = parseInt(menu.querySelector('.rank-select').value);
            setUserRole(user.id, level, user.role.department);
          });
          menu.querySelector('.dept-apply')?.addEventListener('click', () => {
            var dept = menu.querySelector('.dept-select').value || null;
            setUserRole(user.id, user.role.level, dept);
          });
          menu.querySelector('.exclude-btn')?.addEventListener('click', () => excludeFromDuty(user.id));
          menu.querySelector('.include-btn')?.addEventListener('click', () => includeToDuty(user.id));
        }
      };
    });
    document.addEventListener('click', () => document.querySelectorAll('.user-menu').forEach(m => m.style.display = 'none'));
  }
  
  function renderApplications() {
    var container = document.getElementById('applicationsList');
    if (!container) return;
    var filtered = allApplications;
    if (currentFilter === 'pending') filtered = filtered.filter(a => a.data.status === 'pending');
    if (currentFilter === 'approved') filtered = filtered.filter(a => a.data.status === 'approved');
    if (currentFilter === 'rejected') filtered = filtered.filter(a => a.data.status === 'rejected');
    container.innerHTML = '';
    if (filtered.length === 0) { container.innerHTML = '<div style="text-align:center;padding:30px;">Нет заявок</div>'; return; }
    var typeNames = {submit_department:'Заявка в отдел',submit_promotion:'Повышение',submit_appeal:'Обжалование',submit_workoff:'Отработка',submit_leave:'Отпуск',submit_rest:'Отдых',submit_spec_request:'Спецвооружение запрос',submit_spec_receive:'Спецвооружение получение',submit_resignation:'Увольнение'};
    filtered.forEach(app => {
      var item = document.createElement('div');
      var statusClass = 'app-status-' + (app.data.status || 'pending');
      item.className = 'app-item ' + statusClass;
      var statusText = app.data.status === 'pending' ? '⏳ На рассмотрении' : (app.data.status === 'approved' ? '✅ Одобрена' : '❌ Отклонена');
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;"><span style="color:#e8e8e8;">${typeNames[app.data.type] || app.data.type}</span><span style="font-size:11px;">#${app.id}</span></div>
        <div style="font-size:12px; color:#d4af37;">От: ${app.data.username || app.data.userId}</div>
        <div style="font-size:11px;">${statusText}</div>
        <div style="font-size:11px; color:#6b6f78;">${app.data.created_at || ''}</div>
      `;
      if (app.data.status === 'pending') {
        var reviewBtn = document.createElement('button');
        reviewBtn.innerHTML = 'Рассмотреть';
        reviewBtn.style.cssText = 'background:#d4af37;border:none;padding:5px 12px;border-radius:20px;margin-top:8px;cursor:pointer;';
        reviewBtn.onclick = () => openReviewModal(app.id, app.data);
        item.appendChild(reviewBtn);
      }
      container.appendChild(item);
    });
  }
  
  function openReviewModal(appId, appData) {
    var typeNames = {submit_department:'Заявка в отдел',submit_promotion:'Повышение',submit_appeal:'Обжалование',submit_workoff:'Отработка',submit_leave:'Отпуск',submit_rest:'Отдых',submit_spec_request:'Спецвооружение запрос',submit_spec_receive:'Спецвооружение получение',submit_resignation:'Увольнение'};
    var modalHtml = `
      <div class="review-modal" id="reviewModal" style="display:flex;"><div class="review-content">
        <h3 style="color:#d4af37;">Рассмотрение заявки</h3>
        <p><strong>Тип:</strong> ${typeNames[appData.type] || appData.type}</p>
        <p><strong>Заявитель:</strong> ${appData.username || appData.userId}</p>
        <p><strong>Дата:</strong> ${appData.created_at || ''}</p>
        <select id="reviewStatus"><option value="approved">✅ Одобрить</option><option value="rejected">❌ Отклонить</option></select>
        <textarea id="reviewComment" rows="3" placeholder="Комментарий..."></textarea>
        <div style="display:flex;gap:10px;margin-top:15px;"><button id="submitReviewBtn" class="btn-primary">Отправить решение</button><button id="closeReviewBtn" class="btn-danger">Отмена</button></div>
      </div></div>
    `;
    var modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
    var modal = modalDiv.firstElementChild;
    document.getElementById('submitReviewBtn').onclick = () => {
      var status = document.getElementById('reviewStatus').value;
      var comment = document.getElementById('reviewComment').value;
      reviewApplication(appId, status, comment, appData, typeNames[appData.type] || appData.type).then(() => {
        modal.remove();
        loadApplications();
      });
    };
    document.getElementById('closeReviewBtn').onclick = () => modal.remove();
  }
  
  document.getElementById('backToMainBtn').onclick = () => window.location.href = '/lscsd/';
  
  function handleAuthCallback() {
    var hash = window.location.hash.substring(1);
    if (hash && hash.indexOf('access_token') !== -1) {
      var params = new URLSearchParams(hash);
      var token = params.get('access_token');
      if (token) {
        fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer '+token } })
          .then(r => r.json()).then(user => {
            localStorage.setItem('lscsd_user', JSON.stringify({ id:user.id, username:user.username, avatar:user.avatar ? 'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.png' : '' }));
            window.location.hash = '';
            location.reload();
          }).catch(() => showNotification('Ошибка авторизации', 'error'));
      }
    }
  }
  
  function checkAuth() {
    var user = localStorage.getItem('lscsd_user');
    if (user) {
      currentUser = JSON.parse(user);
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
      document.getElementById('navName').innerText = currentUser.username;
      if (currentUser.avatar) document.getElementById('navAvatar').src = currentUser.avatar;
      loadUserRole().then(() => {
        if (currentUserRole && (currentUserRole.level < 7 && currentUserRole.level !== 9)) {
          document.getElementById('mainContainer').innerHTML = '<div style="text-align:center;padding:50px;"><h2 style="color:#d4af37;">Доступ запрещён</h2><button onclick="window.location.href=\'/lscsd/\'" class="btn-primary">Вернуться</button></div>';
          return;
        }
        loadAllUsers();
        loadApplications();
      });
    } else {
      document.getElementById('authContainer').style.display = 'flex';
      document.getElementById('mainContainer').style.display = 'none';
      handleAuthCallback();
    }
  }
  
  document.getElementById('authBtn').onclick = () => window.location.href = 'https://discord.com/api/oauth2/authorize?client_id=1494686473520287774&redirect_uri='+encodeURIComponent('https://style42124.github.io/lscsd/panel.html')+'&response_type=token&scope=identify';
  document.getElementById('userSearch')?.addEventListener('input', () => renderUsers());
  
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = function() {
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(this.dataset.tab + '-tab').classList.add('active');
      if (this.dataset.tab === 'users') renderUsers();
      if (this.dataset.tab === 'applications') renderApplications();
    };
  });
  
  var filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.onclick = function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderApplications();
    };
  });
  
  checkAuth();
})();
