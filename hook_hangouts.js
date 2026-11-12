(function () {
  'use strict';

  chrome.storage.sync.get(['muteMicrophone', 'muteCamera'], function (settings) {
    var muteMic = Boolean(settings && settings.muteMicrophone);
    var muteCam = Boolean(settings && settings.muteCamera);

    if (!muteMic && !muteCam) {
      return;
    }

    var micHandled = !muteMic;
    var camHandled = !muteCam;
    var lastMicClick = 0;
    var lastCamClick = 0;
    var observer = null;
    var pollInterval = null;
    var attempts = 0;
    var maxAttempts = 60; // Up to ~30 seconds

    function cleanup() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    function isElementVisible(el) {
      if (!el) return false;
      return Boolean(el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
    }

    function triggerClick(el) {
      if (!el) return;
      el.focus();
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      el.click();
    }

    function isMicrophoneButton(el) {
      if (!isElementVisible(el)) return false;

      var aria = (el.getAttribute('aria-label') || '').toLowerCase();
      var tooltip = (el.getAttribute('data-tooltip') || '').toLowerCase();
      var full = aria + ' ' + tooltip;

      // Exclude settings, device-checks, or modal buttons
      if (full.indexOf('check') !== -1 || full.indexOf('verificar') !== -1 ||
          full.indexOf('settings') !== -1 || full.indexOf('configura') !== -1) {
        return false;
      }

      var hasShortcut = full.indexOf('+ d') !== -1 ||
                        full.indexOf('ctrl + d') !== -1 ||
                        full.indexOf('⌘ + d') !== -1;
      var hasMicWord = full.indexOf('micro') !== -1 || full.indexOf('mic') !== -1;

      return hasShortcut || hasMicWord;
    }

    function isCameraButton(el) {
      if (!isElementVisible(el)) return false;

      var aria = (el.getAttribute('aria-label') || '').toLowerCase();
      var tooltip = (el.getAttribute('data-tooltip') || '').toLowerCase();
      var full = aria + ' ' + tooltip;

      // Exclude "Check your audio and video", settings, visual effects, etc.
      if (full.indexOf('check') !== -1 || full.indexOf('verificar') !== -1 ||
          full.indexOf('settings') !== -1 || full.indexOf('configura') !== -1 ||
          full.indexOf('effect') !== -1 || full.indexOf('efeito') !== -1 ||
          full.indexOf('background') !== -1 || full.indexOf('fundo') !== -1) {
        return false;
      }

      var hasShortcut = full.indexOf('+ e') !== -1 ||
                        full.indexOf('ctrl + e') !== -1 ||
                        full.indexOf('⌘ + e') !== -1;
      var hasCamWord = full.indexOf('camera') !== -1 ||
                       full.indexOf('câmera') !== -1 ||
                       full.indexOf('cámara') !== -1 ||
                       full.indexOf('caméra') !== -1 ||
                       full.indexOf('kamera') !== -1;

      return hasShortcut || hasCamWord;
    }

    function getControl(type) {
      var candidates = document.querySelectorAll('button, div[role="button"]');
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (type === 'mic' && isMicrophoneButton(el)) {
          return el;
        }
        if (type === 'cam' && isCameraButton(el)) {
          return el;
        }
      }

      // Secondary fallback: buttons with data-is-muted specifically
      var mutedElements = document.querySelectorAll('[data-is-muted]');
      var validMuted = [];
      for (var j = 0; j < mutedElements.length; j++) {
        if (isElementVisible(mutedElements[j])) {
          validMuted.push(mutedElements[j]);
        }
      }
      if (validMuted.length >= 2) {
        return type === 'mic' ? validMuted[0] : validMuted[1];
      }

      return null;
    }

    function checkIsMuted(btn) {
      if (!btn) return false;

      // Check data-is-muted on button or descendants
      var mutedAttr = btn.getAttribute('data-is-muted');
      if (mutedAttr !== null) {
        return mutedAttr === 'true';
      }

      var childMuted = btn.querySelector('[data-is-muted]');
      if (childMuted) {
        return childMuted.getAttribute('data-is-muted') === 'true';
      }

      // Inspect aria-label / tooltip
      var label = (
        (btn.getAttribute('aria-label') || '') + ' ' +
        (btn.getAttribute('data-tooltip') || '')
      ).toLowerCase();

      // "Turn on" / "ativar" / "activar" means it is currently muted/off
      if (label.indexOf('turn on') !== -1 ||
          label.indexOf('ativar') !== -1 ||
          label.indexOf('activar') !== -1 ||
          label.indexOf('ligar') !== -1) {
        return true;
      }

      // "Turn off" / "desativar" / "desactivar" means it is currently active/on
      if (label.indexOf('turn off') !== -1 ||
          label.indexOf('desativar') !== -1 ||
          label.indexOf('desactivar') !== -1 ||
          label.indexOf('desligar') !== -1) {
        return false;
      }

      return false;
    }

    function tryMute() {
      attempts++;
      var now = Date.now();

      // Handle Microphone
      if (!micHandled) {
        var micBtn = getControl('mic');
        if (micBtn) {
          if (checkIsMuted(micBtn)) {
            micHandled = true;
          } else if (now - lastMicClick > 600) {
            triggerClick(micBtn);
            lastMicClick = now;
          }
        }
      }

      // Handle Camera
      if (!camHandled) {
        var camBtn = getControl('cam');
        if (camBtn) {
          if (checkIsMuted(camBtn)) {
            camHandled = true;
          } else if (now - lastCamClick > 600) {
            triggerClick(camBtn);
            lastCamClick = now;
          }
        }
      }

      if ((micHandled && camHandled) || attempts >= maxAttempts) {
        cleanup();
      }
    }

    // Try immediately
    tryMute();

    // Observe changes with subtree: true
    if (!micHandled || !camHandled) {
      observer = new MutationObserver(function () {
        tryMute();
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      pollInterval = setInterval(function () {
        tryMute();
      }, 500);
    }
  });
})();
