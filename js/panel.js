(function() {
  const PROXY_URL = 'https://cs324022.tw1.ru/index.php';
  let currentUser = null;
  let currentUserRole = null;
  let allUsers = {};
  let allApplications = [];
  let currentFilter = 'all';

  // Preloader
  let progress = 0;
  const progressBar = document.getElementById('preloaderProgress');
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 4;
    if (progress > 100) progress = 100;
    if (progressBar) progressBar.style.width = progress + '%';
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
          preloader.style.opacity = '0';
          setTimeout(() => {
            preloader.style.display = 'none';
            const app = document.getElementById('app');
            if (app) {
              app.style.display = 'flex';
              setTimeout(() => app.style.opacity = '1', 50);
            }
          }, 500);
        }
      }, 1000);
    }
  }, 70);

  function showNotification(msg, type) {
    const div = document.createElement('div');
    div.className = 'notification ' + (type || 'info');
    div.innerHTML = `<div class="notification-title">${type === 'success' ? '✅' : '⚠️'}</div><div>${msg}</div>`;
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
        const badge = document.getElementById('userRoleBadge');
        if (badge) badge.innerText = currentUserRole.name || 'Младший состав';
        return currentUserRole;
      }
      return null;
    });
  }

  function loadAllUsers() {
  // Для уровней 2 и выше загружаем список (для отображения)
  if (currentUserRole && currentUserRole.level >= 2) {
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
  return Promise.resolve();
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
    }).then(r => r.json()).then(res => {
      if (res.success) {
        allApplications = res.applications || [];
        renderApplications();
      }
    });
  }

  function performAction(action, targetUserId, extra = {}) {
    const data = { targetUserId, executorId: currentUser.id, ...extra };
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

  function setUserRole(targetUserId, level, department) {
    const levelNames = {1:'Младший состав',2:'Dep.Head',3:'Head',4:'Curator',5:'Assist Sheriff',6:'SK/Dep.SK',7:'UnderSheriff',8:'Sheriff',9:'Разработчик'};
    return performAction('set_user_role', targetUserId, { level, department, roleName: levelNames[level] });
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
      body: JSON.stringify({
        action: 'review_application',
        data: {
          applicationId: appId,
          status,
          comment,
          reviewer: currentUser.id,
          reviewerRole: currentUserRole ? currentUserRole.name : '',
          applicationType: appType,
          applicationData: appData
        }
      })
    }).then(r => r.json()).then(res => {
      if (res.success) showNotification('Решение отправлено!', 'success');
      else showNotification('Ошибка', 'error');
      return res;
    });
  }

  function openUserModal(userId, userRole) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'user-modal';
    modalDiv.innerHTML = `
      <div class="user-content">
        <h3 style="color:#d4af37;">Управление пользователем: ${userId}</h3>
        <div class="flex-buttons" style="flex-wrap:wrap;">
          <button id="userBanBtn" class="btn-primary">🔨 Забанить</button>
          <button id="userUnbanBtn" class="btn-primary">🔓 Разбанить</button>
          <button id="userTempBanBtn" class="btn-primary">⏱ Бан на 1 час</button>
          <button id="userExcludeBtn" class="btn-primary">🚫 Исключить из обязанностей</button>
          <button id="userIncludeBtn" class="btn-primary">✅ Включить в обязанности</button>
        </div>
        <select id="userRankSelect">
          <option value="1">Младший состав</option><option value="2">Dep.Head</option><option value="3">Head</option>
          <option value="4">Curator</option><option value="5">Assist Sheriff</option><option value="6">SK/Dep.SK</option>
          <option value="7">UnderSheriff</option><option value="8">Sheriff</option><option value="9">Разработчик</option>
        </select>
        <button id="userSetRankBtn" class="btn-primary">Назначить ранг</button>
        <select id="userDeptSelect">
          <option value="">Без отдела</option><option value="SAI">SAI</option><option value="GU">GU</option>
          <option value="AF">AF</option><option value="IAD">IAD</option><option value="SEB">SEB</option>
          <option value="K9">K-9</option><option value="DID">DID</option><option value="MED">MED</option>
          <option value="SPD">SPD</option><option value="HS">High Staff</option>
        </select>
        <button id="userSetDeptBtn" class="btn-primary">Назначить отдел</button>
        <div class="flex-buttons"><button id="userModalCloseBtn" class="btn-cancel">Закрыть</button></div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    document.getElementById('userRankSelect').value = userRole.level || 1;
    document.getElementById('userDeptSelect').value = userRole.department || '';
    document.getElementById('userBanBtn').onclick = () => { banUser(userId); modalDiv.remove(); };
    document.getElementById('userUnbanBtn').onclick = () => { unbanUser(userId); modalDiv.remove(); };
    document.getElementById('userTempBanBtn').onclick = () => { tempBanUser(userId, 1); modalDiv.remove(); };
    document.getElementById('userExcludeBtn').onclick = () => { excludeFromDuty(userId); modalDiv.remove(); };
    document.getElementById('userIncludeBtn').onclick = () => { includeToDuty(userId); modalDiv.remove(); };
    document.getElementById('userSetRankBtn').onclick = () => {
      const level = parseInt(document.getElementById('userRankSelect').value);
      setUserRole(userId, level, userRole.department);
      modalDiv.remove();
    };
    document.getElementById('userSetDeptBtn').onclick = () => {
      const dept = document.getElementById('userDeptSelect').value || null;
      setUserRole(userId, userRole.level, dept);
      modalDiv.remove();
    };
    document.getElementById('userModalCloseBtn').onclick = () => modalDiv.remove();
  }

  function renderUsers() {
    const container = document.getElementById('usersGrid');
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    if (!container) return;
    
    const roleLevels = {1:'Младший состав',2:'Dep.Head',3:'Head',4:'Curator',5:'Assist Sheriff',6:'SK/Dep.SK',7:'UnderSheriff',8:'Sheriff',9:'Разработчик'};
    let usersList = Object.keys(allUsers).map(id => ({ id, role: allUsers[id] }));
    usersList = usersList.filter(u => u.id.toLowerCase().includes(searchTerm));
    container.innerHTML = '';
    for (const user of usersList) {
      const card = document.createElement('div');
      card.className = 'user-card';
      const roleClass = 'role-' + (user.role.level || 1);
      card.innerHTML = `
        <div class="user-info">
          <div class="badge-icon"><i class="fab fa-discord"></i></div>
          <div><strong style="color:#fff;">${user.id}</strong><br>
            <span class="user-role-tag ${roleClass}">${roleLevels[user.role.level] || 'Младший состав'}</span>
            ${user.role.department ? `<span style="margin-left:5px;color:#d4af37;">(${user.role.department})</span>` : ''}
          </div>
        </div>
        ${(currentUserRole && (currentUserRole.level >= 7 || currentUserRole.level === 9)) ? `<div class="user-actions"><button class="cog-btn" data-id="${user.id}"><i class="fas fa-cog"></i></button></div>` : ''}
      `;
      container.appendChild(card);
      if (currentUserRole && (currentUserRole.level >= 7 || currentUserRole.level === 9)) {
        const cogBtn = card.querySelector('.cog-btn');
        cogBtn.onclick = () => openUserModal(user.id, user.role);
      }
    }
  }

  function renderApplications() {
    const container = document.getElementById('applicationsList');
    if (!container) return;
    let filtered = allApplications;
    if (currentFilter === 'pending') filtered = filtered.filter(a => a.data.status === 'pending');
    if (currentFilter === 'approved') filtered = filtered.filter(a => a.data.status === 'approved');
    if (currentFilter === 'rejected') filtered = filtered.filter(a => a.data.status === 'rejected');
    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:30px;">Нет заявок</div>';
      return;
    }
    const typeNames = {
      submit_department:'Заявка в отдел', submit_promotion:'Повышение', submit_appeal:'Обжалование',
      submit_workoff:'Отработка', submit_leave:'Отпуск', submit_rest:'Отдых',
      submit_spec_request:'Спецвооружение запрос', submit_spec_receive:'Спецвооружение получение',
      submit_resignation:'Увольнение'
    };
    for (const app of filtered) {
      const item = document.createElement('div');
      const statusClass = 'app-status-' + (app.data.status || 'pending');
      item.className = `app-item ${statusClass}`;
      const statusText = app.data.status === 'pending' ? '⏳ На рассмотрении' : (app.data.status === 'approved' ? '✅ Одобрена' : '❌ Отклонена');
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;"><span style="color:#e8e8e8;">${typeNames[app.data.type] || app.data.type}</span><span style="font-size:11px;">#${app.id}</span></div>
        <div style="font-size:12px; color:#d4af37;">От: ${app.data.username || app.data.userId}</div>
        <div style="font-size:11px;">${statusText}</div>
        <div style="font-size:11px; color:#6b6f78;">${app.data.created_at || ''}</div>
      `;
      if (app.data.status === 'pending') {
        let canReview = false;
        const role = currentUserRole;
        const isAppealWorkoff = (typeNames[app.data.type] === 'Обжалование' || typeNames[app.data.type] === 'Отработка');
        if (role.level >= 7) canReview = true;
        else if (role.level === 6 && (typeNames[app.data.type] === 'Спецвооружение запрос' || typeNames[app.data.type] === 'Спецвооружение получение')) canReview = true;
        else if (role.level >= 2 && role.level <= 5) {
          if (app.data.department === role.department && !isAppealWorkoff) canReview = true;
        }
        if (canReview) {
          const reviewBtn = document.createElement('button');
          reviewBtn.textContent = 'Рассмотреть';
          reviewBtn.style.cssText = 'background:#d4af37;border:none;padding:5px 12px;border-radius:20px;margin-top:8px;cursor:pointer;';
          reviewBtn.onclick = () => openReviewModal(app.id, app.data);
          item.appendChild(reviewBtn);
        }
      }
      container.appendChild(item);
    }
  }

  function openReviewModal(appId, appData) {
    const typeNames = {
      submit_department:'Заявка в отдел', submit_promotion:'Повышение', submit_appeal:'Обжалование',
      submit_workoff:'Отработка', submit_leave:'Отпуск', submit_rest:'Отдых',
      submit_spec_request:'Спецвооружение запрос', submit_spec_receive:'Спецвооружение получение',
      submit_resignation:'Увольнение'
    };
    const modalDiv = document.createElement('div');
    modalDiv.className = 'review-modal';
    modalDiv.innerHTML = `
      <div class="review-content">
        <h3 style="color:#d4af37;">Рассмотрение заявки</h3>
        <p><strong>Тип:</strong> ${typeNames[appData.type] || appData.type}</p>
        <p><strong>Заявитель:</strong> ${appData.username || appData.userId}</p>
        <p><strong>Дата:</strong> ${appData.created_at || ''}</p>
        <select id="reviewStatus"><option value="approved">✅ Одобрить</option><option value="rejected">❌ Отклонить</option></select>
        <textarea id="reviewComment" rows="3" placeholder="Комментарий..."></textarea>
        <div style="display:flex;gap:10px;margin-top:15px;"><button id="submitReviewBtn" class="btn-primary">Отправить решение</button><button id="closeReviewBtn" class="btn-cancel">Отмена</button></div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    document.getElementById('submitReviewBtn').onclick = () => {
      const status = document.getElementById('reviewStatus').value;
      const comment = document.getElementById('reviewComment').value;
      reviewApplication(appId, status, comment, appData, typeNames[appData.type] || appData.type).then(() => {
        modalDiv.remove();
        loadApplications();
      });
    };
    document.getElementById('closeReviewBtn').onclick = () => modalDiv.remove();
  }

  function handleAuthCallback() {
    const hash = window.location.hash.substring(1);
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      if (token) {
        fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(user => {
            localStorage.setItem('lscsd_user', JSON.stringify({
              id: user.id,
              username: user.username,
              avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : ''
            }));
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
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
      document.getElementById('navName').innerText = currentUser.username;
      if (currentUser.avatar) document.getElementById('navAvatar').src = currentUser.avatar;
      loadUserRole().then(() => {
        loadAllUsers();
        loadApplications();
      });
    } else {
      document.getElementById('authContainer').style.display = 'flex';
      document.getElementById('mainContainer').style.display = 'none';
      handleAuthCallback();
    }
  }

  document.getElementById('authBtn').onclick = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=1494686473520287774&redirect_uri=${encodeURIComponent('https://style42124.github.io/lscsd/panel.html')}&response_type=token&scope=identify`;
  };
  document.getElementById('backToMainBtn').onclick = () => window.location.href = '/lscsd/';
  document.getElementById('userSearch')?.addEventListener('input', () => renderUsers());

  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
      if (btn.dataset.tab === 'users') renderUsers();
      if (btn.dataset.tab === 'applications') renderApplications();
    };
  });

  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderApplications();
    };
  });

  checkAuth();
})();
