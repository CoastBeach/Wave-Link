/*
  WaveLink — Community detail page
  ---------------------------------------------------------------
  Fetches one community (by ?id= in the URL) from the Worker, along
  with the logged-in user's rank/role in that Roblox group, then
  renders the big header + tab navigation.

  Only the Home tab has real content right now. The rest are honest
  "not built yet" placeholders — see /areas roadmap for build order
  (Connections needs to exist before Sessions/Servers can be real).

  SETUP REQUIRED: set WORKER_URL to your deployed Worker's URL.
*/
(function(){
  "use strict";

  var WORKER_URL = "https://wavelink-verify.waveware-wavelink.workers.dev";

  var session = window.WaveLinkSession;
  if (!session) return;

  var container = document.getElementById('communityContainer');
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var communityId = params.get('id');

  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function renderError(message){
    container.innerHTML = '<div class="error-state">' + escapeHtml(message) + '</div>';
  }

  function getPrimaryId(){
    try { return localStorage.getItem('wavelink_primary_community'); } catch(e){ return null; }
  }
  function setPrimaryId(id){
    try { localStorage.setItem('wavelink_primary_community', id); } catch(e){}
  }

  var TABS = [
    { key: 'home', label: 'Home' },
    { key: 'activity', label: 'Activity' },
    { key: 'actions', label: 'Actions' },
    { key: 'servers', label: 'Servers' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'connections', label: 'Connections', ownerOnly: true },
    { key: 'moderation', label: 'Moderation', editorOnly: true }
  ];

  function emptyTabHtml(tag, text){
    return '<div class="empty-tab"><span class="tag">' + escapeHtml(tag) + '</span><p>' + escapeHtml(text) + '</p></div>';
  }

  function render(data){
    var displayName = session.robloxDisplayName || session.robloxUsername;
    var isPrimary = getPrimaryId() === data.id;

    var iconHtml = data.iconUrl
      ? '<img class="community-hero-icon" src="' + escapeHtml(data.iconUrl) + '" alt="">'
      : '<div class="community-hero-icon placeholder"><svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.7"/></svg></div>';

    var roleBadgeHtml = data.isOwner
      ? '<span class="role-badge owner">Owner</span>'
      : (data.callerRoleName ? '<span class="role-badge">' + escapeHtml(data.callerRoleName) + '</span>' : '');

    var visibleTabs = TABS.filter(function(t){
      if (t.ownerOnly && !data.isOwner) return false;
      if (t.editorOnly && !data.isEditor) return false;
      return true;
    });

    var tabsHtml = visibleTabs.map(function(t, i){
      return '<button class="community-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + t.key + '">' + escapeHtml(t.label) + '</button>';
    }).join('');

    var panelsHtml = visibleTabs.map(function(t, i){
      var inner;
      if (t.key === 'home'){
        inner =
          '<div class="welcome-card">' +
            '<div class="avatar-lg">' + (session.avatarUrl ? '<img src="' + escapeHtml(session.avatarUrl) + '" alt="">' : '') + '</div>' +
            '<h2>Welcome @' + escapeHtml(displayName) + ' to @' + escapeHtml(data.groupName) + '</h2>' +
            '<p>' + (data.isOwner ? "You own this community." : (data.callerRoleName ? "Your rank: " + escapeHtml(data.callerRoleName) : "")) + '</p>' +
          '</div>';
      } else if (t.key === 'activity'){
        inner = emptyTabHtml('Not built yet', "Play-time tracking will appear here once the Connections script is set up for this group's game.");
      } else if (t.key === 'actions'){
        inner = emptyTabHtml('Not built yet', 'Your own warnings and active/inactive status will show up here.');
      } else if (t.key === 'servers'){
        inner = emptyTabHtml('Needs Connections first', 'Live game servers and player counts will show here once this community is connected to a Roblox game.');
      } else if (t.key === 'sessions'){
        inner = emptyTabHtml('Needs Connections first', 'Session scheduling and hosting will appear here once this community is connected to a Roblox game.');
      } else if (t.key === 'connections'){
        inner = emptyTabHtml('Coming next', "This is where you'll get the script to paste into your Roblox game to connect it to WaveLink.");
      } else if (t.key === 'moderation'){
        inner = emptyTabHtml('Not built yet', 'Warnings and bans (with reasons) will be managed here.');
      }
      return '<div class="tab-panel' + (i === 0 ? ' active' : '') + '" data-panel="' + t.key + '">' + inner + '</div>';
    }).join('');

    container.innerHTML =
      '<div class="community-hero">' +
        iconHtml +
        '<div class="community-hero-info">' +
          '<h1>' + escapeHtml(data.groupName) + '</h1>' +
          '<div class="community-hero-meta">' +
            (data.memberCount != null ? '<span>' + data.memberCount.toLocaleString() + ' members</span><span class="dot"></span>' : '') +
            roleBadgeHtml +
          '</div>' +
        '</div>' +
        '<button class="primary-btn' + (isPrimary ? ' is-primary' : '') + '" id="primaryBtn" type="button">' +
          '<svg viewBox="0 0 24 24" fill="' + (isPrimary ? 'currentColor' : 'none') + '"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21 7.5 13.5 2 9h7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
          (isPrimary ? 'Primary' : 'Set as Primary') +
        '</button>' +
      '</div>' +
      '<div class="community-tabs">' + tabsHtml + '</div>' +
      panelsHtml;

    var primaryBtn = document.getElementById('primaryBtn');
    if (primaryBtn){
      primaryBtn.addEventListener('click', function(){
        setPrimaryId(data.id);
        primaryBtn.classList.add('is-primary');
        primaryBtn.querySelector('svg').setAttribute('fill', 'currentColor');
        primaryBtn.lastChild.textContent = 'Primary';
      });
    }

    container.querySelectorAll('.community-tab').forEach(function(tabBtn){
      tabBtn.addEventListener('click', function(){
        var key = tabBtn.getAttribute('data-tab');
        container.querySelectorAll('.community-tab').forEach(function(b){ b.classList.remove('active'); });
        container.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
        tabBtn.classList.add('active');
        var panel = container.querySelector('.tab-panel[data-panel="' + key + '"]');
        if (panel) panel.classList.add('active');
      });
    });
  }

  async function load(){
    if (!communityId){
      renderError('No community specified.');
      return;
    }
    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId), {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      if (res.status === 401){
        try{ localStorage.removeItem('wavelink_demo_session'); } catch(e){}
        window.location.href = 'login.html';
        return;
      }
      var data = await res.json();
      if (!res.ok){
        renderError(data.error || "Couldn't load this community.");
        return;
      }
      render(data);
    } catch(e){
      renderError("Couldn't reach WaveLink — please try again shortly.");
    }
  }

  load();
})();
