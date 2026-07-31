/*
  WaveLink — Session detail page
  ---------------------------------------------------------------
  Uses window.WaveLinkSession (set by app-shell.js) for the session
  token. Fetches one live session by ?id= and renders phase progress,
  the participant list, and (if the viewer can manage sessions) the
  host controls: add participant, toggle pass for the current phase,
  end phase, promote, grade, end session, cancel session.

  SETUP REQUIRED: set WORKER_URL to your deployed Worker's URL.
*/
(function(){
  "use strict";

  var WORKER_URL = "https://wavelink-verify.waveware-wavelink.workers.dev";
  var SESSION_ROLES = ["attendee", "spectator", "supervisor", "ranker", "co-host", "helper"];

  var session = window.WaveLinkSession;
  if (!session) return;

  var container = document.getElementById('sessionContainer');
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('id');
  var loadedCommunityId = null;

  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function renderError(message){
    container.innerHTML = '<div class="error-state">' + escapeHtml(message) + '</div>';
  }

  function render(data){
    loadedCommunityId = data.communityId;
    var phaseTrackHtml = data.phaseNames.map(function(name, i){
      var cls = i === data.currentPhaseIndex ? 'current' : (i < data.currentPhaseIndex ? 'done' : '');
      return '<span class="phase-pill ' + cls + '">' + escapeHtml(name) + '</span>';
    }).join('');

    var statusLabel = data.status === 'grading' ? 'Grading' : (data.status === 'active' ? 'Active' : data.status);

    var actionsHtml = '';
    if (data.canManageSession){
      if (data.status === 'active'){
        actionsHtml += '<button class="btn btn-primary" id="endPhaseBtn" type="button">End Phase &amp; Advance</button>';
      }
      actionsHtml += '<button class="btn btn-ghost" id="cancelSessionBtn" type="button">Cancel Session</button>';
      if (data.status === 'grading'){
        actionsHtml += '<button class="btn btn-ghost" id="endSessionBtn" type="button">End Session</button>';
      }
    }

    var participantsHtml = data.participants.length === 0
      ? '<p style="font-size:13.5px; color: var(--text-dim);">No participants added yet.</p>'
      : data.participants.map(function(p){
          var passControl = '';
          if (data.canManageSession && data.status === 'active'){
            passControl = '<label class="pass-check"><input type="checkbox" data-toggle-pass="' + escapeHtml(p.id) + '" ' + (p.passedCurrentPhase ? 'checked' : '') + '> Passed this phase</label>';
          } else {
            passControl = '<span style="font-size:12px; color: var(--text-faint);">' + p.phasesPassed + '/' + data.totalPhases + ' phases passed</span>';
          }

          var gradingControls = '';
          if (data.status === 'grading' && data.canManageSession){
            gradingControls =
              (p.promoted
                ? '<span class="badge badge-success" style="margin-left:8px;">Promoted</span>'
                : '<button class="btn btn-ghost" data-promote="' + escapeHtml(p.id) + '" style="padding:5px 10px; font-size:11.5px; margin-left:8px;">Promote</button>') +
              (p.grade
                ? '<span class="badge" style="margin-left:8px; background: rgba(63,214,255,0.1); color: var(--accent-soft); border:1px solid rgba(63,214,255,0.22);">Grade: ' + p.grade + '/5</span>'
                : '<button class="btn btn-ghost" data-grade="' + escapeHtml(p.id) + '" style="padding:5px 10px; font-size:11.5px; margin-left:8px;">Grade</button>');
          }

          return '<div class="participant-row">' +
            '<span class="name">' + escapeHtml(p.username) + '<span class="role-tag">' + escapeHtml(p.role) + '</span></span>' +
            '<span class="spacer"></span>' +
            passControl + gradingControls +
          '</div>';
        }).join('');

    var addParticipantHtml = '';
    if (data.canManageSession && data.status === 'active'){
      addParticipantHtml =
        '<div class="panel-card" style="margin-top:16px;">' +
          '<div class="panel-card-head"><h3>Add Participant</h3></div>' +
          '<div class="bio-username-field"><label for="addPartUsername">Roblox username</label><input type="text" id="addPartUsername" placeholder="username"></div>' +
          '<div class="bio-username-field"><label for="addPartRole">Role</label><select id="addPartRole" style="width:100%; padding:11px 13px; border-radius:10px; border:1px solid var(--border); background: rgba(255,255,255,0.02); color: var(--text); font-family: var(--font-body); font-size:14px;">' +
            SESSION_ROLES.map(function(r){ return '<option value="' + r + '">' + r + '</option>'; }).join('') +
          '</select></div>' +
          '<button class="btn btn-primary" id="addPartBtn" type="button">Add</button>' +
          '<div class="verify-status" id="addPartStatus" style="display:none; margin-top:10px;"><span class="spinner" aria-hidden="true"></span><span id="addPartStatusText"></span></div>' +
        '</div>';
    }

    container.innerHTML =
      '<div class="session-hero">' +
        '<h1>' + escapeHtml(data.typeName) + '</h1>' +
        '<div class="meta">Hosted by ' + escapeHtml(data.hostUsername) + ' · Status: ' + escapeHtml(statusLabel) + (data.serverId ? ' · Server: ' + escapeHtml(data.serverId.slice(0, 12)) + '…' : '') + '</div>' +
        '<div class="phase-track">' + phaseTrackHtml + '</div>' +
        '<div class="session-actions">' + actionsHtml + '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-card-head"><h3>Participants (' + data.participants.length + ')</h3></div>' +
        participantsHtml +
      '</div>' +
      addParticipantHtml;

    container.querySelectorAll('[data-toggle-pass]').forEach(function(cb){
      cb.addEventListener('change', function(){ togglePass(cb.getAttribute('data-toggle-pass')); });
    });
    container.querySelectorAll('[data-promote]').forEach(function(btn){
      btn.addEventListener('click', function(){ promoteParticipant(btn.getAttribute('data-promote')); });
    });
    container.querySelectorAll('[data-grade]').forEach(function(btn){
      btn.addEventListener('click', function(){ gradeParticipant(btn.getAttribute('data-grade')); });
    });

    var endPhaseBtn = document.getElementById('endPhaseBtn');
    if (endPhaseBtn) endPhaseBtn.addEventListener('click', endPhase);

    var cancelBtn = document.getElementById('cancelSessionBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelSession);

    var endBtn = document.getElementById('endSessionBtn');
    if (endBtn) endBtn.addEventListener('click', endSession);

    var addPartBtn = document.getElementById('addPartBtn');
    if (addPartBtn) addPartBtn.addEventListener('click', addParticipant);
  }

  async function load(){
    if (!sessionId){
      renderError('No session specified.');
      return;
    }
    try{
      var res = await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId), {
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      var data = await res.json();
      if (!res.ok){
        renderError(data.error || "Couldn't load this session.");
        return;
      }
      render(data);
    } catch(e){
      renderError("Couldn't reach WaveLink — please try again shortly.");
    }
  }

  async function togglePass(participantId){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/toggle-pass', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
    } catch(e){ /* checkbox already reflects intended state visually; a reload will resync if it failed */ }
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

  async function promoteParticipant(participantId){
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/promote', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      load();
    } catch(e){ alert('Could not promote — try again.'); }
  }

  async function gradeParticipant(participantId){
    var grade = prompt('Grade (1-5):');
    if (!grade) return;
    var notes = prompt('Notes (optional):') || '';
    try{
      var res = await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/participants/' + encodeURIComponent(participantId) + '/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.sessionToken },
        body: JSON.stringify({ grade: Number(grade), notes: notes })
      });
      if (!res.ok){ var data = await res.json(); alert(data.error || 'Could not save grade.'); return; }
      load();
    } catch(e){ alert('Network error — try again.'); }
  }

  async function endSession(){
    if (!confirm('End this session? This finalizes it.')) return;
    try{
      await fetch(WORKER_URL + '/api/sessions/' + encodeURIComponent(sessionId) + '/end', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.sessionToken }
      });
      window.location.href = 'community.html?id=' + encodeURIComponent(loadedCommunityId || '');
    } catch(e){ alert('Could not end the session — try again.'); }
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

  load();
})();
