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
    var interval = setInterval(function() {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress > 100) progress = 100;
      if (progressBar) progressBar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(function() {
          var preloader = document.getElementById('preloader');
          if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(function() {
              preloader.style.display = 'none';
              var app = document.getElementById('app');
              if (app) {
                app.style.display = 'flex';
                setTimeout(function() { app.style.opacity = '1'; }, 50);
              }
            }, 500);
          }
        }, 1000);
      }
    }, 70);
  }
  
  function showNotification(message, type, title) {
    var div = document.createElement('div');
    div.className = 'notification ' + (type || 'info');
    div.innerHTML = '<div class="notification-title">' + (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + (title || (type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : 'Внимание')) + '</div><div class="notification-message">' + message + '</div>';
    document.body.appendChild(div);
    setTimeout(function() { if(div) div.remove(); }, 3000);
  }
  
  function loadUserRole() {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_user_role', data: { userId: currentUser.id } })
    }).then(function(r) { return r.json(); }).then(function(res) {
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
    }).then(function(r) { return r.json(); }).then(function(res) {
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
      body: JSON.stringify({ 
        action: 'get_applications', 
        data: { 
          userId: currentUser.id, 
          userRole: currentUserRole ? currentUserRole.level : 1, 
          userDept: currentUserRole ? (currentUserRole.department || '') : '' 
        } 
      })
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        allApplications = res.applications || [];
        renderApplications();
      }
    });
  }
  
  function setUserRole(targetUserId, level, department, roleName) {
    var levelNames = {1:'Младший состав',2:'Dep.Head',3:'Head',4:'Curator',5:'Assist Sheriff',6:'SK/Dep.SK',7:'UnderSheriff',8:'Sheriff',9:'Разработчик'};
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'set_user_role', 
        data: { 
          targetUserId: targetUserId, 
          level: level, 
          department: department, 
          roleName: roleName || levelNames[level], 
          executorId: currentUser.id, 
          executorRole: currentUserRole ? currentUserRole.level : 1 
        } 
      })
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        showNotification('Роль назначена!', 'success');
        loadAllUsers();
      } else {
        showNotification(res.error || 'Ошибка', 'error');
      }
    });
  }
  
  function reviewApplication(appId, status, comment, appData, appType) {
    return fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'review_application', 
        data: { 
          applicationId: appId, 
          status: status, 
          comment: comment, 
          reviewer: currentUser.id, 
          reviewerRole: currentUserRole ? currentUserRole.name : '', 
          applicationType: appType, 
          applicationData: appData 
        } 
      })
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        showNotification('Решение отправлено!', 'success');
        loadApplications();
      } else {
        showNotification('Ошибка', 'error');
      }
    });
  }
  
  function renderUsers() {
    var container = document.getElementById('usersGrid');
    var searchTerm = document.getElementById('userSearch') ? document.getElementById('userSearch').value.toLowerCase() : '';
    if (!container) return;
    container.innerHTML = '';
    var roleLevels = {1:'Младший состав',2:'Dep.Head',3:'Head',4:'Curator',5:'Assist Sheriff',6:'SK/Dep.SK',7:'UnderSheriff',8:'Sheriff',9:'Разработчик'};
    var usersList = Object.keys(allUsers).map(function(id) { return { id: id, role: allUsers[id] }; });
    if (currentUserRole && currentUserRole.level < 7) {
      usersList = usersList.filter(function(u) { return u.role.level <= currentUserRole.level; });
    }
    usersList = usersList.filter(function(u) { 
      return u.id.toLowerCase().indexOf(searchTerm) !== -1 || (u.role.name || '').toLowerCase().indexOf(searchTerm) !== -1; 
    });
    usersList.forEach(function(user) {
      var card = document.createElement('div');
      card.className = 'user-card';
      var roleClass = 'role-' + (user.role.level || 1);
      card.innerHTML = 
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<div class="badge-icon"><i class="fab fa-discord"></i></div>' +
          '<div><strong>' + user.id + '</strong><br><span class="user-role-tag ' + roleClass + '">' + (roleLevels[user.role.level] || 'Младший состав') + '</span>' +
          (user.role.department ? '<span style="margin-left:5px;">(' + user.role.department + ')</span>' : '') + '</div>' +
        '</div>';
      if (currentUserRole && currentUserRole.level >= 7 && user.id !== currentUser.id) {
        var btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-edit"></i> Назначить роль';
        btn.style.cssText = 'background:#d4af37;border:none;padding:6px 12px;border-radius:20px;cursor:pointer;width:100%;margin-top:10px;';
        btn.onclick = (function(uid, urole) { return function() { openRoleModal(uid, urole); }; })(user.id, user.role);
        card.appendChild(btn);
      }
      container.appendChild(card);
    });
  }
  
  function renderApplications() {
    var container = document.getElementById('applicationsList');
    if (!container) return;
    var filtered = allApplications;
    if (currentFilter === 'pending') filtered = filtered.filter(function(a) { return a.data.status === 'pending'; });
    if (currentFilter === 'approved') filtered = filtered.filter(function(a) { return a.data.status === 'approved'; });
    if (currentFilter === 'rejected') filtered = filtered.filter(function(a) { return a.data.status === 'rejected'; });
    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:30px;color:#6b6f78;">Нет заявок</div>';
      return;
    }
    var typeNames = {submit_department:'Заявка в отдел',submit_promotion:'Повышение',submit_appeal:'Обжалование',submit_workoff:'Отработка',submit_leave:'Отпуск',submit_rest:'Отдых',submit_spec_request:'Спецвооружение запрос',submit_spec_receive:'Спецвооружение получение',submit_resignation:'Увольнение'};
    filtered.forEach(function(app) {
      var item = document.createElement('div');
      var statusClass = 'app-status-' + (app.data.status || 'pending');
      item.className = 'app-item ' + statusClass;
      var statusText = app.data.status === 'pending' ? '⏳ На рассмотрении' : (app.data.status === 'approved' ? '✅ Одобрена' : '❌ Отклонена');
      item.innerHTML = 
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span class="type">' + (typeNames[app.data.type] || app.data.type) + '</span>' +
          '<span style="font-size:11px;">#' + app.id + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:#9ca3af;margin:5px 0;">От: ' + (app.data.username || app.data.userId) + '</div>' +
        '<div style="font-size:11px;">' + statusText + '</div>' +
        '<div style="font-size:11px;color:#6b6f78;">' + (app.data.created_at || '') + '</div>';
      if (app.data.status === 'pending') {
        var canReview = false;
        if (currentUserRole && currentUserRole.level >= 2) canReview = true;
        if (currentUserRole && currentUserRole.specialAccess && currentUserRole.specialAccess.includes(app.data.type)) canReview = true;
        if (canReview) {
          var reviewBtn = document.createElement('button');
          reviewBtn.innerHTML = '<i class="fas fa-gavel"></i> Рассмотреть';
          reviewBtn.style.cssText = 'background:#d4af37;border:none;padding:5px 12px;border-radius:20px;cursor:pointer;margin-top:8px;width:100%;';
          reviewBtn.onclick = (function(aid, adata) { return function() { openReviewModal(aid, adata); }; })(app.id, app.data);
          item.appendChild(reviewBtn);
        }
      }
      container.appendChild(item);
    });
  }
  
  function openRoleModal(userId, currentRole) {
    var modal = document.getElementById('roleModal');
    if (!modal) return;
    var targetSpan = document.getElementById('roleTargetName');
    if (targetSpan) targetSpan.innerText = 'Пользователь: ' + userId;
    var levelSelect = document.getElementById('roleLevelSelect');
    if (levelSelect) levelSelect.value = currentRole ? currentRole.level : 1;
    var deptSelect = document.getElementById('roleDeptSelect');
    if (deptSelect) deptSelect.value = currentRole ? (currentRole.department || '') : '';
    modal.style.display = 'flex';
    var saveBtn = document.getElementById('saveRoleBtn');
    var closeBtn = document.getElementById('closeRoleBtn');
    if (saveBtn) {
      saveBtn.onclick = function() {
        var level = parseInt(document.getElementById('roleLevelSelect').value);
        var dept = document.getElementById('roleDeptSelect').value || null;
        setUserRole(userId, level, dept);
        modal.style.display = 'none';
      };
    }
    if (closeBtn) {
      closeBtn.onclick = function() { modal.style.display = 'none'; };
    }
  }
  
  function openReviewModal(appId, appData) {
    var modal = document.getElementById('reviewModal');
    if (!modal) return;
    var typeNames = {submit_department:'Заявка в отдел',submit_promotion:'Повышение',submit_appeal:'Обжалование',submit_workoff:'Отработка',submit_leave:'Отпуск',submit_rest:'Отдых',submit_spec_request:'Спецвооружение запрос',submit_spec_receive:'Спецвооружение получение',submit_resignation:'Увольнение'};
    var appDataDiv = document.getElementById('reviewAppData');
    if (appDataDiv) {
      appDataDiv.innerHTML = 
        '<p><strong>Тип:</strong> ' + (typeNames[appData.type] || appData.type) + '</p>' +
        '<p><strong>Заявитель:</strong> <@' + appData.userId + '></p>' +
        '<p><strong>Дата:</strong> ' + (appData.created_at || '') + '</p>';
    }
    var statusSelect = document.getElementById('reviewStatus');
    if (statusSelect) statusSelect.value = 'approved';
    var commentArea = document.getElementById('reviewComment');
    if (commentArea) commentArea.value = '';
    modal.style.display = 'flex';
    var submitBtn = document.getElementById('submitReviewBtn');
    var closeBtn = document.getElementById('closeReviewBtn');
    if (submitBtn) {
      submitBtn.onclick = function() {
        var status = document.getElementById('reviewStatus').value;
        var comment = document.getElementById('reviewComment').value;
        reviewApplication(appId, status, comment, appData, typeNames[appData.type] || appData.type);
        modal.style.display = 'none';
      };
    }
    if (closeBtn) {
      closeBtn.onclick = function() { modal.style.display = 'none'; };
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
      var authContainer = document.getElementById('authContainer');
      var mainContainer = document.getElementById('mainContainer');
      if (authContainer) authContainer.style.display = 'none';
      if (mainContainer) mainContainer.style.display = 'block';
      var navName = document.getElementById('navName');
      if (navName) navName.innerText = currentUser.username;
      var navAvatar = document.getElementById('navAvatar');
      if (navAvatar && currentUser.avatar) navAvatar.src = currentUser.avatar;
      loadUserRole().then(function() {
        if (currentUserRole && currentUserRole.level < 2 && currentUserRole.level !== 6) {
          if (mainContainer) {
            mainContainer.innerHTML = '<div style="text-align:center;padding:50px;"><h2>Доступ запрещён</h2><p>У вас недостаточно прав для доступа к панели управления.</p><button onclick="window.location.href=\'/lscsd/\'" class="btn-primary" style="background:#d4af37;border:none;padding:10px 20px;border-radius:30px;cursor:pointer;">Вернуться на главную</button></div>';
          }
          return;
        }
        loadAllUsers();
        loadApplications();
      });
    } else {
      var authContainer = document.getElementById('authContainer');
      var mainContainer = document.getElementById('mainContainer');
      if (authContainer) authContainer.style.display = 'flex';
      if (mainContainer) mainContainer.style.display = 'none';
      handleAuthCallback();
    }
  }
  
  var authBtn = document.getElementById('authBtn');
  if (authBtn) {
    authBtn.onclick = function() {
      var REDIRECT_URI = 'https://style42124.github.io/lscsd/panel.html';
      window.location.href = 'https://discord.com/api/oauth2/authorize?client_id=1494686473520287774&redirect_uri='+encodeURIComponent(REDIRECT_URI)+'&response_type=token&scope=identify';
    };
  }
  
  var userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', function() { renderUsers(); });
  }
  
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(btn) {
    btn.onclick = function() {
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(function(tab) { tab.classList.remove('active'); });
      var targetTab = document.getElementById(this.dataset.tab + '-tab');
      if (targetTab) targetTab.classList.add('active');
      if (this.dataset.tab === 'users') renderUsers();
      if (this.dataset.tab === 'applications') renderApplications();
    };
  });
  
  var filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(function(btn) {
    btn.onclick = function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderApplications();
    };
  });
  
  checkAuth();
})();