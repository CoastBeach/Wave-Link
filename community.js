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
        inner = '<div class="loading-state" id="activityLoading"><div class="spinner" aria-hidden="true"></div>Loading your play time…</div><div id="activityInfo" hidden></div>';
      } else if (t.key === 'actions'){
        inner = emptyTabHtml('Not built yet', 'Your own warnings and active/inactive status will show up here.');
      } else if (t.key === 'servers'){
        inner = '<div class="loading-state" id="serversLoading"><div class="spinner" aria-hidden="true"></div>Loading live servers…</div><div id="serversList" hidden></div>';
      } else if (t.key === 'sessions'){
        inner = emptyTabHtml('Needs Connections first', 'Session scheduling and hosting will appear here once this community is connected to a Roblox game.');
      } else if (t.key === 'connections'){
        inner = '<div class="loading-state" id="connectionsLoading"><div class="spinner" aria-hidden="true"></div>Loading setup info…</div><div id="connectionsInfo" hidden></div>';
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

    loadServers(data.id);
    loadActivity(data.id);
    if (data.isOwner){ loadConnectionInfo(data.id); }
  }

  function formatDuration(totalSeconds){
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0 && minutes === 0) return 'Less than a minute';
    var parts = [];
    if (hours > 0) parts.push(hours + (hours === 1 ? ' hour' : ' hours'));
    if (minutes > 0) parts.push(minutes + (minutes === 1 ? ' minute' : ' minutes'));
    return parts.join(' ');
  }

  async function loadActivity(communityId){
    var loadingEl = document.getElementById('activityLoading');
    var infoEl = document.getElementById('activityInfo');
    if (!loadingEl || !infoEl) return;

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/activity', {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var activityData = await res.json();
      loadingEl.hidden = true;
      infoEl.hidden = false;

      if (!res.ok){
        infoEl.innerHTML = '<div class="error-state">' + escapeHtml(activityData.error || "Couldn't load activity.") + '</div>';
        return;
      }

      infoEl.innerHTML =
        '<div class="panel-card">' +
          '<div class="panel-card-head"><h3>Your play time</h3></div>' +
          '<p style="font-size:22px; font-family: var(--font-display); font-weight:700; margin:0;">' + escapeHtml(formatDuration(activityData.totalSeconds || 0)) + '</p>' +
          '<p style="font-size:12.5px; color: var(--text-faint); margin-top:8px;">Tracked automatically while you\'re in a server running this community\'s Connections script.</p>' +
        '</div>';
    } catch(e){
      loadingEl.hidden = true;
      infoEl.hidden = false;
      infoEl.innerHTML = '<div class="error-state">Could not reach WaveLink.</div>';
    }
  }

  async function loadServers(communityId){
    var loadingEl = document.getElementById('serversLoading');
    var listEl = document.getElementById('serversList');
    if (!loadingEl || !listEl) return;

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/servers', {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var data = await res.json();
      loadingEl.hidden = true;
      listEl.hidden = false;

      if (!res.ok){
        listEl.innerHTML = '<div class="error-state">' + escapeHtml(data.error || "Couldn't load servers.") + '</div>';
        return;
      }

      var servers = data.servers || [];
      if (servers.length === 0){
        listEl.innerHTML = emptyTabHtml('No live servers', "No servers have reported in yet. Make sure the Connections script is running in your game.");
        return;
      }

      var html = '<div class="groups-list">';
      servers.forEach(function(s){
        html +=
          '<div class="group-card">' +
            '<div class="group-icon placeholder"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div>' +
            '<div class="group-info">' +
              '<div class="name">Server ' + escapeHtml(s.serverId.slice(0, 8)) + '…</div>' +
              '<div class="meta"><span>' + s.playerCount + ' player' + (s.playerCount === 1 ? '' : 's') + '</span></div>' +
            '</div>' +
            (s.placeId ? '<a href="https://www.roblox.com/games/' + encodeURIComponent(s.placeId) + '" target="_blank" rel="noopener" class="btn btn-ghost">Open Game</a>' : '') +
          '</div>';
      });
      html += '</div><p style="font-size:12.5px; color: var(--text-faint); margin-top:14px;">Joining this exact server from the browser isn\'t reliably possible on Roblox\'s side — once in-game \'joinserver\' commands are set up, players can jump straight to a specific server by its ID.</p>';
      listEl.innerHTML = html;
    } catch(e){
      loadingEl.hidden = true;
      listEl.hidden = false;
      listEl.innerHTML = '<div class="error-state">Could not reach WaveLink.</div>';
    }
  }

  async function loadConnectionInfo(communityId){
    var loadingEl = document.getElementById('connectionsLoading');
    var infoEl = document.getElementById('connectionsInfo');
    if (!loadingEl || !infoEl) return;

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/connection-info', {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var data = await res.json();
      loadingEl.hidden = true;
      infoEl.hidden = false;

      if (!res.ok){
        infoEl.innerHTML = '<div class="error-state">' + escapeHtml(data.error || "Couldn't load setup info.") + '</div>';
        return;
      }

      var script =
        'local HttpService = game:GetService("HttpService")\n' +
        'local Players = game:GetService("Players")\n\n' +
        'local WORKER_URL = "' + WORKER_URL + '"\n' +
        'local CONNECTION_SECRET = "' + data.connectionSecret + '"\n' +
        'local HEARTBEAT_INTERVAL_SECONDS = 20\n\n' +
        'local function sendHeartbeat()\n' +
        '\tif game.JobId == "" then return end\n' +
        '\tlocal playerList = {}\n' +
        '\tfor _, player in ipairs(Players:GetPlayers()) do\n' +
        '\t\ttable.insert(playerList, { userId = player.UserId, username = player.Name, displayName = player.DisplayName })\n' +
        '\tend\n' +
        '\tlocal payload = { connectionSecret = CONNECTION_SECRET, serverId = game.JobId, placeId = game.PlaceId, players = playerList }\n' +
        '\tpcall(function()\n' +
        '\t\tHttpService:PostAsync(WORKER_URL .. "/api/connections/heartbeat", HttpService:JSONEncode(payload), Enum.HttpContentType.ApplicationJson)\n' +
        '\tend)\n' +
        'end\n\n' +
        'while true do\n' +
        '\tsendHeartbeat()\n' +
        '\ttask.wait(HEARTBEAT_INTERVAL_SECONDS)\n' +
        'end';

      infoEl.innerHTML =
        '<div class="panel-card">' +
          '<div class="panel-card-head"><h3>Setup instructions</h3></div>' +
          '<ol class="verify-steps" style="margin-bottom:18px;">' +
            '<li><span class="n">1</span> In Studio: Home &gt; Game Settings &gt; Security &gt; turn on "Allow HTTP Requests".</li>' +
            '<li><span class="n">2</span> Insert a Script into ServerScriptService in your game.</li>' +
            '<li><span class="n">3</span> Paste the script below into it exactly as shown — your secret is already filled in.</li>' +
            '<li><span class="n">4</span> Publish your game. The Servers tab will start showing live data within about 20 seconds of someone joining.</li>' +
          '</ol>' +
          '<div class="bio-phrase" id="connectionScriptBox" style="text-align:left; white-space:pre-wrap; font-size:12px; cursor:pointer;" title="Click to copy">' + escapeHtml(script) + '</div>' +
        '</div>';

      var scriptBox = document.getElementById('connectionScriptBox');
      if (scriptBox){
        scriptBox.addEventListener('click', function(){
          if (navigator.clipboard) navigator.clipboard.writeText(script);
        });
      }
    } catch(e){
      loadingEl.hidden = true;
      infoEl.hidden = false;
      infoEl.innerHTML = '<div class="error-state">Could not reach WaveLink.</div>';
    }
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
