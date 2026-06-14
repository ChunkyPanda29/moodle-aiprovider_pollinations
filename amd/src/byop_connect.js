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
 * BYOP Connect module — Pollinations Redirect Flow.
 *
 * Opens a popup window to enter.pollinations.ai/authorize.
 * After the user authorizes, Pollinations redirects back to Moodle
 * with the API key in the URL fragment (#api_key=sk_...).
 * This module detects the redirect, saves the key, and closes the popup.
 *
 * @module     aiprovider_pollinations/byop_connect
 * @copyright  2026 Krissy Painter
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import {get_string as getString} from 'core/str';
import Notification from 'core/notification';

// Pollinations BYOP configuration.
const AUTHORIZE_URL = 'https://enter.pollinations.ai/authorize';
const APP_KEY = 'pk_JpcODXmxY8ORHqe6';

/**
 * Initialise the BYOP connect UI.
 */
export const init = () => {
    const container = document.getElementById('aiprovider_pollinations_byop_container');
    if (!container) {
        return;
    }

    // Build the UI.
    container.innerHTML = '';
    container.style.padding = '10px 0';

    // Status display.
    const statusDiv = document.createElement('div');
    statusDiv.id = 'aiprovider_pollinations_status';
    statusDiv.style.marginBottom = '10px';
    container.appendChild(statusDiv);

    // Connect button.
    const connectBtn = document.createElement('button');
    connectBtn.type = 'button';
    connectBtn.className = 'btn btn-primary';
    connectBtn.textContent = '🔗 Connect to Pollinations';
    connectBtn.style.marginRight = '8px';
    connectBtn.addEventListener('click', startRedirectFlow);
    container.appendChild(connectBtn);

    // Disconnect button.
    const disconnectBtn = document.createElement('button');
    disconnectBtn.type = 'button';
    disconnectBtn.className = 'btn btn-secondary';
    disconnectBtn.textContent = 'Disconnect';
    disconnectBtn.style.display = 'none';
    disconnectBtn.addEventListener('click', disconnect);
    container.appendChild(disconnectBtn);

    // Check initial status.
    checkStatus();
};

/**
 * Start the BYOP redirect flow in a popup window.
 */
const startRedirectFlow = async() => {
    // Generate CSRF state token.
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('pollinations_byop_state', state);

    // Build the authorize URL.
    // redirect_uri points back to this admin page — Pollinations will redirect
    // the popup back here with #api_key=sk_...&state=...
    const params = new URLSearchParams({
        redirect_uri: window.location.href.split('#')[0],
        client_id: APP_KEY,
        state: state,
    });

    const authUrl = `${AUTHORIZE_URL}?${params.toString()}`;

    // Open popup.
    const popup = window.open(authUrl, 'pollinations_auth', 'width=600,height=700,scrollbars=yes');

    if (!popup) {
        Notification.addNotification({
            message: 'Popup blocked. Please allow popups for this page and try again.',
            type: 'error',
        });
        return;
    }

    // Poll the popup to detect when it redirects back to our origin.
    const pollTimer = setInterval(() => {
        try {
            if (popup.closed) {
                clearInterval(pollTimer);
                // Popup was closed without completing — check if we got connected.
                checkStatus();
                return;
            }

            // Try to read popup URL (only works when same-origin after redirect).
            if (popup.location.hostname === window.location.hostname) {
                const hash = popup.location.hash;
                const hashParams = new URLSearchParams(hash.slice(1));
                const apiKey = hashParams.get('api_key');
                const error = hashParams.get('error');
                const returnedState = hashParams.get('state');

                if (error) {
                    clearInterval(pollTimer);
                    popup.close();
                    showStatus('❌ Authorization denied.', 'error');
                    return;
                }

                if (apiKey) {
                    clearInterval(pollTimer);

                    // Verify state for CSRF protection.
                    const savedState = sessionStorage.getItem('pollinations_byop_state');
                    if (returnedState && savedState && returnedState !== savedState) {
                        popup.close();
                        showStatus('❌ Security check failed. Please try again.', 'error');
                        return;
                    }

                    // Save the key via AJAX.
                    saveKey(apiKey).then(() => {
                        popup.close();
                        sessionStorage.removeItem('pollinations_byop_state');
                        showStatus('✅ Successfully connected to Pollinations!', 'success');
                        toggleButtons(true);
                    }).catch(Notification.exception);
                }
            }
        } catch (e) {
            // Cross-origin — popup is still on Pollinations domain, keep waiting.
        }
    }, 500); // Check every 500ms.

    // Timeout after 5 minutes.
    setTimeout(() => {
        if (!popup.closed) {
            clearInterval(pollTimer);
            popup.close();
            showStatus('⏰ Authorization timed out. Please try again.', 'error');
        }
    }, 300000);
};

/**
 * Save the API key via the external API.
 *
 * @param {string} apikey
 * @return {Promise}
 */
const saveKey = (apikey) => {
    const request = {
        methodname: 'aiprovider_pollinations_save_key',
        args: {apikey: apikey},
    };
    return Ajax.call([request])[0];
};

/**
 * Disconnect by clearing the stored API key.
 */
const disconnect = async() => {
    const request = {
        methodname: 'aiprovider_pollinations_disconnect',
        args: {},
    };
    try {
        await Ajax.call([request])[0];
        showStatus('Disconnected from Pollinations.', 'info');
        toggleButtons(false);
    } catch (e) {
        Notification.exception(e);
    }
};

/**
 * Check current connection status and update UI.
 */
const checkStatus = async() => {
    const request = {
        methodname: 'aiprovider_pollinations_get_status',
        args: {},
    };
    try {
        const result = await Ajax.call([request])[0];
        if (result.connected) {
            let msg = '✅ Connected to Pollinations';
            if (result.balance !== undefined && result.balance !== null) {
                msg += ` — Balance: ${result.balance} pollen`;
            }
            showStatus(msg, 'success');
            toggleButtons(true);
        } else {
            showStatus('⚪ Not connected. Click "Connect to Pollinations" to get started.', 'info');
            toggleButtons(false);
        }
    } catch (e) {
        // Silently fail — external API may not be available during install.
        showStatus('⚪ Not connected. Click "Connect to Pollinations" to get started.', 'info');
    }
};

/**
 * Show a status message.
 *
 * @param {string} message
 * @param {string} type 'success', 'error', or 'info'
 */
const showStatus = (message, type) => {
    const statusDiv = document.getElementById('aiprovider_pollinations_status');
    if (!statusDiv) {
        return;
    }
    statusDiv.textContent = message;
    statusDiv.style.padding = '8px 12px';
    statusDiv.style.borderRadius = '6px';
    statusDiv.style.marginBottom = '10px';

    switch (type) {
        case 'success':
            statusDiv.style.backgroundColor = '#d4edda';
            statusDiv.style.color = '#155724';
            statusDiv.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.style.border = '1px solid #f5c6cb';
            break;
        default:
            statusDiv.style.backgroundColor = '#e2e3e5';
            statusDiv.style.color = '#383d41';
            statusDiv.style.border = '1px solid #d6d8db';
    }
};

/**
 * Toggle connect/disconnect button visibility.
 *
 * @param {bool} connected
 */
const toggleButtons = (connected) => {
    const buttons = document.querySelectorAll('#aiprovider_pollinations_byop_container button');
    if (buttons.length >= 2) {
        buttons[0].style.display = connected ? 'none' : 'inline-block'; // Connect.
        buttons[1].style.display = connected ? 'inline-block' : 'none'; // Disconnect.
    }
};
