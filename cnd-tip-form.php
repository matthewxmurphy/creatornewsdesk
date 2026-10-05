<?php
/**
 * Plugin Name: CND Tip Form
 * Description: Simple tip submission form handler
 * Version: 2026.10.05.001
  * Author: MatthewxMurphy.com
  * Author URI: https://MatthewxMurphy.com
  * License: MIT
  * License URI: https://opensource.org/license/mit
  * Copyright: 2026 MatthewxMurphy.com
 * Modified: 2026-10-05 (source metadata and maintenance documentation)
 * SPDX-License-Identifier: MIT
 */
/**
 * Maintenance notes (2026.10.05.001; MatthewxMurphy.com).
 * Public form submissions sanitize values and send mail to the configured Newsdesk address. Current source has no nonce/rate-limit gate; review abuse protection before production use rather than assuming the metadata change adds it.
 * Read the package runbook before changing permissions, persistence or side effects.
 * SPDX-License-Identifier: MIT
 */


add_action('admin_post_cnd_tip_submission', 'cnd_handle_tip_submission');
add_action('admin_post_nopriv_cnd_tip_submission', 'cnd_handle_tip_submission');

function cnd_handle_tip_submission() {
    $name = sanitize_text_field($_POST['tip_name'] ?? '');
    $email = sanitize_email($_POST['tip_email'] ?? '');
    $subject = sanitize_text_field($_POST['tip_subject'] ?? '');
    $message = sanitize_textarea_field($_POST['tip_message'] ?? '');
    
    if (empty($name) || empty($subject) || empty($message)) {
        wp_redirect(add_query_arg('tip_error', '1', '/send-a-tip/'));
        exit;
    }
    
    $to = 'hello@creatornewsdesk.com';
    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . $name . ' <' . ($email ?: 'noreply@creatornewsdesk.com') . '>'
    );
    
    $body = "Name: $name\n";
    $body .= "Email: $email\n";
    $body .= "Subject: $subject\n\n";
    $body .= "Message:\n$message\n";
    
    wp_mail($to, '[CND Tip] ' . $subject, $body, $headers);
    
    wp_redirect(add_query_arg('tip_sent', '1', '/send-a-tip/'));
    exit;
}
