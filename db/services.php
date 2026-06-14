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

/**
 * External function definitions for BYOP redirect flow.
 *
 * @package    aiprovider_pollinations
 * @copyright  2026 Krissy Painter
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'aiprovider_pollinations_save_key' => [
        'classname' => 'aiprovider_pollinations\\external\\byop',
        'methodname' => 'save_key',
        'classpath' => '',
        'description' => 'Save the Pollinations API key from BYOP redirect flow',
        'type' => 'write',
        'ajax' => true,
        'services' => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],
    'aiprovider_pollinations_get_status' => [
        'classname' => 'aiprovider_pollinations\\external\\byop',
        'methodname' => 'get_status',
        'classpath' => '',
        'description' => 'Get the current BYOP connection status',
        'type' => 'read',
        'ajax' => true,
        'services' => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],
    'aiprovider_pollinations_disconnect' => [
        'classname' => 'aiprovider_pollinations\\external\\byop',
        'methodname' => 'disconnect',
        'classpath' => '',
        'description' => 'Disconnect the BYOP connection',
        'type' => 'write',
        'ajax' => true,
        'services' => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],
];
