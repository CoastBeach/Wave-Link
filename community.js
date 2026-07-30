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
        inner = '<div class="loading-state" id="actionsLoading"><div class="spinner" aria-hidden="true"></div>Loading your record…</div><div id="actionsInfo" hidden></div>';
      } else if (t.key === 'servers'){
        inner = '<div class="loading-state" id="serversLoading"><div class="spinner" aria-hidden="true"></div>Loading live servers…</div><div id="serversList" hidden></div>';
      } else if (t.key === 'sessions'){
        inner = '<div class="loading-state" id="sessionsLoading"><div class="spinner" aria-hidden="true"></div>Loading Sessions…</div><div id="sessionsInfo" hidden></div>';
      } else if (t.key === 'connections'){
        inner = '<div class="loading-state" id="connectionsLoading"><div class="spinner" aria-hidden="true"></div>Loading setup info…</div><div id="connectionsInfo" hidden></div>';
      } else if (t.key === 'moderation'){
        inner =
          '<div class="panel-card">' +
            '<div class="panel-card-head"><h3>Issue action</h3></div>' +
            '<div class="bio-username-field"><label for="modTargetUsername">Roblox username</label><input type="text" id="modTargetUsername" placeholder="username" autocomplete="off"></div>' +
            '<div class="bio-username-field"><label for="modReason">Reason</label><input type="text" id="modReason" placeholder="Reason for this action" autocomplete="off"></div>' +
            '<div style="display:flex; gap:10px; margin-bottom: 6px;">' +
              '<button class="btn btn-ghost" id="modIssueWarningBtn" type="button" style="flex:1;">Give Warning</button>' +
              '<button class="btn btn-primary" id="modIssueBanBtn" type="button" style="flex:1; background: linear-gradient(135deg, #ff8a8a, #ff5a5a); color:#2a0a0a;">Ban</button>' +
            '</div>' +
            '<div class="verify-status" id="modIssueStatus" style="display:none;"><span class="spinner" aria-hidden="true"></span><span id="modIssueStatusText"></span></div>' +
          '</div>' +
          '<div class="loading-state" id="modLogLoading"><div class="spinner" aria-hidden="true"></div>Loading moderation log…</div>' +
          '<div id="modLogList" hidden></div>';
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
    loadActions(data.id);
    loadSessions(data.id, data);
    if (data.isOwner){ loadConnectionInfo(data.id); }
    if (data.isEditor){ loadModerationLog(data.id); wireModerationForm(data.id); }
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

  async function loadActions(communityId){
    var loadingEl = document.getElementById('actionsLoading');
    var infoEl = document.getElementById('actionsInfo');
    if (!loadingEl || !infoEl) return;

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/actions', {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var actionData = await res.json();
      loadingEl.hidden = true;
      infoEl.hidden = false;

      if (!res.ok){
        infoEl.innerHTML = '<div class="error-state">' + escapeHtml(actionData.error || "Couldn't load your record.") + '</div>';
        return;
      }

      var statusHtml = actionData.isBanned
        ? '<span class="badge" style="background: rgba(255,90,90,0.12); color:#ff8a8a; border:1px solid rgba(255,90,90,0.28);">Banned</span>'
        : '<span class="badge badge-success">Active</span>';

      var listHtml = '';
      if (!actionData.actions || actionData.actions.length === 0){
        listHtml = '<p style="font-size:13.5px; color: var(--text-dim);">No warnings or bans on your record.</p>';
      } else {
        listHtml = '<div class="activity-list">' + actionData.actions.map(function(a){
          var label = a.type === 'ban' ? 'Ban' : 'Warning';
          var revokedTag = a.revoked ? ' <span style="color: var(--text-faint);">(revoked)</span>' : '';
          return '<div class="activity-row"><span class="activity-dot" aria-hidden="true"></span><div class="txt"><b>' + escapeHtml(label) + '</b>' + revokedTag + ': ' + escapeHtml(a.reason) + '<div class="time">' + new Date(a.createdAt).toLocaleString() + '</div></div></div>';
        }).join('') + '</div>';
      }

      infoEl.innerHTML =
        '<div class="panel-card">' +
          '<div class="panel-card-head"><h3>Your standing</h3>' + statusHtml + '</div>' +
          listHtml +
        '</div>';
    } catch(e){
      loadingEl.hidden = true;
      infoEl.hidden = false;
      infoEl.innerHTML = '<div class="error-state">Could not reach WaveLink.</div>';
    }
  }

  function renderModerationLog(actions){
    var listEl = document.getElementById('modLogList');
    if (!listEl) return;

    if (!actions || actions.length === 0){
      listEl.innerHTML = emptyTabHtml('No actions yet', 'Warnings and bans you issue will appear here.');
      return;
    }

    listEl.innerHTML = '<div class="panel-card"><div class="panel-card-head"><h3>Moderation log</h3></div><div class="member-list">' +
      actions.map(function(a){
        var label = a.type === 'ban' ? 'Ban' : 'Warning';
        var revokeBtn = a.revoked
          ? '<span style="color: var(--text-faint); font-size:12px;">Revoked</span>'
          : '<button class="btn btn-ghost" data-revoke-id="' + escapeHtml(a.id) + '" style="padding:6px 10px; font-size:12px;">Revoke</button>';
        return '<div class="member-row"><div><b>' + escapeHtml(a.targetUsername) + '</b> — ' + escapeHtml(label) + ': ' + escapeHtml(a.reason) +
          '<div style="font-size:11px; color: var(--text-faint);">by ' + escapeHtml(a.issuedByUsername) + ' · ' + new Date(a.createdAt).toLocaleString() + '</div></div>' + revokeBtn + '</div>';
      }).join('') +
    '</div></div>';

    listEl.querySelectorAll('[data-revoke-id]').forEach(function(btn){
      btn.addEventListener('click', function(){ revokeModeration(communityId, btn.getAttribute('data-revoke-id')); });
    });
  }

  async function loadModerationLog(communityId){
    var loadingEl = document.getElementById('modLogLoading');
    var listEl = document.getElementById('modLogList');
    if (!loadingEl || !listEl) return;

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/moderation/log', {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var data = await res.json();
      loadingEl.hidden = true;
      listEl.hidden = false;

      if (!res.ok){
        listEl.innerHTML = '<div class="error-state">' + escapeHtml(data.error || "Couldn't load the moderation log.") + '</div>';
        return;
      }
      renderModerationLog(data.actions);
    } catch(e){
      loadingEl.hidden = true;
      listEl.hidden = false;
      listEl.innerHTML = '<div class="error-state">Could not reach WaveLink.</div>';
    }
  }

  async function revokeModeration(communityId, actionId){
    try{
      await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/moderation/' + encodeURIComponent(actionId) + '/revoke', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      loadModerationLog(communityId);
    } catch(e){ /* silently ignore — log stays as-is, they can retry */ }
  }

  function wireModerationForm(communityId){
    var usernameInput = document.getElementById('modTargetUsername');
    var reasonInput = document.getElementById('modReason');
    var warningBtn = document.getElementById('modIssueWarningBtn');
    var banBtn = document.getElementById('modIssueBanBtn');
    var statusBox = document.getElementById('modIssueStatus');
    var statusText = document.getElementById('modIssueStatusText');
    if (!warningBtn || !banBtn) return;

    async function issue(type){
      var username = usernameInput.value.trim();
      var reason = reasonInput.value.trim();
      if (!username || !reason){
        statusBox.style.display = 'flex';
        statusBox.classList.add('error');
        statusText.textContent = 'Enter a username and reason first.';
        return;
      }

      statusBox.style.display = 'flex';
      statusBox.classList.remove('error', 'success');
      statusText.textContent = 'Submitting…';
      warningBtn.disabled = true;
      banBtn.disabled = true;

      try{
        var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/moderation/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
          body: JSON.stringify({ targetUsername: username, type: type, reason: reason })
        });
        var data = await res.json();

        if (!res.ok){
          statusBox.classList.add('error');
          statusText.textContent = data.error || 'Could not issue this action.';
        } else {
          statusBox.classList.add('success');
          statusText.textContent = 'Done — ' + type + ' issued to ' + data.targetUsername + '.';
          usernameInput.value = '';
          reasonInput.value = '';
          loadModerationLog(communityId);
        }
      } catch(e){
        statusBox.classList.add('error');
        statusText.textContent = 'Network error — try again.';
      }
      warningBtn.disabled = false;
      banBtn.disabled = false;
    }

    warningBtn.addEventListener('click', function(){ issue('warning'); });
    banBtn.addEventListener('click', function(){ issue('ban'); });
  }

  async function loadSessions(communityId, communityData){
    var loadingEl = document.getElementById('sessionsLoading');
    var infoEl = document.getElementById('sessionsInfo');
    if (!loadingEl || !infoEl) return;

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/session-types', {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var typesData = await res.json();
      loadingEl.hidden = true;
      infoEl.hidden = false;

      if (!res.ok){
        infoEl.innerHTML = '<div class="error-state">' + escapeHtml(typesData.error || "Couldn't load Sessions.") + '</div>';
        return;
      }

      renderSessions(communityId, communityData, typesData.sessionTypes || []);
    } catch(e){
      loadingEl.hidden = true;
      infoEl.hidden = false;
      infoEl.innerHTML = '<div class="error-state">Could not reach WaveLink.</div>';
    }
  }

  function renderSessions(communityId, communityData, sessionTypes){
    var infoEl = document.getElementById('sessionsInfo');
    var canManage = communityData.isOwner || communityData.canManageSessions;
    var html = '';

    if (communityData.isOwner){
      var roles = communityData.groupRoles || [];
      function checkboxGroup(prefix, ranks){
        return roles.map(function(r){
          var checked = ranks.includes(r.rank) ? 'checked' : '';
          return '<label style="display:flex; align-items:center; gap:8px; font-size:13px; color: var(--text-dim); margin-bottom:6px;">' +
            '<input type="checkbox" class="' + prefix + '-rank-checkbox" value="' + r.rank + '" ' + checked + '> ' + escapeHtml(r.name) +
          '</label>';
        }).join('');
      }

      html +=
        '<div class="panel-card">' +
          '<div class="panel-card-head"><h3>Session Permissions</h3></div>' +
          '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:16px; margin-bottom:16px;">' +
            '<div><b style="font-size:12.5px; color: var(--text);">Can Manage</b><div style="margin-top:8px;">' + checkboxGroup('manage', communityData.manageRanks || []) + '</div></div>' +
            '<div><b style="font-size:12.5px; color: var(--text);">Can Host</b><div style="margin-top:8px;">' + checkboxGroup('host', communityData.hostRanks || []) + '</div></div>' +
            '<div><b style="font-size:12.5px; color: var(--text);">Can Supervise</b><div style="margin-top:8px;">' + checkboxGroup('supervise', communityData.superviseRanks || []) + '</div></div>' +
          '</div>' +
          '<button class="btn btn-primary" id="saveSessionPermsBtn" type="button">Save Permissions</button>' +
          '<div class="verify-status" id="sessionPermsStatus" style="display:none; margin-top:10px;"><span class="spinner" aria-hidden="true"></span><span id="sessionPermsStatusText"></span></div>' +
        '</div>';
    }

    if (canManage){
      html +=
        '<div class="panel-card">' +
          '<div class="panel-card-head"><h3>Session Types (' + sessionTypes.length + '/10)</h3></div>';

      if (sessionTypes.length === 0){
        html += '<p style="font-size:13.5px; color: var(--text-dim); margin-bottom:16px;">No session types yet.</p>';
      } else {
        html += '<div class="member-list" style="margin-bottom:18px;">' + sessionTypes.map(function(st){
          return '<div class="member-row"><div><b>' + escapeHtml(st.name) + '</b><div style="font-size:12px; color: var(--text-faint);">' +
            st.phases.map(function(p){ return escapeHtml(p.name); }).join(' → ') +
          '</div></div><button class="btn btn-ghost" data-delete-type="' + escapeHtml(st.id) + '" style="padding:6px 10px; font-size:12px;">Delete</button></div>';
        }).join('') + '</div>';
      }

      if (sessionTypes.length < 10){
        html +=
          '<div class="bio-username-field"><label for="newTypeName">New session type name</label><input type="text" id="newTypeName" placeholder="e.g. Training Session"></div>' +
          '<div class="bio-username-field"><label for="newTypePhases">Phases, in order (comma separated, up to 10)</label><input type="text" id="newTypePhases" placeholder="e.g. Introduction, Q&A, Final Evaluation"></div>' +
          '<button class="btn btn-primary" id="createTypeBtn" type="button">Create Session Type</button>' +
          '<div class="verify-status" id="createTypeStatus" style="display:none; margin-top:10px;"><span class="spinner" aria-hidden="true"></span><span id="createTypeStatusText"></span></div>';
      }
      html += '</div>';
      html += emptyTabHtml('Coming next', 'Hosting a live session (picking a type, sending a server ID, running phases, promoting and grading) is the next piece to build.');
    } else {
      html = emptyTabHtml('No access yet', "You don't have Session management access in this community. Ask the owner to grant it in Session Permissions.");
    }

    infoEl.innerHTML = html;

    var savePermsBtn = document.getElementById('saveSessionPermsBtn');
    if (savePermsBtn){
      savePermsBtn.addEventListener('click', function(){ saveSessionPermissions(communityId); });
    }
    var createTypeBtn = document.getElementById('createTypeBtn');
    if (createTypeBtn){
      createTypeBtn.addEventListener('click', function(){ createSessionType(communityId, communityData); });
    }
    infoEl.querySelectorAll('[data-delete-type]').forEach(function(btn){
      btn.addEventListener('click', function(){ deleteSessionType(communityId, communityData, btn.getAttribute('data-delete-type')); });
    });
  }

  async function saveSessionPermissions(communityId){
    var statusBox = document.getElementById('sessionPermsStatus');
    var statusText = document.getElementById('sessionPermsStatusText');
    statusBox.style.display = 'flex';
    statusBox.classList.remove('error', 'success');
    statusText.textContent = 'Saving…';

    function collect(prefix){
      return Array.prototype.map.call(
        document.querySelectorAll('.' + prefix + '-rank-checkbox:checked'),
        function(cb){ return Number(cb.value); }
      );
    }

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/session-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ manageRanks: collect('manage'), hostRanks: collect('host'), superviseRanks: collect('supervise') })
      });
      if (!res.ok){
        var data = await res.json();
        statusBox.classList.add('error');
        statusText.textContent = data.error || 'Could not save.';
        return;
      }
      statusBox.classList.add('success');
      statusText.textContent = 'Saved!';
    } catch(e){
      statusBox.classList.add('error');
      statusText.textContent = 'Network error — try again.';
    }
  }

  async function createSessionType(communityId, communityData){
    var nameInput = document.getElementById('newTypeName');
    var phasesInput = document.getElementById('newTypePhases');
    var statusBox = document.getElementById('createTypeStatus');
    var statusText = document.getElementById('createTypeStatusText');

    var name = nameInput.value.trim();
    var phaseNames = phasesInput.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);

    if (!name || phaseNames.length === 0){
      statusBox.style.display = 'flex';
      statusBox.classList.add('error');
      statusText.textContent = 'Enter a name and at least one phase.';
      return;
    }

    statusBox.style.display = 'flex';
    statusBox.classList.remove('error', 'success');
    statusText.textContent = 'Creating…';

    try{
      var res = await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/session-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ name: name, phaseNames: phaseNames })
      });
      var data = await res.json();
      if (!res.ok){
        statusBox.classList.add('error');
        statusText.textContent = data.error || 'Could not create session type.';
        return;
      }
      loadSessions(communityId, communityData);
    } catch(e){
      statusBox.classList.add('error');
      statusText.textContent = 'Network error — try again.';
    }
  }

  async function deleteSessionType(communityId, communityData, typeId){
    try{
      await fetch(WORKER_URL + '/api/communities/' + encodeURIComponent(communityId) + '/session-types/' + encodeURIComponent(typeId), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      loadSessions(communityId, communityData);
    } catch(e){ /* they can retry */ }
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
