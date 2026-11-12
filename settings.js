function loadSettings() {
    chrome.storage.sync.get(['muteMicrophone', 'muteCamera'], function (result) {
        var micCheckbox = document.getElementById('muteMicrophone');
        var camCheckbox = document.getElementById('muteCamera');
        if (micCheckbox) {
            micCheckbox.checked = Boolean(result.muteMicrophone);
        }
        if (camCheckbox) {
            camCheckbox.checked = Boolean(result.muteCamera);
        }
    });

    var camEl = document.getElementById('muteCamera');
    var micEl = document.getElementById('muteMicrophone');
    if (camEl) {
        camEl.addEventListener('change', saveSettings);
    }
    if (micEl) {
        micEl.addEventListener('change', saveSettings);
    }
}

function saveSettings() {
    var micEl = document.getElementById('muteMicrophone');
    var camEl = document.getElementById('muteCamera');

    var muteMicrophone = micEl ? micEl.checked : false;
    var muteCamera = camEl ? camEl.checked : false;

    chrome.storage.sync.set({
        'muteMicrophone': muteMicrophone,
        'muteCamera': muteCamera
    });
}

document.addEventListener('DOMContentLoaded', loadSettings);
