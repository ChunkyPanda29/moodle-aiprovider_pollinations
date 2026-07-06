// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * BYOP Connect module — Pollinations Device Flow (ES module source).
 *
 * Uses the device flow which is domain-independent (no redirect URI needed).
 * This is essential for a plugin distributed to different Moodle sites.
 *
 * Flow:
 * 1. Admin clicks "Connect" → request device code from Pollinations
 * 2. Display user code (e.g. ABCD-1234) and open enter.pollinations.ai/device
 * 3. Admin enters code on Pollinations and authorises
 * 4. Plugin polls until authorised, then saves the API key
 *
 * @module     aiprovider_pollinations/byop_connect
 * @copyright  2026 Krissy Painter
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import Notification from 'core/notification';
import Str from 'core/str';

const DEVICE_URL = 'https://enter.pollinations.ai/device';
const POLL_INTERVAL = 5000; // 5 seconds between polls.
const POLL_TIMEOUT = 300000; // 5 minutes total.

/** @type {Object|null} Cached language strings. */
let strings = null;

/**
 * Load all required language strings.
 *
 * @return {Promise<Object>}
 */
const loadStrings = async() => {
    if (strings !== null) {
        return strings;
    }

    const keys = [
        {key: 'byop_js_btn_connect', component: 'aiprovider_pollinations'},
        {key: 'byop_js_btn_disconnect', component: 'aiprovider_pollinations'},
        {key: 'byop_js_starting', component: 'aiprovider_pollinations'},
        {key: 'byop_js_failed_start', component: 'aiprovider_pollinations'},
        {key: 'byop_js_enter_code', component: 'aiprovider_pollinations'},
        {key: 'byop_js_btn_open', component: 'aiprovider_pollinations'},
        {key: 'byop_js_timeout', component: 'aiprovider_pollinations'},
        {key: 'byop_js_connected', component: 'aiprovider_pollinations'},
        {key: 'byop_js_disconnected', component: 'aiprovider_pollinations'},
        {key: 'byop_js_connected_label', component: 'aiprovider_pollinations'},
        {key: 'byop_js_balance', component: 'aiprovider_pollinations'},
        {key: 'byop_js_not_connected', component: 'aiprovider_pollinations'},
        {key: 'byop_js_authfailed', component: 'aiprovider_pollinations'},
    ];

    const results = await Str.get_strings(keys);

    strings = {
        btnConnect: results[0],
        btnDisconnect: results[1],
        starting: results[2],
        failedStart: results[3],
        enterCode: results[4],
        btnOpen: results[5],
        timeout: results[6],
        connected: results[7],
        disconnected: results[8],
        connectedLabel: results[9],
        balance: results[10],
        notConnected: results[11],
        authFailed: results[12],
    };

    return strings;
};

/**
 * Initialise the BYOP connect UI.
 */
export const init = async() => {
    const container = document.getElementById('aiprovider_pollinations_byop_container');
    if (!container) {
        return;
    }

    try {
        await loadStrings();
    } catch (e) {
        Notification.exception(e);
        return;
    }

    container.innerHTML = '';
    container.style.padding = '10px 0';

    const statusDiv = document.createElement('div');
    statusDiv.id = 'aiprovider_pollinations_status';
    statusDiv.style.marginBottom = '10px';
    container.appendChild(statusDiv);

    const connectBtn = document.createElement('button');
    connectBtn.type = 'button';
    connectBtn.className = 'btn btn-primary';
    connectBtn.textContent = strings.btnConnect;
    connectBtn.style.marginRight = '8px';
    connectBtn.addEventListener('click', startDeviceFlow);
    container.appendChild(connectBtn);

    const disconnectBtn = document.createElement('button');
    disconnectBtn.type = 'button';
    disconnectBtn.className = 'btn btn-secondary';
    disconnectBtn.textContent = strings.btnDisconnect;
    disconnectBtn.style.display = 'none';
    disconnectBtn.addEventListener('click', doDisconnect);
    container.appendChild(disconnectBtn);

    checkStatus();
};

/**
 * Start the BYOP device authorisation flow.
 */
const startDeviceFlow = async() => {
    showStatus(strings.starting, 'info');

    const request = {
        methodname: 'aiprovider_pollinations_init_device_flow',
        args: {},
    };

    try {
        const result = await Ajax.call([request])[0];
        if (!result.success) {
            showStatus('❌ ' + (result.error || strings.failedStart), 'error');
            return;
        }

        // Display the user code prominently.
        const code = result.user_code;
        const codeHtml = `
            <div style="padding:15px;border:2px solid #8a2be2;border-radius:8px;text-align:center;margin:10px 0;">
                <div style="font-size:0.85em;color:#666;margin-bottom:5px;">
                    ${strings.enterCode}
                </div>
                <div style="font-size:2em;font-weight:bold;letter-spacing:4px;color:#8a2be2;margin:10px 0;">
                    ${code}
                </div>
                <button type="button" class="btn btn-primary" onclick="window.open('${DEVICE_URL}', '_blank')">
                    ${strings.btnOpen}
                </button>
            </div>
        `;
        showStatusHtml(codeHtml);

        // Start polling.
        pollForToken(result.device_code);
    } catch (e) {
        Notification.exception(e);
    }
};

/**
 * Poll for the authorisation token.
 *
 * authorization_pending is a normal response — it means the user
 * hasn't entered the code yet. Keep polling until success or timeout.
 *
 * @param {string} deviceCode
 * @param {number} elapsed
 */
const pollForToken = async(deviceCode, elapsed = 0) => {
    if (elapsed >= POLL_TIMEOUT) {
        showStatus(strings.timeout, 'error');
        return;
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    const request = {
        methodname: 'aiprovider_pollinations_poll_device_token',
        args: {devicecode: deviceCode},
    };

    try {
        const result = await Ajax.call([request])[0];

        if (result.success) {
            showStatus(strings.connected, 'success');
            toggleButtons(true);
            checkStatus();
            return;
        }

        if (result.pending) {
            // Normal — user hasn't authorised yet, keep polling.
            pollForToken(deviceCode, elapsed + POLL_INTERVAL);
            return;
        }

        // Actual error (denied, expired, etc).
        showStatus('❌ ' + (result.error || strings.authFailed), 'error');
    } catch (e) {
        Notification.exception(e);
    }
};

/**
 * Disconnect.
 */
const doDisconnect = async() => {
    const request = {
        methodname: 'aiprovider_pollinations_disconnect',
        args: {},
    };
    try {
        await Ajax.call([request])[0];
        showStatus(strings.disconnected, 'info');
        toggleButtons(false);
    } catch (e) {
        Notification.exception(e);
    }
};

/**
 * Check current connection status.
 */
const checkStatus = async() => {
    const request = {
        methodname: 'aiprovider_pollinations_get_status',
        args: {},
    };
    try {
        const result = await Ajax.call([request])[0];
        if (result.connected) {
            let msg = strings.connectedLabel;
            if (result.balance !== undefined && result.balance !== null) {
                // The balance string has {$a} placeholder.
                msg += strings.balance.replace('{$a}', result.balance);
            }
            showStatus(msg, 'success');
            toggleButtons(true);
        } else {
            showStatus(strings.notConnected, 'info');
            toggleButtons(false);
        }
    } catch (e) {
        showStatus(strings.notConnected, 'info');
    }
};

/**
 * Show status message.
 */
const showStatus = (message, type) => {
    const statusDiv = document.getElementById('aiprovider_pollinations_status');
    if (!statusDiv) {
        return;
    }
    statusDiv.innerHTML = '';
    statusDiv.textContent = message;
    applyStatusStyle(statusDiv, type);
};

/**
 * Show status as HTML.
 */
const showStatusHtml = (html) => {
    const statusDiv = document.getElementById('aiprovider_pollinations_status');
    if (!statusDiv) {
        return;
    }
    statusDiv.innerHTML = html;
};

/**
 * Apply status styling.
 */
const applyStatusStyle = (el, type) => {
    el.style.padding = '8px 12px';
    el.style.borderRadius = '6px';
    el.style.marginBottom = '10px';

    switch (type) {
        case 'success':
            el.style.backgroundColor = '#d4edda';
            el.style.color = '#155724';
            el.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            el.style.backgroundColor = '#f8d7da';
            el.style.color = '#721c24';
            el.style.border = '1px solid #f5c6cb';
            break;
        default:
            el.style.backgroundColor = '#e2e3e5';
            el.style.color = '#383d41';
            el.style.border = '1px solid #d6d8db';
    }
};

/**
 * Toggle button visibility.
 */
const toggleButtons = (connected) => {
    const buttons = document.querySelectorAll('#aiprovider_pollinations_byop_container button');
    if (buttons.length >= 2) {
        buttons[0].style.display = connected ? 'none' : 'inline-block';
        buttons[1].style.display = connected ? 'inline-block' : 'none';
    }
};
