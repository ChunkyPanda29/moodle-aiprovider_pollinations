<?php
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

namespace aiprovider_pollinations\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * External API class for BYOP connection management.
 *
 * Uses the Pollinations Redirect Flow (web app flow):
 * 1. Admin clicks "Connect to Pollinations"
 * 2. Popup opens to enter.pollinations.ai/authorize
 * 3. User authorizes on Pollinations
 * 4. Popup redirects back to Moodle with #api_key=sk_...
 * 5. JavaScript saves the key via this API
 *
 * @package    aiprovider_pollinations
 * @copyright  2026 Krissy Painter
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class byop extends external_api {
    /**
     * Save the API key obtained from the BYOP redirect flow.
     *
     * @param string $apikey The API key (sk_...) returned by Pollinations.
     * @return array
     */
    public static function save_key(string $apikey): array {
        require_sesskey();

        $params = self::validate_parameters(self::save_key_parameters(), [
            'apikey' => $apikey,
        ]);

        // Basic validation — must look like a Pollinations secret key.
        if (!preg_match('/^sk_/', $params['apikey'])) {
            return [
                'success' => false,
                'error' => 'Invalid API key format',
            ];
        }

        set_config('apikey', $params['apikey'], 'aiprovider_pollinations');

        return [
            'success' => true,
        ];
    }

    /**
     * Parameters for save_key.
     *
     * @return external_function_parameters
     */
    public static function save_key_parameters(): external_function_parameters {
        return new external_function_parameters([
            'apikey' => new external_value(PARAM_RAW, 'The Pollinations API key'),
        ]);
    }

    /**
     * Return structure for save_key.
     *
     * @return external_single_structure
     */
    public static function save_key_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the key was saved'),
        ]);
    }

    /**
     * Get the current BYOP connection status.
     *
     * @return array
     */
    public static function get_status(): array {
        require_sesskey();

        $apikey = get_config('aiprovider_pollinations', 'apikey');
        $connected = !empty($apikey);

        $result = [
            'connected' => $connected,
        ];

        if ($connected) {
            // Try to fetch balance for a richer status display.
            $provider = new \aiprovider_pollinations\provider();
            $balance = $provider->fetch_balance();
            if ($balance !== null) {
                $result['balance'] = $balance['total'] ?? $balance['balance'] ?? null;
            }
        }

        return $result;
    }

    /**
     * Parameters for get_status.
     *
     * @return external_function_parameters
     */
    public static function get_status_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Return structure for get_status.
     *
     * @return external_single_structure
     */
    public static function get_status_returns(): external_single_structure {
        return new external_single_structure([
            'connected' => new external_value(PARAM_BOOL, 'Whether connected'),
            'balance' => new external_value(PARAM_FLOAT, 'Current pollen balance', VALUE_OPTIONAL),
        ]);
    }

    /**
     * Disconnect by clearing the stored API key.
     *
     * @return array
     */
    public static function disconnect(): array {
        require_sesskey();

        set_config('apikey', '', 'aiprovider_pollinations');

        return [
            'success' => true,
        ];
    }

    /**
     * Parameters for disconnect.
     *
     * @return external_function_parameters
     */
    public static function disconnect_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Return structure for disconnect.
     *
     * @return external_single_structure
     */
    public static function disconnect_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether disconnection was successful'),
        ]);
    }
}
