<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>LSCSD — Панель управления</title>
  <link rel="icon" type="image/png" href="/lscsd/file.png">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: #0a0c10;
      min-height: 100vh;
    }

    /* PRELOADER */
    .preloader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #0a0c10;
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    }
    .badge-container {
      position: relative;
      width: 200px;
      height: 200px;
      margin-bottom: 30px;
      animation: badgeGlow 1.5s ease-in-out infinite;
    }
    .badge-star {
      position: absolute;
      width: 200px;
      height: 200px;
      background: linear-gradient(145deg, #d4af37, #b8962a);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      animation: badgeSpin 2s ease-in-out infinite;
    }
    .badge-inner {
      position: absolute;
      top: 25px;
      left: 25px;
      width: 150px;
      height: 150px;
      background: linear-gradient(135deg, #1a1a2e, #0f121a);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }
    .badge-text {
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Orbitron', monospace;
      font-size: 14px;
      font-weight: 800;
      color: #d4af37;
      text-align: center;
      letter-spacing: 2px;
    }
    .badge-text span {
      font-size: 10px;
      display: block;
      margin-top: 5px;
    }
    .siren-glow {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
    }
    .siren-glow-light {
      width: 20px;
      height: 20px;
      background: #ff0000;
      border-radius: 50%;
      animation: sirenPulse 0.4s infinite;
      box-shadow: 0 0 15px #ff0000;
    }
    .siren-glow-light:nth-child(2) {
      background: #0066ff;
      animation-delay: 0.2s;
      box-shadow: 0 0 15px #0066ff;
    }
    @keyframes badgeGlow {
      0%, 100% { filter: drop-shadow(0 0 5px #d4af37); }
      50% { filter: drop-shadow(0 0 25px #d4af37); }
    }
    @keyframes badgeSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes sirenPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.3); }
    }
    .orbiting-particle {
      position: absolute;
      width: 6px;
      height: 6px;
      background: #d4af37;
      border-radius: 50%;
    }
    .particle1 { top: -30px; left: 50%; animation: orbit1 2s linear infinite; }
    .particle2 { top: 50%; right: -30px; animation: orbit2 2s linear infinite; }
    .particle3 { bottom: -30px; left: 50%; animation: orbit3 2s linear infinite; }
    .particle4 { top: 50%; left: -30px; animation: orbit4 2s linear infinite; }
    @keyframes orbit1 {
      0% { transform: translate(0, 0); opacity: 1; }
      50% { transform: translate(30px, 30px); opacity: 0.5; }
      100% { transform: translate(0, 0); opacity: 1; }
    }
    @keyframes orbit2 {
      0% { transform: translate(0, 0); opacity: 1; }
      50% { transform: translate(-30px, 30px); opacity: 0.5; }
      100% { transform: translate(0, 0); opacity: 1; }
    }
    @keyframes orbit3 {
      0% { transform: translate(0, 0); opacity: 1; }
      50% { transform: translate(-30px, -30px); opacity: 0.5; }
      100% { transform: translate(0, 0); opacity: 1; }
    }
    @keyframes orbit4 {
      0% { transform: translate(0, 0); opacity: 1; }
      50% { transform: translate(30px, -30px); opacity: 0.5; }
      100% { transform: translate(0, 0); opacity: 1; }
    }
    .preloader-logo {
      font-size: 1.8rem;
      font-weight: 800;
      font-family: 'Orbitron', monospace;
      letter-spacing: 6px;
      background: linear-gradient(135deg, #d4af37, #f5e7a3);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin-top: 20px;
      opacity: 0;
      animation: fadeInText 0.8s 1s forwards;
    }
    .preloader-text {
      color: #6b6f78;
      font-size: 0.75rem;
      margin-top: 10px;
      opacity: 0;
      animation: fadeInText 0.8s 1.2s forwards;
    }
    .preloader-progress {
      width: 240px;
      height: 2px;
      background: rgba(212, 175, 55, 0.2);
      border-radius: 10px;
      margin-top: 15px;
      overflow: hidden;
      opacity: 0;
      animation: fadeInText 0.8s 1.4s forwards;
    }
    .preloader-progress-bar {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #d4af37, #f5e7a3);
      transition: width 0.1s linear;
    }
    @keyframes fadeInText {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* NAVBAR */
    .navbar {
      background: rgba(13, 17, 23, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
      padding: 12px 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .nav-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(145deg, #d4af37, #b8962a);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }
    .nav-title-main {
      font-size: 1.2rem;
      font-weight: 800;
      font-family: 'Orbitron';
      background: linear-gradient(135deg, #d4af37, #f5e7a3);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .nav-title-sub {
      font-size: 0.55rem;
      color: #6b6f78;
      display: block;
    }
    .nav-user {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(30, 35, 45, 0.9);
      padding: 5px 16px;
      border-radius: 40px;
      border: 1px solid rgba(212, 175, 55, 0.3);
    }
    .nav-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid #d4af37;
    }
    .nav-user span {
      color: #e8e8e8;
      font-weight: 500;
      font-size: 13px;
    }
    .back-btn {
      background: #d4af37;
      border: none;
      padding: 5px 12px;
      border-radius: 20px;
      cursor: pointer;
      color: #0f121a;
      font-weight: bold;
      margin-left: 10px;
    }

    /* AUTH */
    .auth-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
    .auth-card {
      background: rgba(20, 25, 35, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 35px;
      padding: 40px;
      text-align: center;
      max-width: 420px;
      width: 100%;
    }
    .auth-icon {
      font-size: 3.2rem;
      color: #5865F2;
    }
    .auth-title {
      font-size: 1.6rem;
      font-family: 'Orbitron';
      background: linear-gradient(135deg, #d4af37, #f5e7a3);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin: 10px 0;
    }
    .auth-btn {
      background: linear-gradient(135deg, #5865F2, #4752c4);
      border: none;
      padding: 12px 28px;
      border-radius: 40px;
      color: white;
      cursor: pointer;
      font-weight: 600;
    }

    /* MAIN */
    .main-container {
      flex: 1;
      padding: 30px;
    }
    .dashboard-header {
      text-align: center;
      margin-bottom: 35px;
    }
    .dashboard-title {
      font-size: 1.8rem;
      font-family: 'Orbitron';
      color: #d4af37;
    }
    .tabs {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 30px;
    }
    .tab-btn {
      background: rgba(20, 25, 35, 0.7);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 30px;
      padding: 10px 25px;
      cursor: pointer;
      color: #e8e8e8;
    }
    .tab-btn.active {
      background: #d4af37;
      color: #0f121a;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .search-box {
      max-width: 400px;
      margin: 0 auto 20px;
    }
    .search-box input {
      width: 100%;
      padding: 10px 15px;
      background: #0f121a;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 30px;
      color: #e8e8e8;
    }
    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .user-card {
      background: rgba(20, 25, 35, 0.7);
      border-radius: 20px;
      padding: 18px;
      border: 1px solid rgba(212, 175, 55, 0.3);
      transition: 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .user-card:hover {
      border-color: #d4af37;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .badge-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #d4af37, #b8962a);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #0f121a;
    }
    .user-role-tag {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      display: inline-block;
      margin-top: 8px;
    }
    .role-1 { background: #2c3e50; color: white; }
    .role-2, .role-3, .role-4, .role-5 { background: #16a085; color: white; }
    .role-6 { background: #8e44ad; color: white; }
    .role-7, .role-8, .role-9 { background: #c0392b; color: white; }
    .user-actions button {
      background: none;
      border: none;
      color: #d4af37;
      font-size: 1.2rem;
      cursor: pointer;
    }
    .app-list {
      max-height: 500px;
      overflow-y: auto;
    }
    .app-item {
      background: rgba(20, 25, 35, 0.5);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 10px;
      border-left: 3px solid #d4af37;
      cursor: pointer;
    }
    .app-item:hover {
      background: rgba(212, 175, 55, 0.1);
    }
    .app-status-pending { border-left-color: #ffa500; }
    .app-status-approved { border-left-color: #6bcf7f; }
    .app-status-rejected { border-left-color: #ff6b6b; }
    .filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .filter-btn {
      background: rgba(20, 25, 35, 0.7);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 20px;
      padding: 8px 16px;
      cursor: pointer;
      color: #e8e8e8;
    }
    .filter-btn.active {
      background: #d4af37;
      color: #0f121a;
    }
    .review-modal, .role-modal {
      display: none;
      position: fixed;
      z-index: 2000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      justify-content: center;
      align-items: center;
    }
    .review-content {
      background: linear-gradient(145deg, #1a1f2a, #0f121a);
      border-radius: 20px;
      max-width: 500px;
      width: 90%;
      padding: 25px;
      border: 1px solid #d4af37;
    }
    .role-select, .dept-select {
      width: 100%;
      padding: 10px;
      background: #0f121a;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      color: #e8e8e8;
      margin: 10px 0;
    }
    .btn-primary {
      background: #d4af37;
      border: none;
      padding: 10px 20px;
      border-radius: 30px;
      cursor: pointer;
      margin: 5px;
      font-weight: bold;
      color: #0f121a;
    }
    .btn-danger {
      background: #ff6b6b;
      border: none;
      padding: 10px 20px;
      border-radius: 30px;
      cursor: pointer;
      color: white;
    }
    .flex-buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
  </style>
</head>
<body>

<div class="preloader" id="preloader">
  <div class="badge-container">
    <div class="siren-glow"><div class="siren-glow-light"></div><div class="siren-glow-light"></div></div>
    <div class="badge-star"></div><div class="badge-inner"></div>
    <div class="badge-text">LSCSD<br><span>PANEL ADMIN</span></div>
  </div>
  <div class="preloader-logo">УПРАВЛЕНИЕ</div>
  <div class="preloader-text">Загрузка панели...</div>
  <div class="preloader-progress"><div class="preloader-progress-bar" id="preloaderProgress"></div></div>
</div>

<div class="app" id="app" style="display: none;">
  <nav class="navbar">
    <div class="nav-brand"><div class="nav-logo"></div><div><span class="nav-title-main">LSCSD PANEL</span><span class="nav-title-sub">УПРАВЛЕНИЕ ПЕРСОНАЛОМ</span></div></div>
    <div class="nav-user" id="navUser">
      <img id="navAvatar" class="nav-avatar"><span id="navName"></span>
      <span id="userRoleBadge" style="background:#d4af37;color:#0f121a;padding:2px 8px;border-radius:20px;font-size:12px;"></span>
      <button class="back-btn" id="backToMainBtn"><i class="fas fa-home"></i> На главную</button>
    </div>
  </nav>

  <div class="auth-container" id="authContainer">
    <div class="auth-card">
      <div class="auth-icon"><i class="fab fa-discord"></i></div>
      <h1 class="auth-title">Панель управления</h1>
      <p style="color:#9ca3af;margin-bottom:25px;">Авторизуйтесь через Discord</p>
      <button class="auth-btn" id="authBtn"><i class="fab fa-discord"></i> Войти через Discord</button>
    </div>
  </div>

  <div class="main-container" id="mainContainer" style="display: none;">
    <div class="dashboard-header"><h1 class="dashboard-title"><i class="fas fa-users-cog"></i> Управление отделом</h1></div>
    
    <div class="tabs">
      <button class="tab-btn active" data-tab="users">👥 Сотрудники</button>
      <button class="tab-btn" data-tab="applications">📋 Заявки</button>
    </div>
    
    <div id="users-tab" class="tab-content active">
      <div class="search-box"><input type="text" id="userSearch" placeholder="🔍 Поиск по имени или ID..."></div>
      <div class="users-grid" id="usersGrid"></div>
    </div>
    
    <div id="applications-tab" class="tab-content">
      <div class="filters" id="appFilters">
        <button class="filter-btn active" data-filter="all">Все заявки</button>
        <button class="filter-btn" data-filter="pending">На рассмотрении</button>
        <button class="filter-btn" data-filter="approved">Одобренные</button>
        <button class="filter-btn" data-filter="rejected">Отклоненные</button>
      </div>
      <div class="app-list" id="applicationsList"></div>
    </div>
  </div>
</div>

<div class="review-modal" id="reviewModal">
  <div class="review-content">
    <h3 style="color:#d4af37;margin-bottom:15px;"><i class="fas fa-gavel"></i> Рассмотрение заявки</h3>
    <div id="reviewAppData"></div>
    <select id="reviewStatus" style="width:100%;padding:10px;margin:10px 0;background:#0f121a;border:1px solid #d4af37;border-radius:12px;color:#e8e8e8;">
      <option value="approved">✅ Одобрить</option>
      <option value="rejected">❌ Отклонить</option>
    </select>
    <textarea id="reviewComment" rows="3" placeholder="Комментарий..." style="width:100%;padding:10px;background:#0f121a;border:1px solid #d4af37;border-radius:12px;color:#e8e8e8;"></textarea>
    <div class="flex-buttons">
      <button id="submitReviewBtn" class="btn-primary" style="flex:1;">Отправить решение</button>
      <button id="closeReviewBtn" class="btn-danger" style="flex:1;">Отмена</button>
    </div>
  </div>
</div>

<div class="role-modal" id="roleModal">
  <div class="review-content">
    <h3 style="color:#d4af37;"><i class="fas fa-user-tag"></i> Назначение роли</h3>
    <p id="roleTargetName" style="margin:10px 0;"></p>
    <select id="roleLevelSelect" class="role-select">
      <option value="1">Младший состав</option>
      <option value="2">Dep.Head (старший состав)</option>
      <option value="3">Head (старший состав)</option>
      <option value="4">Curator (старший состав)</option>
      <option value="5">Assist Sheriff</option>
      <option value="6">SK/Dep.SK</option>
      <option value="7">UnderSheriff</option>
      <option value="8">Sheriff</option>
      <option value="9">Разработчик</option>
    </select>
    <select id="roleDeptSelect" class="dept-select">
      <option value="">Без отдела</option>
      <option value="SAI">SAI</option>
      <option value="GU">GU</option>
      <option value="AF">AF</option>
      <option value="IAD">IAD</option>
      <option value="SEB">SEB</option>
      <option value="K9">K-9</option>
      <option value="DID">DID</option>
      <option value="MED">MED</option>
      <option value="SPD">SPD</option>
      <option value="HS">High Staff</option>
    </select>
    <div class="flex-buttons">
      <button id="saveRoleBtn" class="btn-primary" style="flex:1;">Сохранить</button>
      <button id="closeRoleBtn" class="btn-danger" style="flex:1;">Отмена</button>
    </div>
  </div>
</div>

<script src="js/panel.js"></script>
</body>
</html>
