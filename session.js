/*
  WaveLink — Session detail page (redesigned)
  ---------------------------------------------------------------
  Internal tabs:
    Main             — phase tabs, per-participant Passed/Exceptional,
                        Add Warning, End Phase, Conclude Session
    Manage Attendees — add/kick participants, change their role
    Grading          — (final phase only) rate other session staff 1-10
    Promote          — (final phase only) pick a participant's next rank

  Honest limitation: Promote and Grade are recorded in WaveLink only —
  they do not change anyone's real Roblox group rank yet. That needs a
  Roblox Open Cloud API key with group-management permission, which
  isn't wired up.

  SETUP REQUIRED: set WORKER_URL to your deployed Worker's URL.
*/
(function(){
  "use strict";

  var WORKER_URL = "https://wavelink-verify.waveware-wavelink.workers.dev";
  var SESSION_ROLES = ["attendee", "spectator", "supervisor", "ranker", "co-host", "helper"];
  var STAFF_ROLES = ["supervisor", "ranker", "co-host", "helper"];

  var session = window.WaveLinkSession;
  if (!session) return;

  var container = document.getElementById('sessionContainer');
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('id');
  var loadedCommunityId = null;
  var currentData = null;
  var activeInnerTab = 'main';

  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function renderError(message){
    container.innerHTML = '<div class="error-state">' + escapeHtml(message) + '</div>';
  }

  // ---------- Main render ----------

  function render(data){
    currentData = data;
    loadedCommunityId = data.communityId;

    var phaseTrackHtml = data.phaseNames.map(function(name, i){
      var cls = i === data.currentPhaseIndex ? 'current' : (i < data.currentPhaseIndex ? 'done' : '');
      return '<span class="phase-pill ' + cls + '">' + escapeHtml(name) + '</span>';
    }).join('');

    var statusLabel = data.status === 'grading' ? 'Grading' : (data.status === 'active' ? 'Active' : data.status);

    var innerTabs = [{ key: 'main', label: 'Main' }];
    if (data.canManageSession) innerTabs.push({ key: 'manage', label: 'Manage Attendees' });
    if (data.status === 'grading' && data.canManageSession){
      innerTabs.push({ key: 'grading', label: 'Grading' });
      innerTabs.push({ key: 'promote', label: 'Promote' });
    }
    if (!innerTabs.find(function(t){ return t.key === activeInnerTab; })) activeInnerTab = 'main';

    var tabsHtml = innerTabs.map(function(t){
      return '<button class="community-tab' + (t.key === activeInnerTab ? ' active' : '') + '" data-inner-tab="' + t.key + '">' + escapeHtml(t.label) + '</button>';
    }).join('');

    container.innerHTML =
      '<div class="session-hero">' +
        '<h1>' + escapeHtml(data.typeName) + '</h1>' +
        '<div class="meta">Hosted by ' + escapeHtml(data.hostUsername) + ' · Status: ' + escapeHtml(statusLabel) + (data.serverId ? ' · Server: ' + escapeHtml(data.serverId.slice(0, 12)) + '…' : '') + '</div>' +
        '<div class="phase-track">' + phaseTrackHtml + '</div>' +
      '</div>' +
      (innerTabs.length > 1 ? '<div class="community-tabs">' + tabsHtml + '</div>' : '') +
      '<div id="innerTabContent"></div>';

    container.querySelectorAll('[data-inner-tab]').forEach(function(btn){
      btn.addEventListener('click', function(){
        activeInnerTab = btn.getAttribute('data-inner-tab');
        render(currentData);
      });
    });

    renderInnerTab(data);
  }

  function renderInnerTab(data){
    var contentEl = document.getElementById('innerTabContent');
    if (!contentEl) return;

    if (activeInnerTab === 'main') renderMainTab(contentEl, data);
    else if (activeInnerTab === 'manage') renderManageTab(contentEl, data);
    else if (activeInnerTab === 'grading') renderGradingTab(contentEl, data);
    else if (activeInnerTab === 'promote') renderPromoteTab(contentEl, data);
  }

  // ---------- Main tab: phase running ----------

  function renderMainTab(contentEl, data){
    var rows = data.participants.length === 0
      ? '<p style="font-size:13.5px; color: var(--text-dim);">No participants added yet — add some from Manage Attendees.</p>'
      : data.participants.map(function(p){
          var statusControls = '';
          if (data.canManageSession && data.status === 'active'){
            statusControls =
              '<label class="pass-check"><input type="radio" name="phase-' + escapeHtml(p.id) + '" data-phase-status="' + escapeHtml(p.id) + '" value="none" ' + (p.currentPhaseStatus === 'none' ? 'checked' : '') + '> —</label>' +
              '<label class="pass-check" style="margin-left:10px;"><input type="radio" name="phase-' + escapeHtml(p.id) + '" data-phase-status="' + escapeHtml(p.id) + '" value="passed" ' + (p.currentPhaseStatus === 'passed' ? 'checked' : '') + '> Passed</label>' +
              '<label class="pass-check" style="margin-left:10px;"><input type="radio" name="phase-' + escapeHtml(p.id) + '" data-phase-status="' + escapeHtml(p.id) + '" value="exceptional" ' + (p.currentPhaseStatus === 'exceptional' ? 'checked' : '') + '> Exceptional</label>' +
              '<button class="btn btn-ghost" data-warn="' + escapeHtml(p.id) + '" style="margin-left:12px; padding:4px 10px; font-size:11px;">Add Warning</button>';
          } else {
            statusControls = '<span style="font-size:12px; color: var(--text-faint);">' + p.phasesPassed + '/' + data.totalPhases + ' passed' + (p.warnings > 0 ? ' · ' + p.warnings + ' warning' + (p.warnings === 1 ? '' : 's') : '') + (p.exceptional ? ' · Exceptional' : '') + '</span>';
          }
          return '<div class="participant-row">' +
            '<span class="name">' + escapeHtml(p.username) + '<span class="role-tag">' + escapeHtml(p.role) + '</span></span>' +
            '<span class="spacer"></span>' +
            statusControls +
          '</div>';
        }).join('');

    var actionsHtml = '';
    if (data.canManageSession){
      if (data.status === 'active'){
        actionsHtml += '<button class="btn btn-primary" id="endPhaseBtn" type="button">End Phase &amp; Advance</button>';
      }
      actionsHtml += '<button class="btn btn-ghost" id="cancelSessionBtn" type="button">Cancel Session</button>';
      if (data.status === 'grading'){
        actionsHtml += '<button class="btn btn-primary" id="concludeSessionBtn" type="button">Conclude Session</button>';
      }
    }

    contentEl.innerHTML =
      '<div class="panel-card">' +
        '<div class="panel-card-head"><h3>Participants (' + data.participants.length + ')</h3></div>' +
        rows +
      '</div>' +
      '<div class="session-actions" style="margin-top:4px;">' + actionsHtml + '</div>';

    contentEl.querySelectorAll('[data-phase-status]').forEach(function(radio){
      radio.addEventListener('change', function(){
        setPhaseStatus(radio.getAttribute('data-phase-status'), radio.value);
      });
    });
    contentEl.querySelectorAll('[data-warn]').forEach(function(btn){
      btn.addEventListener('click', function(){ warnParticipant(btn.getAttribute('data-warn')); });
    });

    var endPhaseBtn = document.getElementById('endPhaseBtn');
    if (endPhaseBtn) endPhaseBtn.addEventListener('click', endPhase);
    var cancelBtn = document.getElementById('cancelSessionBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelSession);
    var concludeBtn = document.getElementById('concludeSessionBtn');
    if (concludeBtn) concludeBtn.addEventListener('click', concludeSession);
  }

  // ---------- Manage Attendees tab ----------

  function renderManageTab(contentEl, data){
    var rows = data.participants.length === 0
      ? '<p style="font-size:13.5px; color: var(--text-dim);">No participants yet.</p>'
      : data.participants.map(function(p){
          var roleSelect = '<select data-role-select="' + escapeHtml(p.id) + '" style="padding:6px 8px; border-radius:8px; border:1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); font-size:12.5px;">' +
            SESSION_ROLES.map(function(r){ return '<option value="' + r + '" ' + (r === p.role ? 'selected' : '') + '>' + r + '</option>'; }).join('') +
          '</select>';
          return '<div class="participant-row">' +
            '<span class="name">' + escapeHtml(p.username) + '</span>' +
            '<span class="spacer"></span>' +
            roleSelect +
            '<button class="btn btn-ghost" data-kick="' + escapeHtml(p.id) + '" style="margin-left:10px; padding:5px 10px; font-size:11.5px;">Kick</button>' +
          '</div>';
        }).join('');

    var addFormHtml =
      '<div class="panel-card" style="margin-top:16px;">' +
        '<div class="panel-card-head"><h3>Add Participant</h3></div>' +
        '<div class="bio-username-field"><label for="addPartUsername">Roblox username</label><input type="text" id="addPartUsername" placeholder="username"></div>' +
        '<div class="bio-username-field"><label for="addPartRole">Role</label><select id="addPartRole" style="width:100%; padding:11px 13px; border-radius:10px; border:1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); font-family: var(--font-body); font-size:14px;">' +
          SESSION_ROLES.map(function(r){ return '<option value="' + r + '">' + r + '</option>'; }).join('') +
        '</select></div>' +
        '<button class="btn btn-primary" id="addPartBtn" type="button">Add</button>' +
        '<div class="verify-status" id="addPartStatus" style="display:none; margin-top:10px;"><span class="spinner" aria-hidden="true"></span><span id="addPartStatusText"></span></div>' +
      '</div>';

    contentEl.innerHTML =
      '<div class="panel-card"><div class="panel-card-head"><h3>Manage Attendees</h3></div>' + rows + '</div>' +
      (data.status === 'active' ? addFormHtml : '');

    contentEl.querySelectorAll('[data-role-select]').forEach(function(sel){
      sel.addEventListener('change', function(){ changeRole(sel.getAttribute('data-role-select'), sel.value); });
    });
    contentEl.querySelectorAll('[data-kick]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (confirm('Remove this participant from the session?')) kickParticipant(btn.getAttribute('data-kick'));
      });
    });
    var addBtn = document.getElementById('addPartBtn');
    if (addBtn) addBtn.addEventListener('click', addParticipant);
  }

  // ---------- Grading tab (final phase only) ----------

  function renderGradingTab(contentEl, data){
    var staff = data.participants.filter(function(p){ return STAFF_ROLES.indexOf(p.role) !== -1; });
    var rows = staff.length === 0
      ? '<p style="font-size:13.5px; color: var(--text-dim);">No staff (supervisor/ranker/co-host/helper) in this session to grade.</p>'
      : staff.map(function(p){
          var gradeDisplay = p.grade
            ? '<span class="badge" style="background: rgba(63,214,255,0.1); color: var(--accent-soft); border:1px solid rgba(63,214,255,0.22);">' + p.grade + '/10</span>'
            : '<input type="range" min="1" max="10" value="5" data-grade-slider="' + escapeHtml(p.id) + '" style="width:140px; vertical-align:middle;"> <span id="gradeVal-' + escapeHtml(p.id) + '">5</span>/10 ' +
              '<button class="btn btn-ghost" data-submit-grade="' + escapeHtml(p.id) + '" style="margin-left:8px; padding:4px 10px; font-size:11px;">Submit</button>';
          return '<div class="participant-row">' +
            '<span class="name">' + escapeHtml(p.username) + '<span class="role-tag">' + escapeHtml(p.role) + '</span></span>' +
            '<span class="spacer"></span>' +
            gradeDisplay +
          '</div>';
        }).join('');

    contentEl.innerHTML = '<div class="panel-card"><div class="panel-card-head"><h3>Grading</h3></div>' + rows + '</div>';

    contentEl.querySelectorAll('[data-grade-slider]').forEach(function(slider){
      slider.addEventListener('input', function(){
        var valEl = document.getElementById('gradeVal-' + slider.getAttribute('data-grade-slider'));
        if (valEl) valEl.textContent = slider.value;
      });
    });
    contentEl.querySelectorAll('[data-submit-grade]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-submit-grade');
        var slider = contentEl.querySelector('[data-grade-slider="' + id + '"]');
        submitGrade(id, slider ? slider.value : 5);
      });
    });
  }

  // ---------- Promote tab (final phase only) ----------

  function renderPromoteTab(contentEl, data){
    var passed = data.participants.filter(function(p){ return p.phasesPassed >= data.totalPhases; });
    var roles = data.groupRoles || [];

    var rows = passed.length === 0
      ? '<p style="font-size:13.5px; color: var(--text-dim);">No one has passed every phase yet.</p>'
      : passed.map(function(p){
          var control = p.promoted
            ? '<span class="badge badge-success">Promoted' + (p.promotedToRank != null ? ' to rank ' + p.promotedToRank : '') + '</span>'
            : '<select data-promote-rank="' + escapeHtml(p.id) + '" style="padding:6px 8px; border-radius:8px; border:1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); font-size:12.5px;">' +
                '<option value="">Choose next rank…</option>' +
                roles.map(function(r){ return '<option value="' + r.rank + '">' + escapeHtml(r.name) + '</option>'; }).join('') +
              '</select> <button class="btn btn-ghost" data-promote-btn="' + escapeHtml(p.id) + '" style="margin-left:8px; padding:4px 10px; font-size:11px;">Promote</button>';
          return '<div class="participant-row">' +
            '<span class="name">' + escapeHtml(p.username) + '<span class="role-tag">' + escapeHtml(p.role) + '</span></span>' +
            '<span class="spacer"></span>' +
            control +
          '</div>';
        }).join('');

    contentEl.innerHTML =
      '<div class="panel-card"><div class="panel-card-head"><h3>Promote</h3></div>' + rows + '</div>' +
      '<p style="font-size:12px; color: var(--text-faint);">Promotions are recorded in WaveLink only — this does not change anyone\'s real Roblox group rank yet.</p>';

    contentEl.querySelectorAll('[data-promote-btn]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-promote-btn');
        var select = contentEl.querySelector('[data-promote-rank="' + id + '"]');
        if (!select || !select.value){ alert('Choose a rank first.'); return; }
        promoteParticipant(id, select.value);
      });
    });
  }

  // ---------- API calls ----------

  async function load(){
    if (!sessionId){ renderError('No session specified.'); return; }
    try{
      var res = await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId), {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var data = await res.json();
      if (!res.ok){ renderError(data.error || "Couldn't load this session."); return; }
      render(data);
    } catch(e){
      renderError("Couldn't reach WaveLink — please try again shortly.");
    }
  }

  async function setPhaseStatus(participantId, status){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/phase-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ status: status })
      });
    } catch(e){ /* radio still reflects intent; a reload resyncs if it failed */ }
  }

  async function warnParticipant(participantId){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/warn', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      load();
    } catch(e){ alert('Could not add warning — try again.'); }
  }

  async function endPhase(){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/end-phase', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      load();
    } catch(e){ alert('Could not advance the phase — try again.'); }
  }

  async function concludeSession(){
    if (!confirm('Conclude this session? This finalizes it.')) return;
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/end', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      window.location.href = 'community.html?id=' + encodeURIComponent(loadedCommunityId || '');
    } catch(e){ alert('Could not conclude the session — try again.'); }
  }

  async function cancelSession(){
    if (!confirm('Cancel this session? This cannot be undone.')) return;
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/cancel', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      load();
    } catch(e){ alert('Could not cancel the session — try again.'); }
  }

  async function addParticipant(){
    var usernameInput = document.getElementById('addPartUsername');
    var roleSelect = document.getElementById('addPartRole');
    var statusBox = document.getElementById('addPartStatus');
    var statusText = document.getElementById('addPartStatusText');

    var username = usernameInput.value.trim();
    if (!username){
      statusBox.style.display = 'flex';
      statusBox.classList.add('error');
      statusText.textContent = 'Enter a username.';
      return;
    }

    statusBox.style.display = 'flex';
    statusBox.classList.remove('error', 'success');
    statusText.textContent = 'Adding…';

    try{
      var res = await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ username: username, role: roleSelect.value })
      });
      var data = await res.json();
      if (!res.ok){
        statusBox.classList.add('error');
        statusText.textContent = data.error || 'Could not add participant.';
        return;
      }
      load();
    } catch(e){
      statusBox.classList.add('error');
      statusText.textContent = 'Network error — try again.';
    }
  }

  async function kickParticipant(participantId){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      load();
    } catch(e){ alert('Could not remove participant — try again.'); }
  }

  async function changeRole(participantId, role){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ role: role })
      });
    } catch(e){ alert('Could not change role — try again.'); }
  }

  async function submitGrade(participantId, grade){
    try{
      var res = await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ grade: Number(grade), notes: '' })
      });
      if (!res.ok){ var data = await res.json(); alert(data.error || 'Could not save grade.'); return; }
      load();
    } catch(e){ alert('Network error — try again.'); }
  }

  async function promoteParticipant(participantId, toRank){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ toRank: Number(toRank) })
      });
      load();
    } catch(e){ alert('Could not promote — try again.'); }
  }

  load();
})();
