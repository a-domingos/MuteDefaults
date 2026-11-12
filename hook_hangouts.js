(function () {
  'use strict';

  var muteMic = false;
  var muteCam = false;
  var micHandled = true;
  var camHandled = true;
  var lastMicClick = 0;
  var lastCamClick = 0;
  var observer = null;
  var pollInterval = null;
  var attempts = 0;
  var maxAttempts = 60; // Up to 30 seconds (500ms intervals)
  var isScheduled = false;

  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    attempts = 0;
  }

  function isElementVisible(el) {
    if (!el) return false;
    // Fast checks before touching layout geometry
    if (el.hidden || el.style.display === 'none' || el.style.visibility === 'hidden') {
      return false;
    }
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
    var aria = (el.getAttribute('aria-label') || '').toLowerCase();
    var tooltip = (el.getAttribute('data-tooltip') || '').toLowerCase();
    var full = aria + ' ' + tooltip;

    // Filter out unrelated buttons (settings, device tests)
    if (full.indexOf('check') !== -1 || full.indexOf('verificar') !== -1 ||
        full.indexOf('settings') !== -1 || full.indexOf('configura') !== -1) {
      return false;
    }

    var hasShortcut = full.indexOf('+ d') !== -1 ||
                      full.indexOf('ctrl + d') !== -1 ||
                      full.indexOf('⌘ + d') !== -1;
    var hasMicWord = full.indexOf('micro') !== -1 || full.indexOf('mic') !== -1;

    return (hasShortcut || hasMicWord) && isElementVisible(el);
  }

  function isCameraButton(el) {
    var aria = (el.getAttribute('aria-label') || '').toLowerCase();
    var tooltip = (el.getAttribute('data-tooltip') || '').toLowerCase();
    var full = aria + ' ' + tooltip;

    // Filter out visual effects, settings, device checks
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

    return (hasShortcut || hasCamWord) && isElementVisible(el);
  }

  function getControl(type) {
    // Targeted fast queries for buttons with shortcuts or localized labels
    var selector = type === 'mic'
      ? '[aria-label*="+ d" i], [aria-label*="ctrl + d" i], [aria-label*="mic" i], [data-tooltip*="+ d" i], [data-tooltip*="ctrl + d" i], [data-tooltip*="mic" i]'
      : '[aria-label*="+ e" i], [aria-label*="ctrl + e" i], [aria-label*="cam" i], [data-tooltip*="+ e" i], [data-tooltip*="ctrl + e" i], [data-tooltip*="cam" i]';

    var elements = document.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
      var candidate = elements[i];
      if (type === 'mic' && isMicrophoneButton(candidate)) {
        return candidate;
      }
      if (type === 'cam' && isCameraButton(candidate)) {
        return candidate;
      }
    }

    // Secondary fallback: elements using Meet's data-is-muted attribute
    var mutedElements = document.querySelectorAll('[data-is-muted]');
    var visibleMuted = [];
    for (var j = 0; j < mutedElements.length; j++) {
      if (isElementVisible(mutedElements[j])) {
        visibleMuted.push(mutedElements[j]);
      }
    }
    if (visibleMuted.length >= 2) {
      return type === 'mic' ? visibleMuted[0] : visibleMuted[1];
    }

    return null;
  }

  function checkIsMuted(btn) {
    if (!btn) return false;

    var mutedAttr = btn.getAttribute('data-is-muted');
    if (mutedAttr !== null) {
      return mutedAttr === 'true';
    }

    var childMuted = btn.querySelector('[data-is-muted]');
    if (childMuted) {
      return childMuted.getAttribute('data-is-muted') === 'true';
    }

    var label = (
      (btn.getAttribute('aria-label') || '') + ' ' +
      (btn.getAttribute('data-tooltip') || '')
    ).toLowerCase();

    // "Turn on" / "ativar" means currently muted
    if (label.indexOf('turn on') !== -1 ||
        label.indexOf('ativar') !== -1 ||
        label.indexOf('activar') !== -1 ||
        label.indexOf('ligar') !== -1) {
      return true;
    }

    // "Turn off" / "desativar" means currently active/unmuted
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

  function scheduleTryMute() {
    if (isScheduled) return;
    isScheduled = true;
    window.requestAnimationFrame(function () {
      isScheduled = false;
      tryMute();
    });
  }

  function startObservation() {
    cleanup();
    tryMute();

    if (!micHandled || !camHandled) {
      observer = new MutationObserver(function () {
        scheduleTryMute();
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      pollInterval = setInterval(function () {
        tryMute();
      }, 500);
    }
  }

  function init() {
    chrome.storage.sync.get(['muteMicrophone', 'muteCamera'], function (settings) {
      muteMic = Boolean(settings && settings.muteMicrophone);
      muteCam = Boolean(settings && settings.muteCamera);

      micHandled = !muteMic;
      camHandled = !muteCam;

      if (muteMic || muteCam) {
        startObservation();
      }
    });
  }

  // Live updates if user changes settings while on Meet
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== 'sync') return;
    var updated = false;

    if (changes.muteMicrophone) {
      muteMic = Boolean(changes.muteMicrophone.newValue);
      micHandled = !muteMic;
      updated = true;
    }
    if (changes.muteCamera) {
      muteCam = Boolean(changes.muteCamera.newValue);
      camHandled = !muteCam;
      updated = true;
    }

    if (updated && (muteMic || muteCam)) {
      startObservation();
    }
  });

  init();
})();
