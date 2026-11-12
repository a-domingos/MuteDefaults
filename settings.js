(function () {
  'use strict';

  function loadSettings() {
    chrome.storage.sync.get(['muteMicrophone', 'muteCamera'], function (result) {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        return;
      }
      var micCheckbox = document.getElementById('muteMicrophone');
      var camCheckbox = document.getElementById('muteCamera');
      if (micCheckbox) {
        micCheckbox.checked = Boolean(result && result.muteMicrophone);
      }
      if (camCheckbox) {
        camCheckbox.checked = Boolean(result && result.muteCamera);
      }
    });

    var micEl = document.getElementById('muteMicrophone');
    var camEl = document.getElementById('muteCamera');
    if (micEl) {
      micEl.addEventListener('change', saveSettings);
    }
    if (camEl) {
      camEl.addEventListener('change', saveSettings);
    }
  }

  function saveSettings() {
    var micEl = document.getElementById('muteMicrophone');
    var camEl = document.getElementById('muteCamera');

    var settings = {
      muteMicrophone: micEl ? micEl.checked : false,
      muteCamera: camEl ? camEl.checked : false
    };

    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadSettings);
})();
