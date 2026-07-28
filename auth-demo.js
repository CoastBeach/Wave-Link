/*
  WaveLink — login page logic
  ---------------------------------------------------------------
  Two states:

  A) Returning user — a session (even an old/expired one) is already
     saved in this browser's localStorage. Show "Continue as X" /
     "Use a different account" instead of jumping straight into
     verification.

  B) Fresh — no saved session. Show the normal "Verify with Roblox"
     button, which requests a code, shows it, and polls the Worker
     until the Roblox game confirms it.

  SETUP REQUIRED: set WORKER_URL below to your deployed Worker's URL,
  and ROBLOX_GAME_URL to your published verification game's URL.
*/
(function(){
  "use strict";

  var WORKER_URL = "https://wavelink-verify.waveware-wavelink.workers.dev";
  var ROBLOX_GAME_URL = "https://www.roblox.com/games/77906116879648";

  var returningCard = document.getElementById('returningCard');
  var freshCard = document.getElementById('freshCard');
  var returningAvatar = document.getElementById('returningAvatar');
  var returningHeading = document.getElementById('returningHeading');
  var continueAsBtn = document.getElementById('continueAsBtn');
  var useDifferentBtn = document.getElementById('useDifferentBtn');

  var loginBtn = document.getElementById('robloxLoginBtn');
  var overlay = document.getElementById('verifyOverlay');
  var codeEl = document.getElementById('verifyCode');
  var statusBox = document.getElementById('verifyStatus');
  var statusText = document.getElementById('verifyStatusText');
  var openGameBtn = document.getElementById('openGameBtn');
  var cancelBtn = document.getElementById('verifyCancelBtn');
  var newCodeBtn = document.getElementById('verifyNewCodeBtn');

  if (openGameBtn) openGameBtn.href = ROBLOX_GAME_URL;

  function getSavedSession(){
    try{ return JSON.parse(localStorage.getItem('wavelink_demo_session') || 'null'); }
    catch(e){ return null; }
  }

  function showReturningCard(session){
    var displayName = session.robloxDisplayName || session.robloxUsername;
    returningHeading.textContent = 'Welcome back, ' + displayName;
    if (session.avatarUrl){
      returningAvatar.innerHTML = '<img src="' + session.avatarUrl + '" alt="">';
    } else {
      returningAvatar.innerHTML = '';
    }
    returningCard.hidden = false;
    freshCard.hidden = true;
  }

  function showFreshCard(){
    returningCard.hidden = true;
    freshCard.hidden = false;
  }

  // ---- decide which card to show on load ----
  var savedSession = getSavedSession();
  if (savedSession && savedSession.robloxUsername){
    showReturningCard(savedSession);
  } else {
    showFreshCard();
  }

  if (continueAsBtn){
    continueAsBtn.addEventListener('click', function(){
      // We already have a session saved — just go straight in.
      // dashboard.html will itself verify the session is still valid.
      window.location.href = 'dashboard.html';
    });
  }

  if (useDifferentBtn){
    useDifferentBtn.addEventListener('click', function(){
      try{ localStorage.removeItem('wavelink_demo_session'); } catch(e){}
      showFreshCard();
    });
  }

  // ---- fresh verification flow ----
  if (!loginBtn || !overlay) return;

  var pollTimer = null;
  var currentCode = null;

  function setStatus(text, state){
    statusText.textContent = text;
    statusBox.classList.remove('success', 'error');
    if (state) statusBox.classList.add(state);
  }

  function stopPolling(){
    if (pollTimer){ clearInterval(pollTimer); pollTimer = null; }
  }

  function openOverlay(){ overlay.classList.add('open'); }
  function closeOverlay(){ overlay.classList.remove('open'); stopPolling(); }

  async function requestCode(){
    setStatus('Requesting a code…');
    codeEl.innerHTML = '------<span class="copy-hint">Click to copy</span>';
    newCodeBtn.style.display = 'none';

    try{
      var res = await fetch(WORKER_URL + '/api/create-session', { method: 'POST' });
      if (!res.ok) throw new Error('bad response');
      var data = await res.json();
      currentCode = data.code;
      codeEl.innerHTML = currentCode + '<span class="copy-hint">Click to copy</span>';
      setStatus('Waiting for verification…');
      startPolling();
    } catch(e){
      setStatus('Could not reach WaveLink. Check your connection and try again.', 'error');
    }
  }

  function startPolling(){
    stopPolling();
    pollTimer = setInterval(async function(){
      if (!currentCode) return;
      try{
        var res = await fetch(WORKER_URL + '/api/status?code=' + encodeURIComponent(currentCode));
        var data = await res.json();

        if (data.status === 'verified'){
          stopPolling();
          setStatus('Verified as ' + data.username + '!', 'success');

          var session = {
            robloxUserId: data.robloxUserId,
            robloxUsername: data.username,
            robloxDisplayName: data.displayName,
            avatarUrl: data.avatarUrl,
            sessionToken: data.sessionToken,
            connectedAt: new Date().toISOString()
          };
          try{ localStorage.setItem('wavelink_demo_session', JSON.stringify(session)); } catch(e){}

          setTimeout(function(){ window.location.href = 'dashboard.html'; }, 900);
        } else if (data.status === 'expired'){
          stopPolling();
          setStatus('This code expired.', 'error');
          newCodeBtn.style.display = 'block';
        }
        // status === 'pending' -> keep waiting
      } catch(e){
        // transient network error — just try again on the next tick
      }
    }, 2500);
  }

  loginBtn.addEventListener('click', function(){
    openOverlay();
    requestCode();
  });

  cancelBtn.addEventListener('click', closeOverlay);
  newCodeBtn.addEventListener('click', requestCode);

  overlay.addEventListener('click', function(e){
    if (e.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
  });

  codeEl.addEventListener('click', function(){
    if (!currentCode) return;
    if (navigator.clipboard){
      navigator.clipboard.writeText(currentCode).then(function(){
        var hint = codeEl.querySelector('.copy-hint');
        if (hint){
          var original = hint.textContent;
          hint.textContent = 'Copied!';
          setTimeout(function(){ hint.textContent = original; }, 1200);
        }
      });
    }
  });

  // ---- Description (bio) verification flow ----
  var bioBtn = document.getElementById('bioVerifyBtn');
  var bioOverlay = document.getElementById('bioOverlay');
  var bioStepUsername = document.getElementById('bioStepUsername');
  var bioStepPhrase = document.getElementById('bioStepPhrase');
  var bioStepConfirm = document.getElementById('bioStepConfirm');
  var bioUsernameInput = document.getElementById('bioUsernameInput');
  var bioGeneratePhraseBtn = document.getElementById('bioGeneratePhraseBtn');
  var bioPhraseEl = document.getElementById('bioPhrase');
  var bioCheckBtn = document.getElementById('bioCheckBtn');
  var bioStatus = document.getElementById('bioStatus');
  var bioStatusText = document.getElementById('bioStatusText');
  var bioConfirmAvatar = document.getElementById('bioConfirmAvatar');
  var bioConfirmName = document.getElementById('bioConfirmName');
  var bioConfirmUsername = document.getElementById('bioConfirmUsername');
  var bioConfirmYesBtn = document.getElementById('bioConfirmYesBtn');
  var bioConfirmNoBtn = document.getElementById('bioConfirmNoBtn');

  var currentPhrase = null;

  var SAFE_SENTENCES = [
    'Apples grow on trees.',
    'Corn on the cob is tasty.',
    'Roblox is fun.',
    'Cats are great pets.',
    'The sky is blue today.',
    'Pizza is delicious.',
    'Dogs like to play fetch.',
    'The ocean is very deep.',
    'Bananas are yellow.',
    'I enjoy building games.',
    'Rain makes plants grow.',
    'Summer days are long.',
    'Birds can fly high.',
    'Ice cream is a fun treat.',
    'Books tell great stories.',
    'Mountains are tall.',
    'Bees make honey.',
    'Stars shine at night.',
    'Turtles move slowly.',
    'Friends make life better.',
    'Music makes people happy.',
    'Fish live underwater.',
    'Autumn leaves turn orange.',
    'Robots can be helpful.'
  ];

  function generateSafePhrase(){
    var first = SAFE_SENTENCES[Math.floor(Math.random() * SAFE_SENTENCES.length)];
    var second;
    do {
      second = SAFE_SENTENCES[Math.floor(Math.random() * SAFE_SENTENCES.length)];
    } while (second === first);
    return first + ' ' + second;
  }
  var pendingProfile = null;

  function showBioStep(step){
    bioStepUsername.hidden = step !== 'username';
    bioStepPhrase.hidden = step !== 'phrase';
    bioStepConfirm.hidden = step !== 'confirm';
  }

  function openBioOverlay(){
    currentPhrase = generateSafePhrase();
    bioUsernameInput.value = '';
    showBioStep('username');
    bioOverlay.classList.add('open');
  }
  function closeBioOverlay(){ bioOverlay.classList.remove('open'); }

  if (bioBtn){
    bioBtn.addEventListener('click', openBioOverlay);
  }

  [document.getElementById('bioCancelBtn1'), document.getElementById('bioCancelBtn2')].forEach(function(btn){
    if (btn) btn.addEventListener('click', closeBioOverlay);
  });

  bioOverlay.addEventListener('click', function(e){ if (e.target === bioOverlay) closeBioOverlay(); });

  if (bioGeneratePhraseBtn){
    bioGeneratePhraseBtn.addEventListener('click', function(){
      if (!bioUsernameInput.value.trim()){
        bioUsernameInput.focus();
        return;
      }
      bioPhraseEl.textContent = currentPhrase;
      bioStatus.style.display = 'none';
      showBioStep('phrase');
    });
  }

  bioPhraseEl.addEventListener('click', function(){
    if (navigator.clipboard) navigator.clipboard.writeText(currentPhrase);
  });

  if (bioCheckBtn){
    bioCheckBtn.addEventListener('click', async function(){
      bioStatus.style.display = 'flex';
      bioStatus.classList.remove('success', 'error');
      bioStatusText.textContent = 'Checking your profile…';
      bioCheckBtn.disabled = true;

      try{
        var res = await fetch(WORKER_URL + '/api/bio-verify/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: bioUsernameInput.value.trim(), phrase: currentPhrase })
        });
        var data = await res.json();

        if (!res.ok){
          bioStatus.classList.add('error');
          bioStatusText.textContent = data.error || 'Could not verify. Try again.';
          bioCheckBtn.disabled = false;
          return;
        }

        pendingProfile = data;
        bioConfirmAvatar.src = data.avatarUrl || '';
        bioConfirmName.textContent = data.displayName;
        bioConfirmUsername.textContent = '@' + data.username;
        showBioStep('confirm');
      } catch(e){
        bioStatus.classList.add('error');
        bioStatusText.textContent = 'Network error — please try again.';
      }
      bioCheckBtn.disabled = false;
    });
  }

  if (bioConfirmNoBtn){
    bioConfirmNoBtn.addEventListener('click', function(){
      pendingProfile = null;
      showBioStep('username');
    });
  }

  if (bioConfirmYesBtn){
    bioConfirmYesBtn.addEventListener('click', async function(){
      if (!pendingProfile) return;
    
