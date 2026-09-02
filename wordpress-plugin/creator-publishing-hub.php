<?php
/**
 * Plugin Name: Creator Publishing Hub
 * Description: Multi-site Image Desk, controlled publishing, media, and social queue workflow.
 * Version: 1.1.64
 * Update URI: https://thefactologydaily.com/wp-json/net30-updates/v1/plugin/creator-publishing-hub
 * Author: Creator Publishing Hub
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Creator_Publishing_Hub {
    private const OPTION_KEY = 'cph_autopilot_settings';
    private const OPTION_IMAGE_ACTIVITY_LOG = 'cph_image_activity_log';
    private const OPTION_IMAGE_AUDIT_REVIEWS = 'cph_image_audit_reviews';
    private const OPTION_IMAGE_AUDIT_SNAPSHOT = 'cph_image_audit_snapshot';
    private const OPTION_AUDIO_AUTOMATION_RUNS = 'cph_audio_automation_runs';
    private const OPTION_INDEXNOW_KEY = 'cph_indexnow_key';
    private const OPTION_INDEXNOW_QUEUE = 'cph_indexnow_queue';
    private const OPTION_INDEXNOW_LAST_RESULT = 'cph_indexnow_last_result';
    private const OPTION_EXTENSION_CAPTURE_LOG = 'cph_extension_capture_log';
    private const REST_NAMESPACE = 'creator-publishing-hub/v1';
    private const VERSION = '1.1.64';
    public const ADMIN_MENU_SLUG = 'creator-publishing-hub';
    private const UPDATE_ENDPOINT = 'https://thefactologydaily.com/wp-json/net30-updates/v1/plugin/creator-publishing-hub';
    private const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
    private const SECURITY_TRANSIENT_PREFIX = 'cph_login_guard_';
    private const META_SOURCES = '_cph_source_urls';
    private const META_CONFIDENCE = '_cph_confidence';
    private const META_WORKER = '_cph_worker';
    private const META_SOCIAL = '_cph_social_caption';
    private const META_RISK = '_cph_risk_flags';
    private const META_IMAGE_PROMPT = '_cph_image_prompt';
    private const META_FEATURED_IMAGE_PROMPT = '_cph_featured_image_prompt';
    private const META_SOCIAL_IMAGE_PROMPT = '_cph_social_image_prompt';
    private const META_STORY_IMAGE_PROMPT = '_cph_story_image_prompt';
    private const META_STORY_CAPTION = '_cph_story_caption';
    private const META_STORY_REQUIRED = '_cph_story_required';
    private const META_IMAGE_REQUIRED = '_cph_image_required';
    private const META_IMAGE_REDO_REQUIRED = '_cph_image_redo_required';
    private const META_IMAGE_WATERMARK = '_cph_image_watermark';
    private const META_IMAGE_API_TRIGGER_USER_ID = '_cph_image_api_trigger_user_id';
    private const META_IMAGE_API_TRIGGER_USER_LOGIN = '_cph_image_api_trigger_user_login';
    private const META_IMAGE_API_TRIGGER_USER_NAME = '_cph_image_api_trigger_user_name';
    private const META_IMAGE_API_TRIGGERED_AT = '_cph_image_api_triggered_at';
    private const META_FEATURED_IMAGE_PROVIDER = '_cph_featured_image_provider';
    private const META_MANUAL_SOCIAL_IMAGE = '_cph_manual_social_image';
    private const META_ALTERNATE_MAIN_IMAGES = '_cph_alternate_main_images';
    private const META_SECONDARY_SOCIAL_IMAGES = '_cph_secondary_social_images';
    private const META_IMAGE_ORIGIN = '_cph_image_origin';
    private const META_IMAGE_CREDIT = '_cph_image_credit';
    private const META_IMAGE_ATTACHED_AT = '_cph_image_attached_at';
    private const META_IMAGE_READY_FOR_PUBLISH = '_cph_image_ready_for_publish';
    private const META_IMAGE_READY_AT = '_cph_image_ready_at';
    private const META_IMAGE_CLAIM_USER = '_cph_image_claim_user';
    private const META_IMAGE_CLAIMED_AT = '_cph_image_claimed_at';
    private const META_IMAGE_CLAIM_EXPIRES = '_cph_image_claim_expires';
    private const META_IMAGE_PROCESSING_STARTED_BY = '_cph_image_processing_started_by';
    private const META_IMAGE_PROCESSING_STARTED_AT = '_cph_image_processing_started_at';
    private const META_IMAGE_COMPLETED_BY = '_cph_image_completed_by';
    private const META_IMAGE_COMPLETED_AT = '_cph_image_completed_at';
    private const META_IMAGE_COMPLETION_SECONDS = '_cph_image_completion_seconds';
    private const META_VIDEO_ATTACHMENT_ID = '_cph_video_attachment_id';
    private const META_VIDEO_ATTACHED_AT = '_cph_video_attached_at';
    private const META_FACEBOOK_VIDEO_ID = '_cph_facebook_video_id';
    private const META_AUDIO_ATTACHMENT_ID = '_cph_audio_attachment_id';
    private const META_AUDIO_ATTACHED_AT = '_cph_audio_attached_at';
    private const META_AUDIO_ENGINE = '_cph_audio_engine';
    private const META_AUDIO_TEXT_HASH = '_cph_audio_text_hash';
    private const META_AUDIO_DURATION_SECONDS = '_cph_audio_duration_seconds';
    private const META_REPOST_SOURCE_ID = '_cph_repost_source_id';
    private const META_REPOSTED_AT = '_cph_reposted_at';
    private const META_REDIRECT_TO_URL = '_cph_redirect_to_url';
    private const META_SOCIAL_QUEUE_STATUS = '_cph_social_queue_status';
    private const META_SOCIAL_QUEUED_AT = '_cph_social_queued_at';
    private const META_SOCIAL_SHARED_AT = '_cph_social_shared_at';
    private const META_SOCIAL_SHARE_ID = '_cph_social_share_id';
    private const META_PAGE_PROFILE = '_cph_page_profile';
    private const META_SITE_NAME = '_cph_site_name';
    private const META_ENGAGEMENT_QUESTION = '_cph_engagement_question';
    private const META_TREND_QUERY = '_cph_trend_query';
    private const META_TITLE_HOOK_ID = '_cph_title_hook_id';
    private const META_TITLE_HOOK_TEMPLATE = '_cph_title_hook_template';
    private const META_IMAGE_TREND_SCORE = '_cph_image_trend_score';
    private const IMAGE_CLAIM_TTL_SECONDS = 3600;
    private const IMAGE_CLAIM_BATCH_SIZE = 10;
    private const IMAGE_PROCESSING_BATCH_SIZE = 10;
    private const FLEET_PRIMARY_BATCH_SIZE = 8;
    private const FLEET_STANDARD_BATCH_SIZE = 4;
    private const IMAGE_SESSION_GOAL = 20;
    private const USER_META_IMAGE_COMPLETION_COUNT = '_cph_image_completion_count';
    private const USER_META_IMAGE_COMPLETION_TOTAL_SECONDS = '_cph_image_completion_total_seconds';
    private const USER_META_EXTRA_MAIN_IMAGE_COUNT = '_cph_extra_main_image_count';
    private const USER_META_STORY_IMAGE_COUNT = '_cph_story_image_count';
    private const USER_META_IMAGE_BATCH_EXPIRES = '_cph_image_batch_expires';
    private const TRANSIENT_PUBLIC_WORK_STATUS_METRICS = 'cph_public_work_status_metrics_v2';
    private bool $rendered_matthew_author_brands = false;

    public function __construct() {
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_menu', [$this, 'remove_legacy_post_menu_entries'], 999);
        add_action('wp_dashboard_setup', [$this, 'register_dashboard_widgets']);
        add_action('admin_init', [$this, 'ensure_helper_role']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_init', [$this, 'redirect_legacy_admin_slugs']);
        add_action('init', [$this, 'route_nimda_admin_alias'], 0);
        add_action('init', [$this, 'ensure_indexnow_key'], 5);
        add_action('parse_request', [$this, 'serve_search_metadata_requests'], 0);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_image_tools']);
        add_action('admin_head', [$this, 'render_admin_branding']);
        add_action('admin_head', [$this, 'render_extension_bridge_meta']);
        add_action('wp_head', [$this, 'render_extension_bridge_meta']);
        add_action('admin_bar_menu', [$this, 'brand_admin_bar'], 11);
        add_action('admin_bar_menu', [$this, 'add_image_tools_admin_bar_menu'], 82);
        add_filter('admin_body_class', [$this, 'admin_body_class']);
        add_filter('login_body_class', [$this, 'login_body_class']);
        add_action('admin_post_cph_upload_image', [$this, 'handle_image_upload']);
        add_action('wp_ajax_cph_upload_image_ajax', [$this, 'handle_image_upload_ajax']);
        add_action('wp_ajax_cph_upload_main_image_ajax', [$this, 'handle_auxiliary_image_upload_ajax']);
        add_action('wp_ajax_cph_upload_story_image_ajax', [$this, 'handle_auxiliary_image_upload_ajax']);
        add_action('wp_ajax_cph_delete_managed_image_ajax', [$this, 'handle_delete_managed_image_ajax']);
        add_action('wp_ajax_cph_delete_all_managed_images_ajax', [$this, 'handle_delete_all_managed_images_ajax']);
        add_action('wp_ajax_cph_image_desk_search', [$this, 'handle_image_desk_search_ajax']);
        add_action('wp_ajax_cph_grab_image_batch', [$this, 'handle_grab_image_batch_ajax']);
        add_action('wp_ajax_cph_start_image_processing', [$this, 'handle_start_image_processing_ajax']);
        add_action('wp_ajax_cph_create_image_draft', [$this, 'handle_create_image_draft_ajax']);
        add_action('wp_ajax_cph_run_paid_image_api', [$this, 'handle_run_paid_image_api_ajax']);
        add_action('admin_post_cph_trash_image_draft', [$this, 'handle_trash_image_draft']);
        add_action('admin_post_cph_replace_post_image', [$this, 'handle_replace_post_image']);
        add_action('admin_post_cph_add_story_image', [$this, 'handle_add_story_image']);
        add_action('admin_post_cph_delete_featured_image', [$this, 'handle_delete_featured_image']);
        add_action('admin_post_cph_delete_story_image', [$this, 'handle_delete_story_image']);
        add_action('admin_post_cph_delete_all_post_images', [$this, 'handle_delete_all_post_images']);
        add_action('admin_post_cph_audit_image_event', [$this, 'handle_audit_image_event']);
        add_action('admin_post_cph_run_image_inventory_audit', [$this, 'handle_run_image_inventory_audit']);
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('init', [$this, 'register_image_production_feed']);
        add_action('login_enqueue_scripts', [$this, 'render_login_branding']);
        add_action('wp_login_failed', [$this, 'record_failed_login']);
        add_action('wp_login', [$this, 'clear_failed_login'], 10, 2);
        add_action('send_headers', [$this, 'send_security_headers']);
        add_action('wp_head', [$this, 'render_audio_player_styles']);
        add_action('wp_footer', [$this, 'render_frontend_image_tool_modal']);
        add_filter('the_content', [$this, 'prepend_audio_player'], 12);
        add_filter('post_thumbnail_html', [$this, 'wrap_frontend_post_thumbnail'], 20, 5);
        add_action('template_redirect', [$this, 'redirect_duplicate_post'], 1);
        add_action('template_redirect', [$this, 'block_author_enumeration'], 0);
        add_action('loop_start', [$this, 'maybe_render_matthew_author_brands']);
        add_action('pre_get_posts', [$this, 'exclude_redirected_posts']);
        add_action('pre_get_posts', [$this, 'filter_ready_queue_admin_posts']);
        add_action('transition_post_status', [$this, 'maybe_queue_indexnow_from_status_change'], 10, 3);
        add_action('before_delete_post', [$this, 'queue_indexnow_deleted_post'], 10, 2);
        add_action('trashed_post', [$this, 'queue_indexnow_post_id']);
        add_action('cph_indexnow_flush', [$this, 'flush_indexnow_queue']);
        add_filter('robots_txt', [$this, 'append_search_sitemaps_to_robots'], 100000, 2);
        add_filter('rest_post_query', [$this, 'exclude_redirected_posts_from_rest'], 10, 2);
        add_filter('authenticate', [$this, 'guard_authentication'], 30, 3);
        add_filter('login_errors', [$this, 'generic_login_error']);
        add_filter('login_headerurl', [$this, 'login_header_url']);
        add_filter('login_headertext', [$this, 'login_header_text']);
        add_filter('login_url', [$this, 'login_url_alias'], 10, 3);
        add_filter('site_url', [$this, 'site_url_nimda_login_alias'], 10, 4);
        add_filter('login_title', [$this, 'login_title'], 10, 2);
        add_filter('admin_title', [$this, 'admin_title'], 10, 2);
        add_filter('admin_footer_text', [$this, 'admin_footer_text']);
        add_filter('update_footer', '__return_empty_string', 999);
        add_filter('xmlrpc_enabled', [$this, 'xmlrpc_enabled']);
        add_filter('rest_endpoints', [$this, 'filter_rest_endpoints']);
        add_filter('publicize_should_publicize_published_post', [$this, 'disable_publicize_for_queued_posts'], 10, 2);
        add_filter('jetpack_publicize_should_publicize_published_post', [$this, 'disable_publicize_for_queued_posts'], 10, 2);
        add_filter('site_transient_update_plugins', [$this, 'check_for_plugin_update']);
        add_filter('plugins_api', [$this, 'plugin_update_info'], 10, 3);
        add_shortcode('creator_publishing_hub_brands', [$this, 'creator_publishing_hub_brands_shortcode']);
    }

    public static function activate(): void {
        if (!get_option(self::OPTION_KEY)) {
            add_option(self::OPTION_KEY, self::defaults());
        }

        self::add_helper_role();
    }

    private static function add_helper_role(): void {
        add_role('cph_image_helper', 'Publishing Desk Image Helper', [
            'read' => true,
            'edit_posts' => true,
            'edit_others_posts' => true,
            'upload_files' => true,
        ]);
    }

    public function ensure_helper_role(): void {
        if (!get_role('cph_image_helper')) {
            self::add_helper_role();
        }
    }

    private static function defaults(): array {
        return [
            'worker_token_hash' => '',
            'worker_token_last_set' => '',
            'autopublish_enabled' => '0',
            'default_status' => 'draft',
            'minimum_confidence' => '0.82',
            'minimum_sources' => '2',
            'site_brand_name' => get_bloginfo('name') ?: 'Publishing Desk',
            'site_brand_tagline' => get_bloginfo('description') ?: 'Useful information, clearly presented.',
            'page_profile' => sanitize_key((string) wp_parse_url(home_url('/'), PHP_URL_HOST)),
            'social_call_to_action' => 'Read more on ' . (get_bloginfo('name') ?: 'our site'),
            'openai_image_api_key' => '',
            'image_editorial_mode' => 'auto',
            'image_prompt_context' => 'auto',
            'image_logo_handling' => 'auto',
            'image_safe_padding' => '40',
            'image_custom_direction' => '',
            'indexnow_enabled' => '1',
            'ai_sitemap_enabled' => '1',
            'llms_txt_enabled' => '1',
            'yandex_verification_code' => '89d8a5c6d03fff47',
            'login_guard_enabled' => '1',
            'login_max_failures' => '5',
            'login_window_minutes' => '15',
            'login_lockout_minutes' => '30',
            'disable_xmlrpc' => '1',
            'hide_rest_users' => '1',
            'security_headers' => '1',
            'blocked_terms' => "medical advice\nfinancial advice\nlegal advice\nminor\nchildren killed\ndead\nkilled\ninjured\ncrime accusation\npolitics\nconspiracy\nshooting\nsuicide",
        ];
    }

    private function settings(): array {
        $settings = get_option(self::OPTION_KEY, []);
        $merged = array_merge(self::defaults(), is_array($settings) ? $settings : []);

        if (stripos((string) ($merged['site_brand_name'] ?? ''), 'net30') !== false) {
            $merged['site_brand_name'] = get_bloginfo('name') ?: 'Publishing Desk';
        }

        if (stripos((string) ($merged['site_brand_tagline'] ?? ''), 'net30') !== false) {
            $merged['site_brand_tagline'] = get_bloginfo('description') ?: 'Useful information, clearly presented.';
        }

        return $merged;
    }

    public function render_login_branding(): void {
        $settings = $this->settings();
        $brand = trim((string) $settings['site_brand_name']) ?: get_bloginfo('name');
        $tagline = trim((string) $settings['site_brand_tagline']);
        $mark_url = $this->brand_mark_url();
        ?>
        <?php if ($mark_url !== '') : ?>
            <link rel="icon" href="<?php echo esc_url($mark_url); ?>">
            <link rel="apple-touch-icon" href="<?php echo esc_url($mark_url); ?>">
        <?php endif; ?>
        <style>
            :root {
                --cph-terminal-bg: #020705;
                --cph-terminal-grid: rgba(0, 255, 148, .09);
                --cph-terminal-ink: #d8ffe8;
                --cph-terminal-muted: #79a890;
                --cph-terminal-green: #20ff8a;
                --cph-terminal-blue: #42d7ff;
                --cph-terminal-line: rgba(32, 255, 138, .42);
                --cph-terminal-panel: rgba(1, 12, 8, .9);
            }
            html,
            body.login {
                min-height: 100%;
            }
            body.login {
                align-items: center;
                background:
                    radial-gradient(circle at 18% 16%, rgba(66, 215, 255, .18), transparent 30%),
                    radial-gradient(circle at 82% 72%, rgba(32, 255, 138, .16), transparent 36%),
                    linear-gradient(135deg, rgba(2, 7, 5, .95), rgba(3, 15, 12, .98) 48%, rgba(0, 0, 0, 1));
                color: var(--cph-terminal-ink);
                display: flex;
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
                justify-content: center;
                margin: 0;
                min-height: 100vh;
                overflow-x: hidden;
            }
            body.login::before {
                background:
                    repeating-linear-gradient(0deg, rgba(32, 255, 138, .05) 0 1px, transparent 1px 4px),
                    repeating-linear-gradient(90deg, var(--cph-terminal-grid) 0 1px, transparent 1px 96px),
                    repeating-linear-gradient(0deg, rgba(66, 215, 255, .055) 0 1px, transparent 1px 96px);
                content: "";
                inset: 0;
                opacity: .78;
                pointer-events: none;
                position: fixed;
            }
            body.login::after {
                bottom: 22px;
                color: rgba(216, 255, 232, .48);
                content: "PRIVATE PUBLISHING NODE // /nimda";
                display: block;
                font-size: 12px;
                font-weight: 700;
                left: 28px;
                letter-spacing: .18em;
                position: fixed;
                text-align: center;
                text-transform: uppercase;
            }
            #login {
                align-self: center;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: minmax(320px, 1fr) minmax(360px, 520px);
                gap: clamp(24px, 5vw, 68px);
                margin: 0;
                max-width: 1180px;
                min-height: min(720px, calc(100vh - 80px));
                padding: clamp(22px, 4vw, 46px);
                position: relative;
                width: min(100%, 1180px) !important;
                z-index: 1;
            }
            #login::before {
                border: 1px solid var(--cph-terminal-line);
                box-shadow:
                    0 0 0 1px rgba(32, 255, 138, .08) inset,
                    0 0 80px rgba(32, 255, 138, .12),
                    0 24px 90px rgba(0, 0, 0, .56);
                content: "";
                inset: 12px;
                pointer-events: none;
                position: absolute;
            }
            #login h1 {
                align-self: center;
                margin: 0;
                text-align: left;
            }
            .login h1 a {
                background: none !important;
                color: var(--cph-terminal-ink);
                display: block;
                margin: 0;
                outline: 0;
                pointer-events: none;
                text-decoration: none;
                text-indent: 0;
                width: auto;
            }
            .login h1 a::before {
                color: var(--cph-terminal-green);
                content: "PUBLISHING ACCESS";
                display: block;
                font-size: clamp(42px, 7vw, 86px);
                font-weight: 900;
                letter-spacing: -.04em;
                line-height: .92;
                text-shadow: 0 0 22px rgba(32, 255, 138, .42);
                text-transform: uppercase;
            }
            .login h1 a::after {
                color: var(--cph-terminal-blue);
                content: "<?php echo esc_js($brand); ?>";
                display: block;
                font-size: clamp(15px, 1.5vw, 20px);
                font-weight: 800;
                letter-spacing: .18em;
                margin-top: 22px;
                text-transform: uppercase;
            }
            .login h1::after {
                border-left: 2px solid var(--cph-terminal-green);
                color: rgba(216, 255, 232, .82);
                content: "> <?php echo esc_js($tagline !== '' ? $tagline : 'Publishing operations'); ?>";
                display: block;
                font-size: clamp(16px, 2vw, 24px);
                font-weight: 700;
                letter-spacing: .01em;
                line-height: 1.35;
                margin-top: 28px;
                max-width: 560px;
                padding-left: 16px;
            }
            .login h1::before {
                color: var(--cph-terminal-muted);
                content: "BOOT://PRIVATE_PUBLISHING_CONSOLE";
                display: block;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .2em;
                margin-bottom: 28px;
                text-transform: uppercase;
            }
            #loginform,
            #lostpasswordform,
            #resetpassform,
            .login .message,
            .login .notice,
            .login .success {
                position: relative;
                z-index: 2;
            }
            .login form {
                align-self: center;
                background:
                    linear-gradient(180deg, rgba(10, 34, 23, .94), rgba(1, 10, 7, .96));
                border: 1px solid var(--cph-terminal-line);
                border-radius: 0;
                box-shadow:
                    0 0 0 1px rgba(66, 215, 255, .08) inset,
                    0 0 50px rgba(32, 255, 138, .12),
                    0 24px 70px rgba(0, 0, 0, .62);
                color: var(--cph-terminal-ink);
                box-sizing: border-box;
                margin: 0;
                min-height: 430px;
                padding: clamp(26px, 4vw, 42px);
                width: min(100%, 520px) !important;
            }
            .login form::before {
                <?php if ($mark_url !== '') : ?>
                    background-image: url("<?php echo esc_url($mark_url); ?>");
                    background-position: left center;
                    background-repeat: no-repeat;
                    background-size: contain;
                    content: "";
                    display: block;
                    filter: drop-shadow(0 0 12px rgba(32, 255, 138, .34));
                    height: 62px;
                    margin: 0 0 28px;
                    width: 84px;
                <?php else : ?>
                    color: var(--cph-terminal-green);
                    content: "<?php echo esc_js($brand); ?>";
                    display: block;
                    font-size: 18px;
                    font-weight: 800;
                    margin: 0 0 28px;
                <?php endif; ?>
            }
            .login label {
                color: var(--cph-terminal-ink);
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .12em;
                text-transform: uppercase;
            }
            .login label[for="user_login"] {
                font-size: 0;
            }
            .login label[for="user_login"]::before {
                content: "USER ID";
                font-size: 12px;
            }
            .login label[for="user_pass"] {
                font-size: 0;
            }
            .login label[for="user_pass"]::before {
                content: "ACCESS KEY";
                font-size: 12px;
            }
            .login form .input,
            .login input[type="text"],
            .login input[type="password"] {
                background: rgba(0, 0, 0, .42);
                border: 1px solid rgba(32, 255, 138, .32);
                border-radius: 0;
                box-shadow: none;
                color: var(--cph-terminal-green);
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
                font-size: 22px;
                min-height: 58px;
                padding: 10px 14px;
            }
            .login form .input:focus {
                border-color: var(--cph-terminal-green);
                box-shadow: 0 0 0 1px rgba(32, 255, 138, .38), 0 0 24px rgba(32, 255, 138, .16);
            }
            .login .forgetmenot label {
                color: rgba(216, 255, 232, .72);
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0;
                text-transform: none;
            }
            .login #nav a,
            .login #backtoblog a {
                color: var(--cph-terminal-blue);
                font-weight: 700;
                text-decoration: none;
            }
            .login #nav,
            .login #backtoblog {
                grid-column: 2;
                margin: 12px 0 0;
                padding: 0;
                text-align: left;
            }
            .login .button-primary {
                background: var(--cph-terminal-green);
                border: 1px solid rgba(216, 255, 232, .72);
                border-radius: 0;
                box-shadow: 0 0 28px rgba(32, 255, 138, .24);
                color: #001b10;
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
                font-weight: 800;
                min-height: 48px;
                padding: 0 22px;
                text-shadow: none;
                text-transform: uppercase;
            }
            .login .message,
            .login .notice,
            .login .success {
                align-self: center;
                background: rgba(1, 12, 8, .92);
                border: 1px solid rgba(66, 215, 255, .44);
                border-left: 4px solid var(--cph-terminal-blue);
                border-radius: 0;
                box-shadow: 0 0 28px rgba(66, 215, 255, .12);
                color: var(--cph-terminal-ink);
                grid-column: 2;
                margin: 0 0 14px;
            }
            .login .privacy-policy-page-link {
                display: none;
            }
            .language-switcher {
                display: none;
            }
            @media (max-width: 760px) {
                body.login::after {
                    display: none;
                }
                #login {
                    grid-template-columns: 1fr;
                    padding: 24px 18px;
                    width: min(100%, 620px);
                }
                #login h1 {
                    text-align: center;
                }
                .login h1 a {
                    margin: 0 auto;
                }
                .login h1::after {
                    margin-left: auto;
                    margin-right: auto;
                    text-align: center;
                }
                .login #nav,
                .login #backtoblog,
                .login .message,
                .login .notice,
                .login .success {
                    grid-column: 1;
                }
                .login form {
                    min-height: 0;
                    width: 100% !important;
                }
            }
            body.login #login h1 a {
                background: none !important;
                color: var(--cph-terminal-ink) !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                text-indent: 0 !important;
                width: auto !important;
            }
            body.login #login h1 a::before,
            body.login #login h1 a::after,
            body.login #login h1::before,
            body.login #login h1::after {
                text-indent: 0 !important;
            }
            body.login #loginform,
            body.login #lostpasswordform,
            body.login #resetpassform {
                background: linear-gradient(180deg, rgba(10, 34, 23, .94), rgba(1, 10, 7, .96)) !important;
                border: 1px solid var(--cph-terminal-line) !important;
                border-radius: 0 !important;
                box-shadow: 0 0 0 1px rgba(66, 215, 255, .08) inset, 0 0 50px rgba(32, 255, 138, .12), 0 24px 70px rgba(0, 0, 0, .62) !important;
                color: var(--cph-terminal-ink) !important;
            }
            body.login #loginform .input,
            body.login #lostpasswordform .input,
            body.login #resetpassform .input,
            body.login #loginform input[type="text"],
            body.login #loginform input[type="password"] {
                background: rgba(0, 0, 0, .42) !important;
                border: 1px solid rgba(32, 255, 138, .54) !important;
                border-radius: 0 !important;
                color: var(--cph-terminal-green) !important;
            }
            body.login #wp-submit {
                background: var(--cph-terminal-green) !important;
                border: 1px solid rgba(216, 255, 232, .72) !important;
                border-radius: 0 !important;
                box-shadow: 0 0 28px rgba(32, 255, 138, .24) !important;
                color: #001b10 !important;
            }
            body.login #login label,
            body.login #login .forgetmenot label {
                color: var(--cph-terminal-ink) !important;
            }
        </style>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                var submit = document.getElementById('wp-submit');
                if (submit) {
                    submit.value = 'ENTER CONSOLE';
                }
            });
        </script>
        <?php
    }

    public function route_nimda_admin_alias(): void {
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
        $path = '/' . trim((string) $path, '/');
        if ($path !== '/nimda') {
            return;
        }

        $action = isset($_REQUEST['action']) ? sanitize_key(wp_unslash((string) $_REQUEST['action'])) : '';
        if ($action === 'logout') {
            require_once ABSPATH . 'wp-login.php';
            exit;
        }

        $redirect_to = isset($_GET['redirect_to']) ? esc_url_raw(wp_unslash((string) $_GET['redirect_to'])) : '';
        if (is_user_logged_in()) {
            wp_safe_redirect($redirect_to !== '' ? $redirect_to : admin_url());
            exit;
        }

        require_once ABSPATH . 'wp-login.php';
        exit;
    }

    public function login_url_alias(string $login_url, string $redirect = '', bool $force_reauth = false): string {
        $args = [];
        if ($redirect !== '') {
            $args['redirect_to'] = $redirect;
        }
        if ($force_reauth) {
            $args['reauth'] = '1';
        }

        return add_query_arg($args, home_url('/nimda'));
    }

    public function site_url_nimda_login_alias(string $url, string $path, ?string $scheme, ?int $blog_id): string {
        if (!in_array((string) $scheme, ['login', 'login_post'], true)) {
            return $url;
        }

        if (!str_starts_with((string) $path, 'wp-login.php')) {
            return $url;
        }

        $parts = wp_parse_url($url);
        $query = [];
        if (!empty($parts['query'])) {
            parse_str((string) $parts['query'], $query);
        }

        return add_query_arg($query, home_url('/nimda'));
    }

    public function login_header_url(): string {
        return home_url('/');
    }

    public function login_header_text(): string {
        $settings = $this->settings();
        return trim((string) $settings['site_brand_name']) ?: get_bloginfo('name');
    }

    public function login_title(string $login_title, string $title): string {
        $settings = $this->settings();
        $brand = trim((string) $settings['site_brand_name']) ?: get_bloginfo('name');
        $page_title = trim(wp_strip_all_tags($title));

        return ($page_title !== '' ? $page_title . ' &lsaquo; ' : '') . esc_html($brand);
    }

    public function admin_title(string $admin_title, string $title): string {
        $settings = $this->settings();
        $brand = trim((string) $settings['site_brand_name']) ?: get_bloginfo('name');
        $page_title = trim(wp_strip_all_tags($title));

        return ($page_title !== '' ? $page_title . ' &lsaquo; ' : '') . $brand;
    }

    public function brand_admin_bar($wp_admin_bar): void {
        if (!is_admin_bar_showing() || !is_object($wp_admin_bar) || !method_exists($wp_admin_bar, 'add_node')) {
            return;
        }

        if (method_exists($wp_admin_bar, 'remove_node')) {
            $wp_admin_bar->remove_node('wp-logo');
        }

        $settings = $this->settings();
        $brand = trim((string) $settings['site_brand_name']) ?: get_bloginfo('name');
        $logo_url = $this->login_logo_url();
        $title = '';

        if ($logo_url !== '') {
            $title .= '<img class="cph-adminbar-logo" src="' . esc_url($logo_url) . '" alt="">';
        }

        $title .= '<span>' . esc_html($brand) . '</span>';

        $wp_admin_bar->add_node([
            'id' => 'site-name',
            'title' => $title,
            'href' => home_url('/'),
            'meta' => [
                'class' => 'cph-adminbar-site',
            ],
        ]);
    }

    public function add_image_tools_admin_bar_menu($wp_admin_bar): void {
        if (is_admin() || !is_admin_bar_showing() || !is_singular(['post', 'page']) || !current_user_can('edit_post', get_queried_object_id())) {
            return;
        }

        $post_id = get_queried_object_id();
        if ($post_id <= 0 || !is_object($wp_admin_bar) || !method_exists($wp_admin_bar, 'add_node')) {
            return;
        }

        $review_url = add_query_arg([
            'page' => 'creator-image-review',
            'fir_search' => $post_id,
        ], admin_url('admin.php'));

        $wp_admin_bar->add_node([
            'id' => 'cph-image-tools',
            'parent' => 'edit',
            'title' => 'Generate or replace images',
            'href' => $review_url,
        ]);
    }

    private function can_use_frontend_image_tools(int $post_id): bool {
        return !is_admin()
            && is_user_logged_in()
            && $post_id > 0
            && current_user_can('edit_post', $post_id)
            && current_user_can('upload_files');
    }

    private function frontend_image_tool_url(int $post_id): string {
        return add_query_arg([
            'page' => 'creator-needs-images',
            'fni_search' => $post_id,
        ], admin_url('admin.php'));
    }

    public function enqueue_frontend_image_tools(): void {
        if (is_admin() || !is_user_logged_in() || !current_user_can('upload_files')) {
            return;
        }

        wp_enqueue_style('dashicons');
    }

    public function wrap_frontend_post_thumbnail($html, $post_id, $post_thumbnail_id, $size, $attr): string {
        $post_id = (int) $post_id;

        if (!is_string($html) || trim($html) === '' || !$this->can_use_frontend_image_tools($post_id)) {
            return is_string($html) ? $html : '';
        }

        $url = $this->frontend_image_tool_url($post_id);
        $label = sprintf('Open Image Desk for %s', get_the_title($post_id) ?: 'this post');

        return sprintf(
            '<span class="cph-image-tool-wrap" data-cph-post-id="%1$d">%2$s<button type="button" class="cph-image-tool-button" data-cph-image-tool-url="%3$s" aria-label="%4$s" title="%4$s"><span class="dashicons dashicons-edit" aria-hidden="true"></span></button></span>',
            (int) $post_id,
            $html,
            esc_url($url),
            esc_attr($label)
        );
    }

    public function render_frontend_image_tool_modal(): void {
        if (is_admin() || !is_user_logged_in() || !current_user_can('upload_files')) {
            return;
        }
        ?>
        <style>
            .cph-image-tool-wrap {
                display: inline-block;
                max-width: 100%;
                position: relative;
            }
            .cph-image-tool-wrap > img {
                display: block;
            }
            .cph-image-tool-button {
                align-items: center;
                appearance: none;
                background: transparent;
                border: 0;
                border-radius: 0;
                box-shadow: none;
                color: #fff;
                cursor: pointer;
                display: inline-flex;
                filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .9));
                height: 30px;
                justify-content: center;
                opacity: .88;
                padding: 0;
                position: absolute;
                right: 10px;
                text-decoration: none;
                top: 10px;
                transition: color .16s ease, opacity .16s ease, transform .16s ease;
                width: 30px;
                z-index: 20;
            }
            .cph-image-tool-wrap:hover .cph-image-tool-button,
            .cph-image-tool-button:focus {
                opacity: 1;
            }
            .cph-image-tool-button:hover,
            .cph-image-tool-button:focus {
                background: transparent;
                color: #39a0ff;
                transform: scale(1.12);
            }
            .cph-image-tool-button .dashicons {
                font-size: 24px;
                height: 24px;
                line-height: 24px;
                width: 24px;
            }
            .cph-image-tool-modal {
                background: rgba(2, 6, 12, .72);
                bottom: 0;
                display: none;
                left: 0;
                padding: 24px;
                position: fixed;
                right: 0;
                top: 0;
                z-index: 999999;
            }
            .cph-image-tool-modal.is-open {
                display: block;
            }
            .cph-image-tool-panel {
                background: #fff;
                border-radius: 14px;
                box-shadow: 0 24px 80px rgba(0, 0, 0, .42);
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
                height: min(92vh, 980px);
                margin: 0 auto;
                max-width: 1280px;
                overflow: hidden;
                width: min(96vw, 1280px);
            }
            .cph-image-tool-bar {
                align-items: center;
                background: #06121f;
                color: #fff;
                display: flex;
                gap: 12px;
                justify-content: space-between;
                padding: 10px 14px;
            }
            .cph-image-tool-bar strong {
                font-size: 14px;
                letter-spacing: .02em;
            }
            .cph-image-tool-close {
                appearance: none;
                background: transparent;
                border: 0;
                color: #fff;
                cursor: pointer;
                font-size: 28px;
                line-height: 1;
                padding: 2px 6px;
            }
            .cph-image-tool-frame {
                border: 0;
                height: 100%;
                width: 100%;
            }
            @media (max-width: 782px) {
                .cph-image-tool-modal {
                    padding: 8px;
                }
                .cph-image-tool-panel {
                    border-radius: 10px;
                    height: calc(100vh - 16px);
                    width: calc(100vw - 16px);
                }
            }
        </style>
        <div class="cph-image-tool-modal" id="cph-image-tool-modal" aria-hidden="true">
            <div class="cph-image-tool-panel" role="dialog" aria-modal="true" aria-label="Creator Publishing Hub Image Desk">
                <div class="cph-image-tool-bar">
                    <strong>Creator Publishing Hub Image Desk</strong>
                    <button type="button" class="cph-image-tool-close" aria-label="Close Image Desk">&times;</button>
                </div>
                <iframe class="cph-image-tool-frame" title="Image Desk" loading="lazy"></iframe>
            </div>
        </div>
        <script>
            (function () {
                const modal = document.getElementById('cph-image-tool-modal');
                if (!modal) {
                    return;
                }
                const frame = modal.querySelector('.cph-image-tool-frame');
                const close = modal.querySelector('.cph-image-tool-close');

                function closeModal() {
                    modal.classList.remove('is-open');
                    modal.setAttribute('aria-hidden', 'true');
                    if (frame) {
                        frame.removeAttribute('src');
                    }
                }

                document.addEventListener('click', function (event) {
                    const button = event.target.closest('.cph-image-tool-button');
                    if (!button) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    if (frame && button.dataset.cphImageToolUrl) {
                        frame.src = button.dataset.cphImageToolUrl;
                    }
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');
                    if (close) {
                        close.focus();
                    }
                });

                if (close) {
                    close.addEventListener('click', closeModal);
                }
                modal.addEventListener('click', function (event) {
                    if (event.target === modal) {
                        closeModal();
                    }
                });
                document.addEventListener('keydown', function (event) {
                    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
                        closeModal();
                    }
                });
            }());
        </script>
        <?php
    }

    public function admin_body_class(string $classes): string {
        return trim($classes . ' cph-admin-theme');
    }

    public function login_body_class(array $classes): array {
        $classes[] = 'cph-login-theme';
        return $classes;
    }

    public function render_extension_bridge_meta(): void {
        if (!current_user_can('edit_posts')) {
            return;
        }

        $settings = $this->settings();
        $user = wp_get_current_user();
        $payload = [
            'ok' => true,
            'site' => [
                'name' => $this->canonical_brand_name(trim((string) ($settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'Creator Publishing Hub')),
                'home_url' => home_url('/'),
                'admin_url' => admin_url(),
                'image_desk_url' => admin_url('edit.php?page=creator-needs-images'),
                'image_review_url' => admin_url('edit.php?page=creator-image-review'),
            ],
            'rest' => [
                'root' => rest_url(self::REST_NAMESPACE . '/'),
                'bootstrap' => rest_url(self::REST_NAMESPACE . '/extension/bootstrap'),
                'capture' => rest_url(self::REST_NAMESPACE . '/extension/capture'),
                'nonce' => wp_create_nonce('wp_rest'),
            ],
            'user' => [
                'id' => get_current_user_id(),
                'login' => $user instanceof WP_User ? $user->user_login : '',
                'display_name' => $user instanceof WP_User ? $user->display_name : '',
            ],
            'version' => self::VERSION,
        ];
        ?>
        <meta name="creator-publishing-hub-rest-root" content="<?php echo esc_url(rest_url(self::REST_NAMESPACE . '/')); ?>">
        <meta name="creator-publishing-hub-rest-nonce" content="<?php echo esc_attr((string) $payload['rest']['nonce']); ?>">
        <script type="application/json" id="creator-publishing-hub-extension-bootstrap"><?php echo wp_json_encode($payload, JSON_UNESCAPED_SLASHES); ?></script>
        <?php
    }

    public function render_admin_branding(): void {
        $settings = $this->settings();
        $brand = trim((string) $settings['site_brand_name']) ?: get_bloginfo('name');
        $logo_url = $this->login_logo_url();
        $mark_url = $this->brand_mark_url();
        ?>
        <style>
            :root {
                --cph-admin-bg: #f4f7fb;
                --cph-admin-panel: #ffffff;
                --cph-admin-ink: #111827;
                --cph-admin-muted: #64748b;
                --cph-admin-blue: #1689ff;
                --cph-admin-blue-dark: #0a61c9;
                --cph-admin-gold: #d99a22;
                --cph-admin-sidebar: #07131d;
                --cph-admin-sidebar-2: #0d1d2b;
                --cph-admin-line: #dbe3ec;
            }
            body.cph-admin-theme {
                background: var(--cph-admin-bg);
                color: var(--cph-admin-ink);
            }
            #wpadminbar #wp-admin-bar-wp-logo,
            #footer-thankyou,
            #footer-upgrade {
                display: none !important;
            }
            #wpadminbar {
                background: #07131d !important;
                border-bottom: 1px solid rgba(255, 255, 255, .08);
                color: #eaf4ff;
            }
            #wpadminbar .ab-item,
            #wpadminbar a.ab-item,
            #wpadminbar > #wp-toolbar span.ab-label {
                color: #eaf4ff !important;
            }
            #wpadminbar .ab-sub-wrapper {
                background: #0d1d2b !important;
                border: 1px solid rgba(255, 255, 255, .08);
                box-shadow: 0 18px 48px rgba(0, 0, 0, .28);
            }
            #wpadminbar #wp-admin-bar-site-name > .ab-item::before {
                display: none !important;
            }
            #wpadminbar .cph-adminbar-site > .ab-item {
                align-items: center;
                display: flex !important;
                gap: 7px;
                font-weight: 700;
            }
            #wpadminbar .cph-adminbar-logo {
                display: block;
                height: 22px;
                object-fit: contain;
                width: 22px;
            }
            body.cph-admin-theme #adminmenuback,
            body.cph-admin-theme #adminmenuwrap,
            body.cph-admin-theme #adminmenu {
                background: linear-gradient(180deg, var(--cph-admin-sidebar), var(--cph-admin-sidebar-2));
            }
            body.cph-admin-theme #adminmenuwrap::before {
                <?php if ($logo_url !== '') : ?>
                    background-image: url("<?php echo esc_url($logo_url); ?>");
                    background-position: left center;
                    background-repeat: no-repeat;
                    background-size: contain;
                    content: "";
                    display: block;
                    height: 58px;
                    margin: 18px 18px 14px;
                <?php else : ?>
                    color: #fff;
                    content: "<?php echo esc_js($brand); ?>";
                    display: block;
                    font-size: 18px;
                    font-weight: 900;
                    margin: 22px 18px;
                <?php endif; ?>
            }
            body.cph-admin-theme.folded #adminmenuwrap::before {
                <?php if ($mark_url !== '') : ?>
                    background-image: url("<?php echo esc_url($mark_url); ?>");
                    height: 38px;
                    margin: 14px 11px;
                <?php endif; ?>
            }
            body.cph-admin-theme #adminmenu {
                margin: 0;
            }
            body.cph-admin-theme #adminmenu div.wp-menu-image::before,
            body.cph-admin-theme #adminmenu a {
                color: rgba(234, 244, 255, .78);
            }
            body.cph-admin-theme #adminmenu a {
                border-left: 3px solid transparent;
                font-weight: 700;
            }
            body.cph-admin-theme #adminmenu li.menu-top:hover,
            body.cph-admin-theme #adminmenu li.opensub > a.menu-top,
            body.cph-admin-theme #adminmenu li > a.menu-top:focus {
                background: rgba(22, 137, 255, .14);
            }
            body.cph-admin-theme #adminmenu li.current a.menu-top,
            body.cph-admin-theme #adminmenu li.wp-has-current-submenu a.wp-has-current-submenu {
                background: rgba(22, 137, 255, .22);
                border-left-color: var(--cph-admin-blue);
                color: #fff;
            }
            body.cph-admin-theme #adminmenu li.current div.wp-menu-image::before,
            body.cph-admin-theme #adminmenu li.wp-has-current-submenu div.wp-menu-image::before {
                color: #fff;
            }
            body.cph-admin-theme #adminmenu .wp-submenu {
                background: #0a1723;
            }
            body.cph-admin-theme #adminmenu .wp-submenu a {
                color: rgba(234, 244, 255, .76);
                font-weight: 600;
            }
            body.cph-admin-theme #adminmenu .wp-submenu a:focus,
            body.cph-admin-theme #adminmenu .wp-submenu a:hover,
            body.cph-admin-theme #adminmenu .wp-submenu li.current a {
                color: #fff;
            }
            body.cph-admin-theme #collapse-button {
                color: rgba(234, 244, 255, .72);
            }
            body.cph-admin-theme #wpcontent {
                background:
                    linear-gradient(180deg, rgba(255, 255, 255, .9), rgba(244, 247, 251, 0) 220px),
                    var(--cph-admin-bg);
            }
            body.cph-admin-theme #wpbody-content {
                padding-bottom: 42px;
            }
            body.cph-admin-theme .wrap {
                margin-top: 24px;
            }
            body.cph-admin-theme .wrap > h1,
            body.cph-admin-theme .wrap > h2:first-child,
            body.cph-admin-theme .wp-heading-inline {
                color: #0f172a;
                font-weight: 900;
                letter-spacing: 0;
            }
            body.cph-admin-theme .wrap > h1::after {
                background: linear-gradient(90deg, var(--cph-admin-blue), var(--cph-admin-gold));
                content: "";
                display: block;
                height: 3px;
                margin-top: 10px;
                width: 84px;
            }
            body.cph-admin-theme .notice,
            body.cph-admin-theme div.updated,
            body.cph-admin-theme div.error {
                border-radius: 10px;
                box-shadow: 0 8px 26px rgba(15, 23, 42, .06);
            }
            body.cph-admin-theme .postbox,
            body.cph-admin-theme .stuffbox,
            body.cph-admin-theme .card,
            body.cph-admin-theme .welcome-panel,
            body.cph-admin-theme table.widefat,
            body.cph-admin-theme .form-table,
            body.cph-admin-theme .creator-image-stats .fis-panel,
            body.cph-admin-theme .creator-needs-images .fni-card,
            body.cph-admin-theme .creator-image-review .fir-card {
                border-color: var(--cph-admin-line);
                border-radius: 12px;
                box-shadow: 0 12px 34px rgba(15, 23, 42, .06);
            }
            body.cph-admin-theme .postbox-header {
                border-bottom-color: var(--cph-admin-line);
            }
            body.cph-admin-theme .button,
            body.cph-admin-theme .page-title-action {
                border-color: #b8c7d8;
                border-radius: 8px;
                font-weight: 800;
            }
            body.cph-admin-theme .button-primary,
            body.cph-admin-theme .page-title-action {
                background: linear-gradient(135deg, var(--cph-admin-blue), var(--cph-admin-blue-dark));
                border-color: var(--cph-admin-blue-dark);
                color: #fff;
                text-shadow: none;
            }
            body.cph-admin-theme input[type="text"],
            body.cph-admin-theme input[type="search"],
            body.cph-admin-theme input[type="password"],
            body.cph-admin-theme input[type="email"],
            body.cph-admin-theme input[type="number"],
            body.cph-admin-theme input[type="url"],
            body.cph-admin-theme select,
            body.cph-admin-theme textarea {
                border-color: #cbd5e1;
                border-radius: 8px;
                box-shadow: none;
            }
            body.cph-admin-theme input:focus,
            body.cph-admin-theme select:focus,
            body.cph-admin-theme textarea:focus {
                border-color: var(--cph-admin-blue);
                box-shadow: 0 0 0 3px rgba(22, 137, 255, .14);
            }
            body.cph-admin-theme table.widefat thead th,
            body.cph-admin-theme table.widefat tfoot th {
                background: #f8fafc;
                color: #334155;
                font-weight: 900;
            }
            body.cph-admin-theme .alternate,
            body.cph-admin-theme .striped > tbody > :nth-child(odd),
            body.cph-admin-theme ul.striped > :nth-child(odd) {
                background-color: #f8fbff;
            }
            body.cph-admin-theme #screen-meta-links .show-settings {
                border-radius: 0 0 8px 8px;
            }
        </style>
        <script>
            window.cphAdminBrand = <?php echo wp_json_encode($brand); ?>;
        </script>
        <?php
    }

    public function admin_footer_text(): string {
        $settings = $this->settings();
        return esc_html(trim((string) $settings['site_brand_name']) ?: (get_bloginfo('name') ?: 'Publishing Desk'));
    }

    public function enqueue_admin_assets(string $hook_suffix): void {
        $page = sanitize_key((string) ($_GET['page'] ?? ''));
        if (!in_array($hook_suffix, ['posts_page_creator-needs-images', self::ADMIN_MENU_SLUG . '_page_creator-needs-images'], true) && $page !== 'creator-needs-images') {
            return;
        }

        wp_enqueue_style(
            'cph-fontawesome-free',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
            [],
            '6.5.2'
        );
    }

    public function guard_authentication($user, string $username, string $password) {
        if (!$this->security_enabled('login_guard_enabled') || $username === '') {
            return $user;
        }

        $state = $this->login_guard_state($username);
        if (!empty($state['locked_until']) && (int) $state['locked_until'] > time()) {
            return new WP_Error(
                'cph_login_locked',
                __('Too many failed login attempts. Try again later or contact the site owner.', 'creator-publishing-hub')
            );
        }

        return $user;
    }

    public function record_failed_login(string $username): void {
        if (!$this->security_enabled('login_guard_enabled') || $username === '') {
            return;
        }

        $settings = $this->settings();
        $max_failures = max(2, (int) $settings['login_max_failures']);
        $window = max(1, (int) $settings['login_window_minutes']) * MINUTE_IN_SECONDS;
        $lockout = max(1, (int) $settings['login_lockout_minutes']) * MINUTE_IN_SECONDS;
        $state = $this->login_guard_state($username);
        $first_seen = (int) ($state['first_seen'] ?? time());

        if ((time() - $first_seen) > $window) {
            $state = [
                'count' => 0,
                'first_seen' => time(),
                'locked_until' => 0,
            ];
        }

        $state['count'] = (int) ($state['count'] ?? 0) + 1;
        if ($state['count'] >= $max_failures) {
            $state['locked_until'] = time() + $lockout;
        }

        set_transient($this->login_guard_key($username), $state, max($window, $lockout));
    }

    public function clear_failed_login(string $user_login, WP_User $user): void {
        delete_transient($this->login_guard_key($user_login));
        delete_transient($this->login_guard_key((string) $user->user_email));
    }

    public function generic_login_error(string $error): string {
        if (!$this->security_enabled('login_guard_enabled') || $error === '') {
            return $error;
        }

        return __('Login failed. Check your credentials and try again.', 'creator-publishing-hub');
    }

    public function xmlrpc_enabled(bool $enabled): bool {
        if ($this->security_enabled('disable_xmlrpc')) {
            return false;
        }

        return $enabled;
    }

    public function filter_rest_endpoints(array $endpoints): array {
        if (!$this->security_enabled('hide_rest_users') || current_user_can('list_users')) {
            return $endpoints;
        }

        unset($endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)']);
        return $endpoints;
    }

    public function block_author_enumeration(): void {
        if (!$this->security_enabled('hide_rest_users') || is_admin() || !isset($_GET['author'])) {
            return;
        }

        wp_safe_redirect(home_url('/'), 301);
        exit;
    }

    public function send_security_headers(): void {
        if (!$this->security_enabled('security_headers') || headers_sent()) {
            return;
        }

        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    }

    private function login_logo_url(): string {
        $custom_logo_id = (int) get_theme_mod('custom_logo');
        if ($custom_logo_id > 0) {
            $logo = wp_get_attachment_image_url($custom_logo_id, 'medium');
            if ($logo) {
                return (string) $logo;
            }
        }

        $theme_logo = get_stylesheet_directory_uri() . '/assets/cph-logo.png';
        $theme_logo_path = get_stylesheet_directory() . '/assets/cph-logo.png';
        if (file_exists($theme_logo_path)) {
            return $theme_logo;
        }

        return '';
    }

    private function brand_mark_url(): string {
        $theme_mark = get_stylesheet_directory_uri() . '/assets/cph-mark.png';
        $theme_mark_path = get_stylesheet_directory() . '/assets/cph-mark.png';
        if (file_exists($theme_mark_path)) {
            return $theme_mark;
        }

        return $this->login_logo_url();
    }

    private function site_logo_payload_url(): string {
        $host = $this->normalized_host(home_url('/'));
        $publication_logos = [
            'creatornewsdesk.com' => 'https://www.creatornewsdesk.com/wp-content/uploads/2026/02/creatornewsdesk-logo-header-228.png',
            'www.creatornewsdesk.com' => 'https://www.creatornewsdesk.com/wp-content/uploads/2026/02/creatornewsdesk-logo-header-228.png',
            'thefactologydaily.com' => 'https://thefactologydaily.com/wp-content/themes/factology-daily/assets/factology-mark.png',
            'creditrepairchoices.com' => 'https://creditrepairchoices.com/wp-content/themes/creditrepairchoices/assets/images/credit-repair-choices-logo-header.png',
            'thedailysmirk.com' => 'https://thedailysmirk.com/wp-content/uploads/2026/07/daily-smirk-site-icon.png',
        ];
        if (isset($publication_logos[$host])) {
            return $publication_logos[$host];
        }

        $logo_url = $this->login_logo_url();
        if ($logo_url !== '') {
            return $logo_url;
        }

        return (string) (get_site_icon_url(512) ?: get_site_icon_url(192) ?: '');
    }

    private function current_user_login_name(): string {
        $user = wp_get_current_user();
        if (!$user instanceof WP_User || !$user->exists()) {
            return '';
        }

        return (string) $user->user_login;
    }

    private function current_user_can_run_paid_image_api(): bool {
        $user = wp_get_current_user();
        if (!$user instanceof WP_User || !$user->exists()) {
            return false;
        }

        return strtolower((string) $user->user_login) === 'mmurphy';
    }

    private function openai_image_api_key(): string {
        $settings = $this->settings();
        $stored = trim((string) ($settings['openai_image_api_key'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        if (defined('OPENAI_API_KEY') && is_string(OPENAI_API_KEY) && trim(OPENAI_API_KEY) !== '') {
            return trim((string) OPENAI_API_KEY);
        }

        $env = getenv('OPENAI_API_KEY');
        if (is_string($env) && trim($env) !== '') {
            return trim($env);
        }

        return '';
    }

    private function security_enabled(string $key): bool {
        $settings = $this->settings();
        return !empty($settings[$key]) && (string) $settings[$key] === '1';
    }

    private function login_guard_key(string $username): string {
        $ip = sanitize_text_field((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        return self::SECURITY_TRANSIENT_PREFIX . md5(strtolower(trim($username)) . '|' . $ip);
    }

    private function login_guard_state(string $username): array {
        $state = get_transient($this->login_guard_key($username));
        return is_array($state) ? $state : [
            'count' => 0,
            'first_seen' => time(),
            'locked_until' => 0,
        ];
    }

    public function redirect_duplicate_post(): void {
        if (!is_singular('post')) {
            return;
        }

        $post_id = get_queried_object_id();
        if (!$post_id) {
            return;
        }

        $target = trim((string) get_post_meta($post_id, self::META_REDIRECT_TO_URL, true));
        if ($target === '') {
            return;
        }

        $target = wp_validate_redirect($target, home_url('/'));
        if ($target === '' || untrailingslashit($target) === untrailingslashit(get_permalink($post_id))) {
            return;
        }

        wp_redirect($target, 301, 'Creator Publishing Hub');
        exit;
    }

    public function redirect_legacy_admin_slugs(): void {
        if (!is_admin() || !current_user_can('edit_posts')) {
            return;
        }

        $legacy_page = sanitize_key((string) ($_GET['page'] ?? ''));
        $slug_map = [
            'factology-needs-images' => 'creator-needs-images',
            'factology-image-review' => 'creator-image-review',
            'factology-image-stats' => 'creator-image-stats',
            'factology-image-audit' => 'creator-image-audit',
            'cph-needs-images' => 'creator-needs-images',
            'cph-image-review' => 'creator-image-review',
            'cph-image-stats' => 'creator-image-stats',
            'cph-image-audit' => 'creator-image-audit',
        ];

        if (!isset($slug_map[$legacy_page])) {
            return;
        }

        $args = [
            'page' => $slug_map[$legacy_page],
        ];

        foreach (['fni_paged', 'fni_category', 'fni_search', 'fir_paged', 'fir_status', 'fir_category', 'fir_search'] as $key) {
            if (isset($_GET[$key])) {
                $args[$key] = sanitize_text_field((string) wp_unslash($_GET[$key]));
            }
        }

        wp_safe_redirect(add_query_arg($args, admin_url('admin.php')), 301, 'Creator Publishing Hub');
        exit;
    }

    public function exclude_redirected_posts(WP_Query $query): void {
        if (is_admin() || $query->is_singular()) {
            return;
        }

        $post_type = $query->get('post_type');
        if ($post_type !== '' && $post_type !== 'post' && $post_type !== ['post']) {
            return;
        }

        $query->set('meta_query', $this->with_redirect_exclusion((array) $query->get('meta_query')));
    }

    public function exclude_redirected_posts_from_rest(array $args, WP_REST_Request $request): array {
        $args['meta_query'] = $this->with_redirect_exclusion((array) ($args['meta_query'] ?? []));
        return $args;
    }

    private function with_redirect_exclusion(array $meta_query): array {
        $meta_query[] = [
            'key' => self::META_REDIRECT_TO_URL,
            'compare' => 'NOT EXISTS',
        ];

        return $meta_query;
    }

    private function admin_menu_icon_data_uri(): string {
        $svg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <defs>
    <linearGradient id="cphTrail" x1="2" y1="4" x2="18" y2="16" gradientUnits="userSpaceOnUse">
      <stop stop-color="#29C6FF"/>
      <stop offset="0.58" stop-color="#3687FF"/>
      <stop offset="1" stop-color="#B04CFF"/>
    </linearGradient>
    <linearGradient id="cphMetal" x1="5" y1="3" x2="11" y2="16" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8FAFF"/>
      <stop offset="0.45" stop-color="#D5DCEF"/>
      <stop offset="1" stop-color="#8794B7"/>
    </linearGradient>
  </defs>
  <path d="M1.8 9.25h4.15" stroke="url(#cphTrail)" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M1.8 12h3.2" stroke="url(#cphTrail)" stroke-width="1.3" stroke-linecap="round" opacity=".92"/>
  <path d="M1.8 6.5h3.2" stroke="url(#cphTrail)" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>
  <path d="M6.15 15.9 8.55 4.1h2.1l-2.1 11.8H6.15Z" fill="url(#cphMetal)"/>
  <path d="M4.45 15.9 8.75 4.1h1.9l4.15 11.8h-2.2l-.78-2.35H7.25l-.8 2.35H4.45Zm3.45-4.55h3.2L9.52 6.7H9.4l-1.5 4.65Z" fill="url(#cphTrail)"/>
  <circle cx="14.7" cy="9.95" r="2.05" stroke="url(#cphTrail)" stroke-width="1.25"/>
  <path d="M14.7 7.9v4.1M12.65 9.95h4.1" stroke="url(#cphTrail)" stroke-width=".95" stroke-linecap="round"/>
</svg>
SVG;

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    public function admin_menu(): void {
        $menu_icon = $this->admin_menu_icon_data_uri();

        add_menu_page(
            'Creator Publishing Hub',
            'Creator Publishing Hub',
            'edit_posts',
            self::ADMIN_MENU_SLUG,
            [$this, 'render_dashboard_overview'],
            $menu_icon,
            58
        );

        add_submenu_page(
            self::ADMIN_MENU_SLUG,
            'Creator Publishing Hub',
            'Dashboard',
            'edit_posts',
            self::ADMIN_MENU_SLUG,
            [$this, 'render_dashboard_overview']
        );

        add_submenu_page(
            self::ADMIN_MENU_SLUG,
            'Creator Publishing Hub',
            'Publishing Desk',
            'manage_options',
            'creator-publishing-hub',
            [$this, 'render_settings']
        );

        add_submenu_page(
            self::ADMIN_MENU_SLUG,
            'Autopilot Image Desk',
            'Image Desk',
            'edit_posts',
            'creator-needs-images',
            [$this, 'render_needs_images']
        );

        add_submenu_page(
            self::ADMIN_MENU_SLUG,
            'Autopilot Image Review',
            'Image Review',
            'edit_posts',
            'creator-image-review',
            [$this, 'render_image_review']
        );

        add_submenu_page(
            self::ADMIN_MENU_SLUG,
            'Autopilot Image Stats',
            'Image Stats',
            'edit_posts',
            'creator-image-stats',
            [$this, 'render_image_stats']
        );

        add_submenu_page(
            self::ADMIN_MENU_SLUG,
            'Autopilot Image Audit',
            'Image Audit',
            'edit_posts',
            'creator-image-audit',
            [$this, 'render_image_audit']
        );
    }

    public function remove_legacy_post_menu_entries(): void {
        $legacy_slugs = [
            'creator-needs-images',
            'creator-image-review',
            'creator-image-stats',
            'creator-image-audit',
            'factology-needs-images',
            'factology-image-review',
            'factology-image-stats',
            'factology-image-audit',
            'cph-needs-images',
            'cph-image-review',
            'cph-image-stats',
            'cph-image-audit',
        ];

        foreach ($legacy_slugs as $slug) {
            remove_submenu_page('edit.php', $slug);
        }
    }

    public function register_settings(): void {
        register_setting('cph_autopilot', self::OPTION_KEY, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings'],
            'default' => self::defaults(),
        ]);
    }

    public function register_dashboard_widgets(): void {
        if (!current_user_can('edit_posts')) {
            return;
        }

        remove_action('welcome_panel', 'wp_welcome_panel');

        wp_add_dashboard_widget(
            'cph_dashboard_overview',
            'Publishing Operations',
            [$this, 'render_dashboard_overview'],
            null,
            null,
            'normal',
            'high'
        );

        wp_add_dashboard_widget(
            'cph_dashboard_helpers',
            'Image Desk Helper Stats',
            [$this, 'render_dashboard_helpers_widget'],
            null,
            null,
            'normal',
            'high'
        );

        wp_add_dashboard_widget(
            'cph_dashboard_traffic_social',
            'Publishing Traffic + Social',
            [$this, 'render_dashboard_traffic_social_widget'],
            null,
            null,
            'side',
            'high'
        );
    }

    public function render_dashboard_overview(): void {
        $stats = $this->dashboard_overview_stats();
        $fleet = $this->dashboard_fleet_statuses();
        $codex_handoff = $this->dashboard_codex_image_handoff($fleet);
        $latest = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'numberposts' => 5,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);
        $ready_items = $this->image_ready_publish_items(4);
        $helper_rows = array_slice($this->image_helper_stats(), 0, 4);
        $needs_images_url = admin_url('admin.php?page=creator-needs-images');
        $ready_url = admin_url('edit.php?post_type=post&cph_ready_queue=1');
        $posts_url = admin_url('edit.php?post_status=publish&post_type=post');

        $this->render_dashboard_styles();
        ?>
        <div class="cph-dashboard">
            <?php $this->render_dashboard_fleet_priority($fleet, $codex_handoff); ?>

            <div class="fd-kpis">
                <?php $this->render_dashboard_kpi('Published', $stats['published_total'], 'All live articles', $posts_url); ?>
                <?php $this->render_dashboard_kpi('This week', $stats['published_7_days'], 'New public posts'); ?>
                <?php $this->render_dashboard_kpi('Needs images', $stats['needs_images'], 'Drafts helpers can claim', $needs_images_url); ?>
                <?php $this->render_dashboard_kpi('Ready queue', $stats['ready_to_publish'], 'Image done, waiting for Ryzen', $ready_url); ?>
                <?php $this->render_dashboard_kpi('Social queued', $stats['social_queued'], 'Published posts waiting to share'); ?>
                <?php $this->render_dashboard_kpi('Scheduled', $stats['scheduled'], 'Future WordPress posts'); ?>
            </div>

            <div class="fd-grid">
                <section class="fd-panel">
                    <h3>Next Ready For Site</h3>
                    <?php if (!$ready_items) : ?>
                        <p class="fd-muted">No image-ready drafts are waiting right now.</p>
                    <?php else : ?>
                        <ol class="fd-clean-list">
                            <?php foreach ($ready_items as $item) : ?>
                                <li>
                                    <a href="<?php echo esc_url(get_edit_post_link((int) $item['post_id'])); ?>"><?php echo esc_html($item['title']); ?></a>
                                    <span><?php echo esc_html($item['ready_at'] ?: 'ready'); ?></span>
                                </li>
                            <?php endforeach; ?>
                        </ol>
                    <?php endif; ?>
                </section>

                <section class="fd-panel">
                    <h3>Latest Live Posts</h3>
                    <?php if (!$latest) : ?>
                        <p class="fd-muted">No published posts yet.</p>
                    <?php else : ?>
                        <ol class="fd-clean-list">
                            <?php foreach ($latest as $post) : ?>
                                <li>
                                    <a href="<?php echo esc_url(get_edit_post_link($post->ID)); ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a>
                                    <span><?php echo esc_html(get_the_date('M j, g:i A', $post->ID)); ?></span>
                                </li>
                            <?php endforeach; ?>
                        </ol>
                    <?php endif; ?>
                </section>

                <section class="fd-panel">
                    <h3>Top Helpers</h3>
                    <?php if (!$helper_rows) : ?>
                        <p class="fd-muted">No helper completions recorded yet.</p>
                    <?php else : ?>
                        <ol class="fd-clean-list">
                            <?php foreach ($helper_rows as $row) : ?>
                                <li>
                                    <strong><?php echo esc_html($row['name']); ?></strong>
                                    <span><?php echo esc_html(number_format_i18n((int) $row['completed']) . ' images' . ((int) $row['average_minutes'] > 0 ? ' · ' . $row['average_minutes'] . ' min avg' : '')); ?></span>
                                </li>
                            <?php endforeach; ?>
                        </ol>
                    <?php endif; ?>
                </section>
            </div>
        </div>
        <?php
    }

    public function render_dashboard_helpers_widget(): void {
        $stats = $this->image_helper_stats();
        $now = current_time('timestamp', true);
        $max_completed = max(1, ...array_map(static fn(array $row): int => (int) $row['completed'], $stats ?: [['completed' => 0]]));

        $this->render_dashboard_styles();
        ?>
        <div class="cph-dashboard">
            <?php if (!$stats) : ?>
                <p class="fd-muted">No helper image completions recorded yet.</p>
            <?php else : ?>
                <table class="widefat striped fd-helper-table">
                    <thead>
                        <tr>
                            <th>Helper</th>
                            <th>Done</th>
                            <th>Avg</th>
                            <th>Reserved now</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($stats as $row) : ?>
                            <?php
                            $active_claims = $this->active_image_claim_count((int) $row['user_id'], $now);
                            $bar_width = max(3, (int) round(((int) $row['completed'] / $max_completed) * 100));
                            ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($row['name']); ?></strong>
                                    <span class="fd-muted">@<?php echo esc_html($row['login']); ?></span>
                                    <span class="fd-mini-bar" aria-hidden="true"><span style="width: <?php echo esc_attr((string) $bar_width); ?>%"></span></span>
                                </td>
                                <td><?php echo esc_html(number_format_i18n((int) $row['completed'])); ?></td>
                                <td><?php echo esc_html((int) $row['average_minutes'] > 0 ? $row['average_minutes'] . ' min' : 'n/a'); ?></td>
                                <td><?php echo esc_html(number_format_i18n($active_claims)); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p class="fd-actions">
                    <a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=creator-image-stats')); ?>">Open full stats</a>
                    <a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=creator-needs-images')); ?>">Image Desk</a>
                </p>
            <?php endif; ?>
        </div>
        <?php
    }

    public function render_dashboard_traffic_social_widget(): void {
        $social = $this->dashboard_social_stats();
        $sitekit = $this->dashboard_sitekit_stats();
        $facebook_snapshot = $this->dashboard_external_snapshot('cph_facebook_page_snapshot');
        $traffic_snapshot = $this->dashboard_external_snapshot('cph_sitekit_traffic_snapshot');

        $this->render_dashboard_styles();
        ?>
        <div class="cph-dashboard">
            <div class="fd-kpis fd-kpis-compact">
                <?php $this->render_dashboard_kpi('FB queue', $social['queued'], 'Waiting for social worker'); ?>
                <?php $this->render_dashboard_kpi('Shared 7d', $social['shared_7_days'], 'Marked shared locally'); ?>
                <?php $this->render_dashboard_kpi('Ready images', $social['manual_ready'], 'Manual/cleaned images live'); ?>
                <?php $this->render_dashboard_kpi('Site Kit', $sitekit['active'] ? 'On' : 'Off', $sitekit['measurement_id'] ?: 'Traffic plugin status', $sitekit['url']); ?>
            </div>

            <div class="fd-grid">
                <section class="fd-panel">
                    <h3>Facebook/Page</h3>
                    <dl class="fd-definition-list">
                        <dt>Last local share</dt>
                        <dd><?php echo esc_html($social['last_shared_at'] ?: 'No local share marker yet'); ?></dd>
                        <dt>Last share ID</dt>
                        <dd><?php echo esc_html($social['last_share_id'] ?: 'n/a'); ?></dd>
                    </dl>
                    <?php $this->render_dashboard_snapshot($facebook_snapshot, 'No cached Facebook Page snapshot yet. The local queue still shows what the worker needs to share.'); ?>
                </section>

                <section class="fd-panel">
                    <h3>Google Traffic</h3>
                    <dl class="fd-definition-list">
                        <dt>Site Kit plugin</dt>
                        <dd><?php echo esc_html($sitekit['active'] ? 'Active' : 'Not active'); ?></dd>
                        <dt>Analytics</dt>
                        <dd><?php echo esc_html($sitekit['measurement_id'] ?: 'Open Site Kit to confirm connection'); ?></dd>
                    </dl>
                    <?php $this->render_dashboard_snapshot($traffic_snapshot, 'No cached Site Kit traffic snapshot yet. Use Site Kit for live charts until a worker stores a summary here.'); ?>
                    <p class="fd-actions">
                        <a class="button button-small" href="<?php echo esc_url($sitekit['url']); ?>">Open Site Kit</a>
                        <a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=jetpack#/social')); ?>">Jetpack Social</a>
                    </p>
                </section>
            </div>
        </div>
        <?php
    }

    private function render_dashboard_styles(): void {
        static $rendered = false;
        if ($rendered) {
            return;
        }
        $rendered = true;
        ?>
        <style>
            .cph-dashboard {
                color: #1d2327;
            }
            .cph-dashboard .fd-kpis {
                display: grid;
                gap: 10px;
                grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
                margin: 0 0 14px;
            }
            .cph-dashboard .fd-kpis-compact {
                grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
            }
            .cph-dashboard .fd-kpi {
                background: #f6f7f7;
                border: 1px solid #dcdcde;
                border-radius: 4px;
                min-height: 76px;
                padding: 10px 12px;
            }
            .cph-dashboard .fd-kpi a {
                color: inherit;
                display: block;
                text-decoration: none;
            }
            .cph-dashboard .fd-kpi strong {
                display: block;
                font-size: 26px;
                line-height: 1.1;
                margin-bottom: 5px;
            }
            .cph-dashboard .fd-kpi span {
                color: #646970;
                display: block;
                font-size: 12px;
                font-weight: 600;
                line-height: 1.35;
            }
            .cph-dashboard .fd-kpi em {
                color: #1d2327;
                display: block;
                font-size: 12px;
                font-style: normal;
                font-weight: 700;
                letter-spacing: .04em;
                text-transform: uppercase;
            }
            .cph-dashboard .fd-grid {
                display: grid;
                gap: 12px;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            }
            .cph-dashboard .fd-panel {
                border-top: 1px solid #dcdcde;
                padding-top: 12px;
            }
            .cph-dashboard .fd-panel h3 {
                margin: 0 0 8px;
            }
            .cph-dashboard .fd-clean-list {
                margin: 0;
            }
            .cph-dashboard .fd-clean-list li {
                border-bottom: 1px solid #f0f0f1;
                display: grid;
                gap: 3px;
                margin: 0;
                padding: 8px 0;
            }
            .cph-dashboard .fd-clean-list li:last-child {
                border-bottom: 0;
            }
            .cph-dashboard .fd-clean-list span,
            .cph-dashboard .fd-muted {
                color: #646970;
                display: block;
                font-size: 12px;
            }
            .cph-dashboard .fd-helper-table td,
            .cph-dashboard .fd-helper-table th {
                vertical-align: top;
            }
            .cph-dashboard .fd-mini-bar {
                background: #f0f0f1;
                display: block;
                height: 6px;
                margin-top: 7px;
                overflow: hidden;
                width: 100%;
            }
            .cph-dashboard .fd-mini-bar span {
                background: #2271b1;
                display: block;
                height: 100%;
            }
            .cph-dashboard .fd-definition-list {
                display: grid;
                gap: 4px 10px;
                grid-template-columns: max-content 1fr;
                margin: 0 0 10px;
            }
            .cph-dashboard .fd-definition-list dt {
                color: #646970;
                font-weight: 700;
            }
            .cph-dashboard .fd-definition-list dd {
                margin: 0;
                min-width: 0;
                overflow-wrap: anywhere;
            }
            .cph-dashboard .fd-snapshot {
                background: #f6f7f7;
                border: 1px solid #dcdcde;
                border-radius: 4px;
                margin: 10px 0 0;
                padding: 10px;
            }
            .cph-dashboard .fd-snapshot ul {
                margin: 0;
            }
            .cph-dashboard .fd-snapshot li {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                margin: 0 0 5px;
            }
            .cph-dashboard .fd-snapshot li:last-child {
                margin-bottom: 0;
            }
            .cph-dashboard .fd-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin: 12px 0 0;
            }
            .cph-dashboard .fd-fleet {
                border: 1px solid #dcdcde;
                border-radius: 6px;
                margin: 0 0 16px;
                overflow: hidden;
            }
            .cph-dashboard .fd-fleet-head {
                align-items: center;
                background: #f6f7f7;
                border-bottom: 1px solid #dcdcde;
                display: flex;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 14px;
            }
            .cph-dashboard .fd-fleet-head h3 {
                margin: 0;
            }
            .cph-dashboard .fd-fleet-codex {
                align-items: flex-end;
                display: flex;
                flex-direction: column;
                gap: 5px;
                text-align: right;
            }
            .cph-dashboard .fd-fleet-row {
                align-items: center;
                border-bottom: 1px solid #f0f0f1;
                display: grid;
                gap: 12px;
                grid-template-columns: minmax(180px, 1.25fr) minmax(280px, 2fr) auto;
                padding: 12px 14px;
            }
            .cph-dashboard .fd-fleet-row:last-child {
                border-bottom: 0;
            }
            .cph-dashboard .fd-fleet-site {
                align-items: center;
                display: flex;
                gap: 10px;
                min-width: 0;
            }
            .cph-dashboard .fd-fleet-site img {
                border-radius: 4px;
                height: 40px;
                object-fit: contain;
                width: 40px;
            }
            .cph-dashboard .fd-fleet-site strong,
            .cph-dashboard .fd-fleet-site span {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .cph-dashboard .fd-fleet-score {
                background: #1d2327;
                border-radius: 999px;
                color: #fff;
                display: inline-block;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .04em;
                padding: 4px 9px;
                text-transform: uppercase;
            }
            .cph-dashboard .fd-fleet-metrics {
                display: grid;
                gap: 8px;
                grid-template-columns: repeat(5, minmax(0, 1fr));
            }
            .cph-dashboard .fd-fleet-metrics span {
                background: #f6f7f7;
                border: 1px solid #f0f0f1;
                border-radius: 4px;
                padding: 7px 8px;
            }
            .cph-dashboard .fd-fleet-metrics strong {
                display: block;
                font-size: 18px;
                line-height: 1;
            }
            .cph-dashboard .fd-fleet-error {
                color: #b32d2e;
                font-weight: 700;
            }
            @media (max-width: 782px) {
                .cph-dashboard .fd-kpis,
                .cph-dashboard .fd-grid,
                .cph-dashboard .fd-fleet-row,
                .cph-dashboard .fd-fleet-metrics {
                    grid-template-columns: 1fr;
                }
                .cph-dashboard .fd-fleet-head {
                    align-items: flex-start;
                    flex-direction: column;
                }
                .cph-dashboard .fd-fleet-codex {
                    align-items: flex-start;
                    text-align: left;
                }
            }
        </style>
        <?php
    }

    private function render_dashboard_kpi(string $label, $value, string $note, string $url = ''): void {
        $value_text = is_numeric($value) ? number_format_i18n((int) $value) : (string) $value;
        $inner = sprintf(
            '<em>%s</em><strong>%s</strong><span>%s</span>',
            esc_html($label),
            esc_html($value_text),
            esc_html($note)
        );
        ?>
        <div class="fd-kpi">
            <?php if ($url !== '') : ?>
                <a href="<?php echo esc_url($url); ?>"><?php echo $inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></a>
            <?php else : ?>
                <?php echo $inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            <?php endif; ?>
        </div>
        <?php
    }

    private function dashboard_codex_image_handoff(array $fleet): array {
        $candidates = array_values(array_filter($fleet, static function (array $site): bool {
            if ((string) ($site['error'] ?? '') !== '') {
                return false;
            }
            $workload = is_array($site['image_workload'] ?? null) ? $site['image_workload'] : [];
            $metrics = is_array($site['metrics'] ?? null) ? $site['metrics'] : [];
            return (int) ($workload['total'] ?? ($metrics['needs_images'] ?? 0)) > 0;
        }));
        usort($candidates, static function (array $a, array $b): int {
            $a_workload = is_array($a['image_workload'] ?? null) ? $a['image_workload'] : [];
            $b_workload = is_array($b['image_workload'] ?? null) ? $b['image_workload'] : [];
            $priority_compare = ((int) ($b_workload['priority_score'] ?? 0)) <=> ((int) ($a_workload['priority_score'] ?? 0));
            if ($priority_compare !== 0) {
                return $priority_compare;
            }
            return ((int) ($b_workload['total'] ?? 0)) <=> ((int) ($a_workload['total'] ?? 0));
        });
        if (!$candidates) {
            return [];
        }

        $site_blocks = [];
        $total_jobs = 0;
        foreach ($candidates as $index => $site) {
            $site_url = untrailingslashit((string) ($site['url'] ?? ''));
            $image_desk_url = (string) ($site['image_desk_url'] ?? '');
            if ($image_desk_url === '' && $site_url !== '') {
                $image_desk_url = $site_url . '/wp-admin/admin.php?page=creator-needs-images';
            }
            $batch_size = $index === 0 ? self::FLEET_PRIMARY_BATCH_SIZE : self::FLEET_STANDARD_BATCH_SIZE;
            $jobs_url = $site_url !== '' ? $site_url . '/wp-json/' . self::REST_NAMESPACE . '/image-production/jobs?per_page=' . $batch_size : '';
            $workload = is_array($site['image_workload'] ?? null) ? $site['image_workload'] : [];
            $site_total = (int) ($workload['total'] ?? 0);
            $total_jobs += $site_total;
            $name = (string) ($site['name'] ?? ('Publication ' . ($index + 1)));
            $site_blocks[] = implode("\n", [
                sprintf('%d. %s%s', $index + 1, $name, $index === 0 ? ' — PRIMARY FOCUS (worst current deficit)' : ''),
                'Site URL: ' . $site_url,
                'Image Desk: ' . $image_desk_url,
                'Private jobs endpoint: ' . $jobs_url,
                sprintf('Batch target: %d jobs for this lane.', $batch_size),
                sprintf(
                    'Workload: %d total image jobs; %d redo, %d missing Landscape, %d missing or redo Story, %d provider replacements, %d provider reviews; priority score %d.',
                    $site_total,
                    (int) ($workload['redo'] ?? 0),
                    (int) ($workload['missing'] ?? 0),
                    (int) ($workload['story_missing_or_redo'] ?? 0),
                    (int) ($workload['provider_replace'] ?? 0),
                    (int) ($workload['provider_review'] ?? 0),
                    (int) ($workload['priority_score'] ?? 0)
                ),
            ]);
        }

        $top_name = (string) ($candidates[0]['name'] ?? 'the highest-priority publication');
        $prompt = implode("\n", [
            'Coordinate image work across every ready Creator Publishing Hub publication in the priority order below.',
            '',
            'Use this task as the fleet coordinator. Maintain at most one active bounded subagent lane per site and never exceed the available subagent slots. Start #1 with the largest bounded batch, then fill remaining slots with distinct ready sites in priority order. When the primary lane finishes, it gets the first replacement lane while its backlog remains; when another lane finishes, assign the next unstarted ready site. With only one available subagent slot, rotate through unstarted sites after the primary\'s first batch so every ready site receives a lane. After every ready site has received work, allocate each freed slot to the highest-priority unstaffed backlog. Never run two simultaneous lanes for the same site. Refresh fleet status after each full pass and continue until no ready image work remains or the task ends.',
            '',
            implode("\n\n", $site_blocks),
            '',
            'Each subagent must stay within exactly one publication and return its job IDs, completed roles, attachment IDs, and rendered-card verification to the coordinator. For its assigned site, open the signed-in Image Desk and use Start processing with Codex as many times as needed to fill that site\'s stated batch target. If an authenticated worker token is already available locally, use only that site\'s private jobs endpoint without exposing the token. Generate and attach only required_roles, keep preserve_roles unchanged, and inspect review_roles before approving or regenerating them. Verify each completed Landscape or Story image in the rendered WordPress card before closing the lane. Keep every publication\'s logo, visual identity, editorial profile, credentials, and review gates separate. Do not publish named accusations or bypass any editorial review gate.',
        ]);

        return [
            'name' => $top_name,
            'total' => $total_jobs,
            'site_count' => count($candidates),
            'prompt' => $prompt,
        ];
    }

    private function render_dashboard_fleet_priority(array $fleet, array $codex_handoff = []): void {
        $handoff_prompt = (string) ($codex_handoff['prompt'] ?? '');
        ?>
        <section class="fd-fleet" aria-label="Creator Publishing Hub work priority">
            <div class="fd-fleet-head">
                <div>
                    <h3>Where Work Is Needed First</h3>
                    <span class="fd-muted">Highest score stays on top across all sites.</span>
                </div>
                <div class="fd-fleet-codex">
                    <button type="button" class="button button-primary" id="fd-copy-codex-image-prompt" <?php disabled($handoff_prompt === ''); ?>>Copy Codex fleet prompt</button>
                    <span class="fd-muted" id="fd-copy-codex-image-status" aria-live="polite">
                        <?php if ($handoff_prompt !== '') : ?>
                            Ready sites: <?php echo esc_html(number_format_i18n((int) ($codex_handoff['site_count'] ?? 0))); ?> · Top priority: <?php echo esc_html((string) ($codex_handoff['name'] ?? '')); ?> · <?php echo esc_html(number_format_i18n((int) ($codex_handoff['total'] ?? 0))); ?> total jobs
                        <?php else : ?>
                            No reachable site is reporting image work right now.
                        <?php endif; ?>
                    </span>
                    <textarea id="fd-codex-image-prompt" hidden readonly><?php echo esc_textarea($handoff_prompt); ?></textarea>
                </div>
            </div>
            <?php foreach ($fleet as $site) : ?>
                <?php
                $metrics = is_array($site['metrics'] ?? null) ? $site['metrics'] : [];
                $error = (string) ($site['error'] ?? '');
                $image_desk_url = (string) ($site['image_desk_url'] ?? '');
                $admin_url = (string) ($site['admin_url'] ?? '');
                ?>
                <div class="fd-fleet-row">
                    <div class="fd-fleet-site">
                        <?php if (!empty($site['logo_url'])) : ?>
                            <img src="<?php echo esc_url((string) $site['logo_url']); ?>" alt="">
                        <?php endif; ?>
                        <div>
                            <strong><?php echo esc_html((string) ($site['name'] ?? 'Site')); ?></strong>
                            <span class="fd-muted"><?php echo esc_html((string) ($site['host'] ?? '')); ?></span>
                        </div>
                    </div>
                    <?php if ($error !== '') : ?>
                        <div class="fd-fleet-error"><?php echo esc_html($error); ?></div>
                    <?php else : ?>
                        <div class="fd-fleet-metrics">
                            <span><strong><?php echo esc_html(number_format_i18n((int) ($metrics['needs_images'] ?? 0))); ?></strong>Image work</span>
                            <span><strong><?php echo esc_html(number_format_i18n((int) ($metrics['ready_queue'] ?? 0))); ?></strong>Ready</span>
                            <span><strong><?php echo esc_html(number_format_i18n((int) ($metrics['audio_needed'] ?? 0))); ?></strong>Audio</span>
                            <span><strong><?php echo esc_html(number_format_i18n((int) ($metrics['social_queued'] ?? 0))); ?></strong>Social</span>
                            <span><strong><?php echo esc_html(number_format_i18n((int) ($metrics['scheduled'] ?? 0))); ?></strong>Scheduled</span>
                        </div>
                    <?php endif; ?>
                    <div>
                        <span class="fd-fleet-score">Score <?php echo esc_html(number_format_i18n((int) ($site['work_score'] ?? 0))); ?></span>
                        <p class="fd-actions">
                            <?php if ($image_desk_url !== '') : ?>
                                <a class="button button-small button-primary" href="<?php echo esc_url($image_desk_url); ?>">Image Desk</a>
                            <?php endif; ?>
                            <?php if ($admin_url !== '') : ?>
                                <a class="button button-small" href="<?php echo esc_url($admin_url); ?>">Admin</a>
                            <?php endif; ?>
                        </p>
                    </div>
                </div>
            <?php endforeach; ?>
        </section>
        <?php if ($handoff_prompt !== '') : ?>
            <script>
                (() => {
                    const button = document.getElementById('fd-copy-codex-image-prompt');
                    const source = document.getElementById('fd-codex-image-prompt');
                    const status = document.getElementById('fd-copy-codex-image-status');
                    button?.addEventListener('click', async () => {
                        const value = source?.value || '';
                        if (!value) {
                            return;
                        }
                        try {
                            if (navigator.clipboard?.writeText) {
                                await navigator.clipboard.writeText(value);
                            } else {
                                source.hidden = false;
                                source.select();
                                document.execCommand('copy');
                                source.hidden = true;
                            }
                            status.textContent = 'Codex fleet prompt copied for <?php echo esc_js((string) ($codex_handoff['site_count'] ?? 0)); ?> ready sites.';
                        } catch (error) {
                            status.textContent = 'Could not copy automatically. Select the prompt text and copy it manually.';
                            source.hidden = false;
                            source.select();
                        }
                    });
                })();
            </script>
        <?php endif; ?>
        <?php
    }

    private function render_dashboard_snapshot(array $snapshot, string $empty_message): void {
        if (!$snapshot) {
            echo '<p class="fd-muted">' . esc_html($empty_message) . '</p>';
            return;
        }

        $updated_at = sanitize_text_field((string) ($snapshot['updated_at'] ?? $snapshot['time'] ?? ''));
        $metrics = $snapshot['metrics'] ?? $snapshot;
        if (!is_array($metrics)) {
            echo '<p class="fd-muted">' . esc_html($empty_message) . '</p>';
            return;
        }
        ?>
        <div class="fd-snapshot">
            <?php if ($updated_at !== '') : ?>
                <p class="fd-muted">Cached <?php echo esc_html($updated_at); ?></p>
            <?php endif; ?>
            <ul>
                <?php foreach (array_slice($metrics, 0, 6, true) as $key => $value) : ?>
                    <?php if (is_array($value) || is_object($value)) { continue; } ?>
                    <li>
                        <span><?php echo esc_html(ucwords(str_replace(['_', '-'], ' ', (string) $key))); ?></span>
                        <strong><?php echo esc_html(is_numeric($value) ? number_format_i18n((float) $value) : (string) $value); ?></strong>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php
    }

    private function dashboard_overview_stats(): array {
        return $this->fast_public_work_status_metrics()['stats'];
    }

    private function image_workload_count(array $meta_query): int {
        $query = new WP_Query([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'meta_query' => $meta_query,
        ]);

        return (int) $query->found_posts;
    }

    private function image_workload_summary(): array {
        return $this->fast_public_work_status_metrics()['image_workload'];
    }

    private function fast_public_work_status_metrics(): array {
        $cached = get_transient(self::TRANSIENT_PUBLIC_WORK_STATUS_METRICS);
        if (is_array($cached) && isset($cached['stats'], $cached['image_workload'])) {
            return $cached;
        }

        global $wpdb;
        $rows = $wpdb->get_results(
            "SELECT ID, post_status, post_date_gmt
             FROM {$wpdb->posts}
             WHERE post_type = 'post'
               AND post_status IN ('publish','draft','pending','future','private')",
            ARRAY_A
        );
        $rows = is_array($rows) ? $rows : [];
        $meta_keys = [
            '_thumbnail_id',
            self::META_IMAGE_REQUIRED,
            self::META_IMAGE_REDO_REQUIRED,
            self::META_STORY_REQUIRED,
            self::META_SECONDARY_SOCIAL_IMAGES,
            self::META_FEATURED_IMAGE_PROVIDER,
            self::META_SOCIAL_QUEUE_STATUS,
            self::META_AUDIO_ATTACHMENT_ID,
            self::META_IMAGE_READY_FOR_PUBLISH,
        ];
        $meta_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));
        $meta_sql = $wpdb->prepare(
            "SELECT pm.post_id, pm.meta_key, pm.meta_value
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE p.post_type = 'post'
               AND p.post_status IN ('publish','draft','pending','future','private')
               AND pm.meta_key IN ({$meta_placeholders})",
            ...$meta_keys
        );
        $meta_rows = $wpdb->get_results($meta_sql, ARRAY_A);
        $post_meta = [];
        foreach (is_array($meta_rows) ? $meta_rows : [] as $meta_row) {
            $meta_post_id = (int) ($meta_row['post_id'] ?? 0);
            $meta_key = (string) ($meta_row['meta_key'] ?? '');
            if ($meta_post_id > 0 && $meta_key !== '' && !isset($post_meta[$meta_post_id][$meta_key])) {
                $post_meta[$meta_post_id][$meta_key] = maybe_unserialize($meta_row['meta_value'] ?? '');
            }
        }
        $meta_value = static function (array $all_meta, string $key) {
            return $all_meta[$key] ?? '';
        };

        $stats = [
            'published_total' => 0,
            'draft_total' => 0,
            'scheduled' => 0,
            'published_7_days' => 0,
            'needs_images' => 0,
            'ready_to_publish' => 0,
            'social_queued' => 0,
        ];
        $workload = [
            'total' => 0,
            'redo' => 0,
            'missing' => 0,
            'story_missing_or_redo' => 0,
            'provider_replace' => 0,
            'provider_review' => 0,
            'priority_score' => 0,
        ];
        $audio_needed = 0;
        $published_since = current_time('timestamp', true) - (7 * DAY_IN_SECONDS);
        $replace_providers = ['pytorch', 'torch', 'stable-diffusion', 'sdxl', 'template', 'legacy', 'local-ai', 'automatic'];

        foreach ($rows as $row) {
            $post_id = (int) ($row['ID'] ?? 0);
            if ($post_id <= 0) {
                continue;
            }
            $status = (string) ($row['post_status'] ?? '');
            $meta = $post_meta[$post_id] ?? [];
            $thumbnail_id = absint($meta_value($meta, '_thumbnail_id'));
            $image_required = (string) $meta_value($meta, self::META_IMAGE_REQUIRED) === '1';
            $redo_required = (string) $meta_value($meta, self::META_IMAGE_REDO_REQUIRED) === '1';
            $story_required = (string) $meta_value($meta, self::META_STORY_REQUIRED) === '1';
            $story_value = $meta_value($meta, self::META_SECONDARY_SOCIAL_IMAGES);
            if (is_array($story_value)) {
                $has_story = count(array_filter(array_map('absint', $story_value))) > 0;
            } else {
                $story_text = trim((string) $story_value);
                $decoded_story = $story_text !== '' ? json_decode($story_text, true) : null;
                $has_story = is_array($decoded_story)
                    ? count(array_filter(array_map('absint', $decoded_story))) > 0
                    : absint($story_text) > 0;
            }
            $provider = sanitize_key((string) $meta_value($meta, self::META_FEATURED_IMAGE_PROVIDER));
            $provider_replace = in_array($provider, $replace_providers, true);
            $provider_review = $provider === 'unknown' || ($thumbnail_id > 0 && $provider === '');
            $missing_landscape = $thumbnail_id <= 0;
            $missing_story = !$has_story || $story_required;
            $needs_images = $image_required
                || $redo_required
                || $missing_landscape
                || $missing_story
                || $provider_replace
                || $provider_review;

            if ($status === 'publish') {
                $stats['published_total']++;
                $published_at = strtotime((string) ($row['post_date_gmt'] ?? '') . ' UTC') ?: 0;
                if ($published_at >= $published_since) {
                    $stats['published_7_days']++;
                }
                if ((string) $meta_value($meta, self::META_SOCIAL_QUEUE_STATUS) === 'queued') {
                    $stats['social_queued']++;
                }
                if (absint($meta_value($meta, self::META_AUDIO_ATTACHMENT_ID)) <= 0) {
                    $audio_needed++;
                }
            } elseif (in_array($status, ['draft', 'pending'], true)) {
                $stats['draft_total']++;
            } elseif ($status === 'future') {
                $stats['scheduled']++;
            }

            if ($needs_images) {
                $stats['needs_images']++;
            }
            if (
                in_array($status, ['draft', 'pending'], true)
                && (string) $meta_value($meta, self::META_IMAGE_READY_FOR_PUBLISH) === '1'
                && !$image_required
                && $thumbnail_id > 0
            ) {
                $stats['ready_to_publish']++;
            }
            if ($redo_required) {
                $workload['redo']++;
            }
            if ($missing_landscape) {
                $workload['missing']++;
            }
            if ($missing_story) {
                $workload['story_missing_or_redo']++;
            }
            if ($provider_replace) {
                $workload['provider_replace']++;
            }
            if ($provider_review) {
                $workload['provider_review']++;
            }
        }

        $workload['total'] = $stats['needs_images'];
        $workload['priority_score'] = ($workload['redo'] * 100)
            + ($workload['provider_replace'] * 80)
            + ($workload['story_missing_or_redo'] * 70)
            + ($workload['missing'] * 60)
            + ($workload['provider_review'] * 20);
        $result = [
            'stats' => $stats,
            'image_workload' => $workload,
            'audio_needed' => $audio_needed,
        ];
        set_transient(self::TRANSIENT_PUBLIC_WORK_STATUS_METRICS, $result, 5 * MINUTE_IN_SECONDS);

        return $result;
    }

    private function dashboard_fleet_statuses(): array {
        $sites = $this->creator_hub_sites();
        $statuses = [];

        foreach ($sites as $site) {
            $host = (string) ($site['host'] ?? '');
            if ($this->normalized_host($host) === $this->normalized_host(home_url('/'))) {
                $status = $this->public_work_status_payload();
            } else {
                $status = $this->remote_public_work_status($site);
            }

            $merged = array_merge($site, $status);
            $configured_logo = (string) ($site['logo_url'] ?? '');
            $reported_logo = (string) ($status['logo_url'] ?? '');
            if ($configured_logo !== '' && ($reported_logo === '' || preg_match('/\/favicon\.ico(?:\?.*)?$/i', $reported_logo))) {
                $merged['logo_url'] = $configured_logo;
            }
            $merged['name'] = $this->canonical_brand_name((string) ($merged['name'] ?? ''));
            $statuses[] = $merged;
        }

        usort($statuses, static function (array $a, array $b): int {
            $score_compare = ((int) ($b['work_score'] ?? 0)) <=> ((int) ($a['work_score'] ?? 0));
            if ($score_compare !== 0) {
                return $score_compare;
            }

            return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
        });

        return $statuses;
    }

    private function creator_hub_sites(): array {
        return apply_filters('cph_creator_hub_sites', [
            [
                'name' => 'Creator Newsdesk',
                'url' => 'https://www.creatornewsdesk.com',
                'host' => 'www.creatornewsdesk.com',
                'logo_url' => 'https://www.creatornewsdesk.com/favicon.ico',
            ],
            [
                'name' => 'The Factology Daily',
                'url' => 'https://thefactologydaily.com',
                'host' => 'thefactologydaily.com',
                'logo_url' => 'https://thefactologydaily.com/favicon.ico',
            ],
            [
                'name' => 'Credit Repair Choices',
                'url' => 'https://creditrepairchoices.com',
                'host' => 'creditrepairchoices.com',
                'logo_url' => 'https://creditrepairchoices.com/favicon.ico',
            ],
            [
                'name' => 'The Daily Smirk',
                'url' => 'https://thedailysmirk.com',
                'host' => 'thedailysmirk.com',
                'logo_url' => 'https://thedailysmirk.com/favicon.ico',
            ],
            [
                'name' => 'Lovelies Abroad',
                'url' => 'https://loveliesabroad.com',
                'host' => 'loveliesabroad.com',
                'logo_url' => 'https://loveliesabroad.com/favicon.ico',
            ],
        ]);
    }

    private function matthew_author_id(): int {
        $user = get_user_by('login', 'mmurphy');
        if ($user instanceof WP_User) {
            return (int) $user->ID;
        }

        $users = get_users([
            'search' => 'Matthew Murphy',
            'search_columns' => ['display_name'],
            'number' => 1,
            'fields' => 'all',
        ]);

        return !empty($users[0]) && $users[0] instanceof WP_User ? (int) $users[0]->ID : 0;
    }

    private function is_matthew_author(WP_User $author): bool {
        $login = strtolower((string) $author->user_login);
        $display_name = strtolower((string) $author->display_name);
        return $login === 'mmurphy' || $display_name === 'matthew murphy';
    }

    private function matthew_author_brands_markup(): string {
        $cards = [];
        foreach ($this->creator_hub_sites() as $site) {
            $name = trim((string) ($site['name'] ?? ''));
            $url = esc_url((string) ($site['url'] ?? ''));
            if ($name === '' || $url === '') {
                continue;
            }
            $cards[] = sprintf(
                '<li><a href="%s">%s</a></li>',
                $url,
                esc_html($name)
            );
        }

        if (!$cards) {
            return '';
        }

        return '<section class="cph-matthew-brands" aria-label="All Matthew Murphy brands">'
            . '<style>.cph-matthew-brands{margin:0 0 24px;padding:20px;border:1px solid rgba(0,0,0,.08);background:#fff}.cph-matthew-brands h2{margin:0 0 8px;font-size:1.2rem}.cph-matthew-brands p{margin:0 0 12px;color:#4b5563}.cph-matthew-brands ul{margin:0;padding-left:18px;display:grid;gap:8px}.cph-matthew-brands a{text-decoration:none;font-weight:600}.cph-matthew-brands a:hover{text-decoration:underline}</style>'
            . '<h2>All Matthew Murphy brands</h2>'
            . '<p>Follow the full Creator Publishing Hub footprint Matthew Murphy is building across news, creator education, facts, humor, and business.</p>'
            . '<ul>' . implode('', $cards) . '</ul>'
            . '</section>';
    }

    private function remote_public_work_status(array $site): array {
        $base_url = untrailingslashit((string) ($site['url'] ?? ''));
        if ($base_url === '') {
            return $this->public_work_status_error('Missing site URL');
        }

        // Include the runtime version so a cached failure from a retired route
        // cannot survive deployment of a corrected fleet client.
        $cache_key = 'cph_fleet_status_' . self::VERSION . '_' . md5($base_url);
        $cached = get_transient($cache_key);
        if (is_array($cached)) {
            return $cached;
        }

        $response = wp_remote_get($base_url . '/wp-json/' . self::REST_NAMESPACE . '/public-work-status', [
            'timeout' => 12,
            'redirection' => 2,
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) {
            $result = $this->public_work_status_error('Could not reach status feed');
            set_transient($cache_key, $result, MINUTE_IN_SECONDS);
            return $result;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $body = (string) wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);
        if ($code !== 200 || !is_array($decoded) || empty($decoded['ok'])) {
            $result = $this->public_work_status_error('Update needed before this site can report');
            set_transient($cache_key, $result, MINUTE_IN_SECONDS);
            return $result;
        }

        $result = $this->normalize_public_work_status($decoded);
        set_transient($cache_key, $result, 5 * MINUTE_IN_SECONDS);
        return $result;
    }

    private function public_work_status_error(string $message): array {
        return [
            'metrics' => [],
            'work_score' => 0,
            'error' => $message,
            'admin_url' => '',
            'image_desk_url' => '',
        ];
    }

    private function normalize_public_work_status(array $payload): array {
        $metrics = is_array($payload['metrics'] ?? null) ? $payload['metrics'] : [];
        $image_workload = is_array($payload['image_workload'] ?? null) ? $payload['image_workload'] : [];
        return [
            'name' => $this->canonical_brand_name(sanitize_text_field((string) ($payload['name'] ?? ''))),
            'host' => sanitize_text_field((string) ($payload['host'] ?? '')),
            'logo_url' => esc_url_raw((string) ($payload['logo_url'] ?? '')),
            'metrics' => [
                'needs_images' => (int) ($metrics['needs_images'] ?? 0),
                'ready_queue' => (int) ($metrics['ready_queue'] ?? 0),
                'audio_needed' => (int) ($metrics['audio_needed'] ?? 0),
                'social_queued' => (int) ($metrics['social_queued'] ?? 0),
                'scheduled' => (int) ($metrics['scheduled'] ?? 0),
            ],
            'image_workload' => [
                'total' => (int) ($image_workload['total'] ?? ($metrics['needs_images'] ?? 0)),
                'redo' => (int) ($image_workload['redo'] ?? ($metrics['image_redo'] ?? 0)),
                'missing' => (int) ($image_workload['missing'] ?? ($metrics['image_missing'] ?? 0)),
                'story_missing_or_redo' => (int) ($image_workload['story_missing_or_redo'] ?? ($metrics['image_story_missing_or_redo'] ?? 0)),
                'provider_replace' => (int) ($image_workload['provider_replace'] ?? ($metrics['image_provider_replace'] ?? 0)),
                'provider_review' => (int) ($image_workload['provider_review'] ?? ($metrics['image_provider_review'] ?? 0)),
                'priority_score' => (int) ($image_workload['priority_score'] ?? 0),
            ],
            'work_score' => (int) ($payload['work_score'] ?? 0),
            'admin_url' => esc_url_raw((string) ($payload['admin_url'] ?? '')),
            'image_desk_url' => esc_url_raw((string) ($payload['image_desk_url'] ?? '')),
            'error' => '',
        ];
    }

    private function normalized_host(string $url): string {
        $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            $host = strtolower($url);
        }
        return preg_replace('/^www\./', '', $host) ?: $host;
    }

    public function ensure_indexnow_key(): void {
        $this->indexnow_key();
    }

    private function indexnow_key(): string {
        $key = (string) get_option(self::OPTION_INDEXNOW_KEY, '');
        if (preg_match('/^[a-zA-Z0-9_-]{8,128}$/', $key)) {
            return $key;
        }

        $key = wp_generate_password(32, false, false);
        update_option(self::OPTION_INDEXNOW_KEY, $key, false);

        return $key;
    }

    public function serve_search_metadata_requests(WP $wp): void {
        $path = trim((string) wp_parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH), '/');
        if ($path === '') {
            return;
        }

        $settings = $this->settings();
        $indexnow_key = $this->indexnow_key();
        if ($path === $indexnow_key . '.txt') {
            status_header(200);
            nocache_headers();
            header('Content-Type: text/plain; charset=' . get_option('blog_charset'));
            echo esc_html($indexnow_key);
            exit;
        }

        if ($path === 'ai-sitemap.xml' && $settings['ai_sitemap_enabled'] === '1') {
            status_header(200);
            nocache_headers();
            header('Content-Type: application/xml; charset=' . get_option('blog_charset'));
            echo $this->ai_sitemap_xml(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            exit;
        }

        if ($path === 'llms.txt' && ($settings['llms_txt_enabled'] ?? '1') === '1') {
            status_header(200);
            nocache_headers();
            header('Content-Type: text/plain; charset=' . get_option('blog_charset'));
            echo $this->llms_txt(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            exit;
        }

        $yandex_code = $this->yandex_verification_code();
        if ($yandex_code !== '' && $path === 'yandex_' . $yandex_code . '.html') {
            status_header(200);
            nocache_headers();
            header('Content-Type: text/html; charset=UTF-8');
            echo '<html>' . "\n"
                . '    <head>' . "\n"
                . '        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' . "\n"
                . '    </head>' . "\n"
                . '    <body>Verification: ' . esc_html($yandex_code) . '</body>' . "\n"
                . '</html>';
            exit;
        }

        if ($path === 'sitemaps.xml') {
            if ($this->has_yoast_sitemap()) {
                wp_safe_redirect(home_url('/sitemap_index.xml'), 301, 'Creator Publishing Hub');
                exit;
            }
            status_header(200);
            nocache_headers();
            header('Content-Type: application/xml; charset=' . get_option('blog_charset'));
            echo $this->sitemap_index_xml(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            exit;
        }
    }

    public function append_search_sitemaps_to_robots(string $output, bool $public): string {
        if (!$public) {
            return $output;
        }

        $settings = $this->settings();
        $sitemaps = [];
        if ($this->has_yoast_sitemap()) {
            $sitemaps[] = home_url('/sitemap_index.xml');
        } else {
            $sitemaps[] = home_url('/sitemaps.xml');
            $sitemaps[] = home_url('/wp-sitemap.xml');
        }
        if ($settings['ai_sitemap_enabled'] === '1') {
            $sitemaps[] = home_url('/ai-sitemap.xml');
        }

        foreach (array_unique($sitemaps) as $sitemap) {
            if (stripos($output, 'Sitemap: ' . $sitemap) === false) {
                $output = rtrim($output) . "\nSitemap: " . $sitemap . "\n";
            }
        }

        return $output;
    }

    private function yandex_verification_code(): string {
        $settings = $this->settings();
        $code = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($settings['yandex_verification_code'] ?? ''));
        return is_string($code) ? $code : '';
    }

    private function has_yoast_sitemap(): bool {
        return defined('WPSEO_VERSION') || class_exists('WPSEO_Sitemaps');
    }

    private function sitemap_index_xml(): string {
        $settings = $this->settings();
        $urls = [
            home_url('/wp-sitemap.xml'),
        ];
        if ($this->has_yoast_sitemap()) {
            $urls[] = home_url('/sitemap_index.xml');
        }
        if ($settings['ai_sitemap_enabled'] === '1') {
            $urls[] = home_url('/ai-sitemap.xml');
        }

        $xml = '<?xml version="1.0" encoding="' . esc_attr(get_option('blog_charset')) . "\"?>\n";
        $xml .= "<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach (array_unique($urls) as $url) {
            $xml .= "  <sitemap>\n";
            $xml .= '    <loc>' . esc_url($url) . "</loc>\n";
            $xml .= '    <lastmod>' . esc_html(gmdate('c')) . "</lastmod>\n";
            $xml .= "  </sitemap>\n";
        }
        $xml .= "</sitemapindex>\n";

        return $xml;
    }

    private function ai_sitemap_xml(): string {
        $query = new WP_Query([
            'post_type' => ['post', 'page'],
            'post_status' => 'publish',
            'posts_per_page' => 500,
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true,
        ]);

        $xml = '<?xml version="1.0" encoding="' . esc_attr(get_option('blog_charset')) . "\"?>\n";
        $xml .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($query->posts as $post) {
            if (!$post instanceof WP_Post || !$this->is_indexable_post($post)) {
                continue;
            }

            $xml .= "  <url>\n";
            $xml .= '    <loc>' . esc_url(get_permalink($post)) . "</loc>\n";
            $xml .= '    <lastmod>' . esc_html(get_post_modified_time('c', true, $post)) . "</lastmod>\n";
            $xml .= '    <changefreq>' . esc_html($post->post_type === 'post' ? 'weekly' : 'monthly') . "</changefreq>\n";
            $xml .= '    <priority>' . esc_html($post->post_type === 'post' ? '0.7' : '0.6') . "</priority>\n";
            $xml .= "  </url>\n";
        }
        wp_reset_postdata();
        $xml .= "</urlset>\n";

        return $xml;
    }

    private function llms_txt(): string {
        $settings = $this->settings();
        $site_name = trim((string) ($settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'Creator Publishing Hub');
        $tagline = trim((string) ($settings['site_brand_tagline'] ?? '')) ?: (get_bloginfo('description') ?: '');
        $lines = [
            '# ' . $site_name,
            '',
        ];

        if ($tagline !== '') {
            $lines[] = $tagline;
            $lines[] = '';
        }

        $lines[] = 'This site publishes human-readable articles, guides, and reference pages. The links below point crawlers and AI assistants to the preferred public entry points.';
        $lines[] = '';
        $lines[] = '## Core';
        $lines[] = '- Home: ' . home_url('/');
        if ($this->has_yoast_sitemap()) {
            $lines[] = '- Primary sitemap: ' . home_url('/sitemap_index.xml');
        } else {
            $lines[] = '- Primary sitemap: ' . home_url('/sitemaps.xml');
            $lines[] = '- WordPress sitemap: ' . home_url('/wp-sitemap.xml');
        }
        if (($settings['ai_sitemap_enabled'] ?? '1') === '1') {
            $lines[] = '- AI sitemap: ' . home_url('/ai-sitemap.xml');
        }

        $identity_pages = [
            'about' => 'About',
            'editorial-standards' => 'Editorial standards',
            'corrections' => 'Corrections and right of reply',
            'privacy-policy' => 'Privacy policy',
        ];
        $identity_links = [];
        foreach ($identity_pages as $slug => $label) {
            $page = get_page_by_path($slug, OBJECT, 'page');
            if (!$page instanceof WP_Post || $page->post_status !== 'publish' || !$this->is_indexable_post($page)) {
                continue;
            }
            $url = get_permalink($page);
            if (is_string($url) && $url !== '') {
                $identity_links[] = '- ' . $label . ': ' . $url;
            }
        }
        if ($identity_links !== []) {
            $lines[] = '';
            $lines[] = '## About and editorial policies';
            array_push($lines, ...$identity_links);
        }

        $query = new WP_Query([
            'post_type' => ['post', 'page'],
            'post_status' => 'publish',
            'posts_per_page' => 25,
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true,
        ]);

        if ($query->have_posts()) {
            $lines[] = '';
            $lines[] = '## Recently updated';
            foreach ($query->posts as $post) {
                if (!$post instanceof WP_Post || !$this->is_indexable_post($post)) {
                    continue;
                }
                $title = trim(html_entity_decode(wp_strip_all_tags(get_the_title($post)), ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8'));
                $url = get_permalink($post);
                if ($title !== '' && is_string($url) && $url !== '') {
                    $lines[] = '- ' . $title . ': ' . $url;
                }
            }
        }
        wp_reset_postdata();

        $lines[] = '';
        $lines[] = '## Notes';
        $lines[] = '- Respect robots.txt and canonical URLs.';
        $lines[] = '- Prefer the public article URL over admin, preview, attachment, or tracking URLs.';

        return implode("\n", $lines) . "\n";
    }

    public function maybe_queue_indexnow_from_status_change(string $new_status, string $old_status, WP_Post $post): void {
        if ($new_status !== 'publish' && $old_status !== 'publish') {
            return;
        }

        if (!$this->is_indexnow_enabled() || !$this->is_indexable_post($post)) {
            return;
        }

        $url = get_permalink($post);
        if (is_string($url) && $url !== '') {
            $this->queue_indexnow_url($url);
        }
    }

    public function queue_indexnow_deleted_post(int $post_id, WP_Post $post): void {
        $this->queue_indexnow_post($post);
    }

    public function queue_indexnow_post_id(int $post_id): void {
        $post = get_post($post_id);
        if ($post instanceof WP_Post) {
            $this->queue_indexnow_post($post);
        }
    }

    private function queue_indexnow_post(WP_Post $post): void {
        if (!$this->is_indexnow_enabled() || !$this->is_indexable_post($post)) {
            return;
        }

        $url = get_permalink($post);
        if (is_string($url) && $url !== '') {
            $this->queue_indexnow_url($url);
        }
    }

    private function queue_indexnow_url(string $url): void {
        $url = esc_url_raw($url);
        if ($url === '') {
            return;
        }

        $queue = get_option(self::OPTION_INDEXNOW_QUEUE, []);
        $queue = is_array($queue) ? $queue : [];
        $queue[$url] = current_time('mysql', true);
        update_option(self::OPTION_INDEXNOW_QUEUE, $queue, false);

        if (!wp_next_scheduled('cph_indexnow_flush')) {
            wp_schedule_single_event(time() + 60, 'cph_indexnow_flush');
        }
    }

    public function flush_indexnow_queue(): void {
        if (!$this->is_indexnow_enabled()) {
            return;
        }

        $queue = get_option(self::OPTION_INDEXNOW_QUEUE, []);
        if (!is_array($queue) || !$queue) {
            return;
        }

        $urls = array_slice(array_keys($queue), 0, 10000);
        $host = (string) wp_parse_url(home_url('/'), PHP_URL_HOST);
        $key = $this->indexnow_key();
        $response = wp_remote_post(self::INDEXNOW_ENDPOINT, [
            'timeout' => 10,
            'headers' => [
                'Content-Type' => 'application/json; charset=utf-8',
            ],
            'body' => wp_json_encode([
                'host' => $host,
                'key' => $key,
                'keyLocation' => home_url('/' . $key . '.txt'),
                'urlList' => $urls,
            ]),
        ]);

        $code = is_wp_error($response) ? 0 : (int) wp_remote_retrieve_response_code($response);
        update_option(self::OPTION_INDEXNOW_LAST_RESULT, [
            'time' => current_time('mysql', true),
            'code' => $code,
            'count' => count($urls),
            'error' => is_wp_error($response) ? $response->get_error_message() : '',
        ], false);

        if (!is_wp_error($response) && $code >= 200 && $code < 300) {
            foreach ($urls as $url) {
                unset($queue[$url]);
            }
            update_option(self::OPTION_INDEXNOW_QUEUE, $queue, false);
        }
    }

    private function is_indexnow_enabled(): bool {
        return ($this->settings()['indexnow_enabled'] ?? '1') === '1';
    }

    private function is_indexable_post(WP_Post $post): bool {
        if (wp_is_post_revision((int) $post->ID) || wp_is_post_autosave((int) $post->ID)) {
            return false;
        }

        $post_type = get_post_type_object($post->post_type);
        if (!$post_type || empty($post_type->public)) {
            return false;
        }

        return in_array($post->post_status, ['publish', 'trash'], true);
    }

    public function filter_ready_queue_admin_posts(WP_Query $query): void {
        if (!is_admin() || !$query->is_main_query()) {
            return;
        }

        global $pagenow;
        if ($pagenow !== 'edit.php' || empty($_GET['cph_ready_queue'])) {
            return;
        }

        $post_type = (string) $query->get('post_type');
        if ($post_type !== 'post' || !current_user_can('edit_posts')) {
            return;
        }

        $query->set('post_status', ['draft', 'pending']);
        $query->set('orderby', 'meta_value');
        $query->set('order', 'ASC');
        $query->set('meta_key', self::META_IMAGE_READY_AT);
        $query->set('meta_query', [
            'relation' => 'AND',
            [
                'key' => self::META_IMAGE_READY_FOR_PUBLISH,
                'value' => '1',
            ],
            [
                'key' => self::META_IMAGE_REQUIRED,
                'value' => '0',
            ],
            [
                'key' => '_thumbnail_id',
                'compare' => 'EXISTS',
            ],
        ]);
    }

    private function dashboard_social_stats(): array {
        $last_shared = $this->last_social_share();

        return [
            'queued' => $this->count_posts_by_meta(self::META_SOCIAL_QUEUE_STATUS, 'queued', ['publish']),
            'shared_7_days' => $this->count_posts_by_meta_date(self::META_SOCIAL_SHARED_AT, '-7 days', ['publish']),
            'manual_ready' => $this->count_posts_by_meta(self::META_FEATURED_IMAGE_PROVIDER, 'manual', ['publish', 'draft', 'pending', 'future']),
            'last_shared_at' => $last_shared['shared_at'] ?? '',
            'last_share_id' => $last_shared['share_id'] ?? '',
        ];
    }

    private function dashboard_sitekit_stats(): array {
        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $active = function_exists('is_plugin_active') && is_plugin_active('google-site-kit/google-site-kit.php');
        $settings = get_option('googlesitekit_analytics-4_settings', []);
        $measurement_id = '';
        if (is_array($settings)) {
            $measurement_id = sanitize_text_field((string) ($settings['measurementID'] ?? $settings['webDataStreamID'] ?? ''));
        }

        return [
            'active' => $active,
            'measurement_id' => $measurement_id,
            'url' => admin_url('admin.php?page=googlesitekit-dashboard'),
        ];
    }

    private function dashboard_external_snapshot(string $option_name): array {
        $snapshot = get_option($option_name, []);
        if (!is_array($snapshot) || !$snapshot) {
            $snapshot = get_transient($option_name);
        }
        if (!is_array($snapshot)) {
            return [];
        }

        return apply_filters('cph_dashboard_external_snapshot', $snapshot, $option_name);
    }

    private function count_posts_since(string $status, string $since): int {
        $query = new WP_Query([
            'post_type' => 'post',
            'post_status' => $status,
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'date_query' => [
                [
                    'after' => $since,
                    'inclusive' => true,
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    private function count_posts_by_meta(string $key, string $value, array $statuses): int {
        $query = new WP_Query([
            'post_type' => 'post',
            'post_status' => $statuses,
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'meta_query' => [
                [
                    'key' => $key,
                    'value' => $value,
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    private function count_posts_by_meta_date(string $key, string $since, array $statuses): int {
        $timestamp = strtotime($since, current_time('timestamp', true));
        $query = new WP_Query([
            'post_type' => 'post',
            'post_status' => $statuses,
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'meta_query' => [
                [
                    'key' => $key,
                    'value' => gmdate('Y-m-d H:i:s', $timestamp ?: 0),
                    'compare' => '>=',
                    'type' => 'DATETIME',
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    private function audio_needed_count(): int {
        $query = new WP_Query([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'meta_query' => [
                [
                    'key' => self::META_AUDIO_ATTACHMENT_ID,
                    'compare' => 'NOT EXISTS',
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    private function last_social_share(): array {
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'numberposts' => 1,
            'orderby' => 'meta_value',
            'order' => 'DESC',
            'meta_key' => self::META_SOCIAL_SHARED_AT,
            'meta_query' => [
                [
                    'key' => self::META_SOCIAL_SHARED_AT,
                    'compare' => 'EXISTS',
                ],
            ],
        ]);

        if (!$posts) {
            return [];
        }

        $post_id = (int) $posts[0]->ID;
        return [
            'post_id' => $post_id,
            'shared_at' => (string) get_post_meta($post_id, self::META_SOCIAL_SHARED_AT, true),
            'share_id' => (string) get_post_meta($post_id, self::META_SOCIAL_SHARE_ID, true),
        ];
    }

    public function sanitize_settings($input): array {
        $existing = $this->settings();
        $input = is_array($input) ? $input : [];
        $settings = self::defaults();

        $settings['worker_token_hash'] = $existing['worker_token_hash'] ?? '';
        $settings['worker_token_last_set'] = $existing['worker_token_last_set'] ?? '';
        $settings['autopublish_enabled'] = empty($input['autopublish_enabled']) ? '0' : '1';
        $settings['default_status'] = in_array(($input['default_status'] ?? 'draft'), ['draft', 'pending', 'publish'], true)
            ? $input['default_status']
            : 'draft';
        $settings['minimum_confidence'] = (string) min(1, max(0, (float) ($input['minimum_confidence'] ?? 0.82)));
        $settings['minimum_sources'] = (string) min(5, max(1, (int) ($input['minimum_sources'] ?? 2)));
        $settings['site_brand_name'] = sanitize_text_field((string) ($input['site_brand_name'] ?? self::defaults()['site_brand_name']));
        $settings['site_brand_tagline'] = sanitize_text_field((string) ($input['site_brand_tagline'] ?? self::defaults()['site_brand_tagline']));
        $settings['page_profile'] = sanitize_key((string) ($input['page_profile'] ?? self::defaults()['page_profile']));
        $settings['social_call_to_action'] = sanitize_text_field((string) ($input['social_call_to_action'] ?? self::defaults()['social_call_to_action']));
        $settings['openai_image_api_key'] = trim((string) ($input['openai_image_api_key'] ?? ($existing['openai_image_api_key'] ?? '')));
        $settings['image_editorial_mode'] = in_array(($input['image_editorial_mode'] ?? 'auto'), ['auto', 'news', 'comedy', 'documentary', 'explainer'], true)
            ? $input['image_editorial_mode']
            : 'auto';
        $settings['image_prompt_context'] = in_array(($input['image_prompt_context'] ?? 'auto'), ['auto', 'title', 'title-summary', 'full'], true)
            ? $input['image_prompt_context']
            : 'auto';
        $settings['image_logo_handling'] = in_array(($input['image_logo_handling'] ?? 'auto'), ['auto', 'supplied', 'overlay', 'none'], true)
            ? $input['image_logo_handling']
            : 'auto';
        $settings['image_safe_padding'] = (string) min(160, max(20, (int) ($input['image_safe_padding'] ?? 40)));
        $settings['image_custom_direction'] = sanitize_textarea_field((string) ($input['image_custom_direction'] ?? ''));
        $settings['indexnow_enabled'] = empty($input['indexnow_enabled']) ? '0' : '1';
        $settings['ai_sitemap_enabled'] = empty($input['ai_sitemap_enabled']) ? '0' : '1';
        $settings['llms_txt_enabled'] = empty($input['llms_txt_enabled']) ? '0' : '1';
        $settings['yandex_verification_code'] = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($input['yandex_verification_code'] ?? self::defaults()['yandex_verification_code']));
        $settings['login_guard_enabled'] = empty($input['login_guard_enabled']) ? '0' : '1';
        $settings['login_max_failures'] = (string) min(20, max(2, (int) ($input['login_max_failures'] ?? 5)));
        $settings['login_window_minutes'] = (string) min(120, max(1, (int) ($input['login_window_minutes'] ?? 15)));
        $settings['login_lockout_minutes'] = (string) min(1440, max(1, (int) ($input['login_lockout_minutes'] ?? 30)));
        $settings['disable_xmlrpc'] = empty($input['disable_xmlrpc']) ? '0' : '1';
        $settings['hide_rest_users'] = empty($input['hide_rest_users']) ? '0' : '1';
        $settings['security_headers'] = empty($input['security_headers']) ? '0' : '1';
        $settings['blocked_terms'] = sanitize_textarea_field($input['blocked_terms'] ?? self::defaults()['blocked_terms']);

        $new_token = trim((string) ($input['worker_token'] ?? ''));
        if ($new_token !== '') {
            $settings['worker_token_hash'] = wp_hash_password($new_token);
            $settings['worker_token_last_set'] = current_time('mysql', true);
        }

        if (!empty($input['clear_worker_token'])) {
            $settings['worker_token_hash'] = '';
            $settings['worker_token_last_set'] = '';
        }

        return $settings;
    }

    public function render_settings(): void {
        $settings = $this->settings();
        ?>
        <div class="wrap">
            <h1>Creator Publishing Hub</h1>
            <p>Ryzen workers can submit sourced posts, attach media, publish on a controlled schedule, and service isolated social queues for this site.</p>
            <form method="post" action="options.php">
                <?php settings_fields('cph_autopilot'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="site_brand_name">Admin brand name</label></th>
                        <td>
                            <input id="site_brand_name" name="<?php echo esc_attr(self::OPTION_KEY); ?>[site_brand_name]" type="text" class="regular-text" value="<?php echo esc_attr($settings['site_brand_name']); ?>">
                            <p class="description">Shown on the branded login screen and admin header.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="site_brand_tagline">Admin login tagline</label></th>
                        <td><input id="site_brand_tagline" name="<?php echo esc_attr(self::OPTION_KEY); ?>[site_brand_tagline]" type="text" class="regular-text" value="<?php echo esc_attr($settings['site_brand_tagline']); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="page_profile">Worker site profile</label></th>
                        <td>
                            <input id="page_profile" name="<?php echo esc_attr(self::OPTION_KEY); ?>[page_profile]" type="text" class="regular-text code" value="<?php echo esc_attr($settings['page_profile']); ?>">
                            <p class="description">Unique profile key used by Ryzen to isolate this site's content and queues.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="social_call_to_action">Social call to action</label></th>
                        <td><input id="social_call_to_action" name="<?php echo esc_attr(self::OPTION_KEY); ?>[social_call_to_action]" type="text" class="regular-text" value="<?php echo esc_attr($settings['social_call_to_action']); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="openai_image_api_key">OpenAI image API key</label></th>
                        <td>
                            <input id="openai_image_api_key" name="<?php echo esc_attr(self::OPTION_KEY); ?>[openai_image_api_key]" type="password" class="regular-text code" value="<?php echo esc_attr((string) ($settings['openai_image_api_key'] ?? '')); ?>" autocomplete="new-password">
                            <p class="description">Used only for the owner-only paid image button in Image Desk. Leave blank to use a server-level <code>OPENAI_API_KEY</code> if present.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="image_editorial_mode">Image editorial mode</label></th>
                        <td>
                            <select id="image_editorial_mode" name="<?php echo esc_attr(self::OPTION_KEY); ?>[image_editorial_mode]">
                                <?php foreach (['auto' => 'Automatic for this site', 'news' => 'News / editorial', 'comedy' => 'Comedy / satire', 'documentary' => 'Documentary / investigations', 'explainer' => 'Explainer / service journalism'] as $value => $label) : ?>
                                    <option value="<?php echo esc_attr($value); ?>" <?php selected($settings['image_editorial_mode'], $value); ?>><?php echo esc_html($label); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Controls the visual voice without forcing every site into the same social template.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="image_prompt_context">Image prompt source</label></th>
                        <td>
                            <select id="image_prompt_context" name="<?php echo esc_attr(self::OPTION_KEY); ?>[image_prompt_context]">
                                <?php foreach (['auto' => 'Automatic for this site', 'title' => 'Exact title only', 'title-summary' => 'Title plus excerpt', 'full' => 'Title plus full story context'] as $value => $label) : ?>
                                    <option value="<?php echo esc_attr($value); ?>" <?php selected($settings['image_prompt_context'], $value); ?>><?php echo esc_html($label); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Creator Newsdesk defaults to the exact title. Other sites retain richer context unless changed here.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="image_logo_handling">Image logo handling</label></th>
                        <td>
                            <select id="image_logo_handling" name="<?php echo esc_attr(self::OPTION_KEY); ?>[image_logo_handling]">
                                <?php foreach (['auto' => 'Automatic for this site', 'supplied' => 'Use supplied official logo', 'overlay' => 'Reserve space for later overlay', 'none' => 'No logo'] as $value => $label) : ?>
                                    <option value="<?php echo esc_attr($value); ?>" <?php selected($settings['image_logo_handling'], $value); ?>><?php echo esc_html($label); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">A supplied logo is used directly and never redrawn or placed in a container, pill, badge, card, or invented lockup.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="image_safe_padding">Image safe padding</label></th>
                        <td>
                            <input id="image_safe_padding" name="<?php echo esc_attr(self::OPTION_KEY); ?>[image_safe_padding]" type="number" min="20" max="160" step="1" value="<?php echo esc_attr($settings['image_safe_padding']); ?>"> pixels
                            <p class="description">Minimum distance between every headline/logo edge and the canvas edge. Default: 40 pixels.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="image_custom_direction">Custom image direction</label></th>
                        <td>
                            <textarea id="image_custom_direction" name="<?php echo esc_attr(self::OPTION_KEY); ?>[image_custom_direction]" rows="4" class="large-text"><?php echo esc_textarea($settings['image_custom_direction']); ?></textarea>
                            <p class="description">Optional site-specific art direction appended to every generated image prompt.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Search indexing</th>
                        <td>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[indexnow_enabled]" value="1" <?php checked($settings['indexnow_enabled'], '1'); ?>> Ping IndexNow when public posts/pages are published, updated, deleted, or trashed</label><br>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[ai_sitemap_enabled]" value="1" <?php checked($settings['ai_sitemap_enabled'], '1'); ?>> Publish an AI-friendly sitemap and advertise it in robots.txt</label><br>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[llms_txt_enabled]" value="1" <?php checked($settings['llms_txt_enabled'] ?? '1', '1'); ?>> Publish <code>llms.txt</code> for AI crawlers and assistants</label>
                            <?php
                            $indexnow_key = $this->indexnow_key();
                            $last_indexnow = get_option(self::OPTION_INDEXNOW_LAST_RESULT, []);
                            $yandex_code = $this->yandex_verification_code();
                            ?>
                            <p class="description">IndexNow key file: <code><?php echo esc_html(home_url('/' . $indexnow_key . '.txt')); ?></code></p>
                            <p class="description">AI sitemap: <code><?php echo esc_html(home_url('/ai-sitemap.xml')); ?></code></p>
                            <p class="description">LLMs file: <code><?php echo esc_html(home_url('/llms.txt')); ?></code></p>
                            <p class="description"><label for="yandex_verification_code">Yandex verification code</label> <input id="yandex_verification_code" name="<?php echo esc_attr(self::OPTION_KEY); ?>[yandex_verification_code]" type="text" class="regular-text code" value="<?php echo esc_attr($yandex_code); ?>"></p>
                            <?php if ($yandex_code !== '') : ?>
                                <p class="description">Yandex file: <code><?php echo esc_html(home_url('/yandex_' . $yandex_code . '.html')); ?></code></p>
                            <?php endif; ?>
                            <?php if (is_array($last_indexnow) && $last_indexnow) : ?>
                                <p class="description">Last IndexNow ping: <?php echo esc_html((string) ($last_indexnow['time'] ?? 'unknown')); ?> UTC · HTTP <?php echo esc_html((string) ($last_indexnow['code'] ?? 'n/a')); ?> · <?php echo esc_html((string) ($last_indexnow['count'] ?? 0)); ?> URL(s)</p>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="worker_token">Worker token</label></th>
                        <td>
                            <input id="worker_token" name="<?php echo esc_attr(self::OPTION_KEY); ?>[worker_token]" type="password" class="regular-text" autocomplete="new-password">
                            <p class="description">Stored as a WordPress password hash. Leave blank to keep current token.</p>
                            <?php if ($settings['worker_token_last_set']) : ?>
                                <p class="description">Last set: <?php echo esc_html($settings['worker_token_last_set']); ?> UTC</p>
                                <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[clear_worker_token]" value="1"> Clear token</label>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Autopublish</th>
                        <td><label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[autopublish_enabled]" value="1" <?php checked($settings['autopublish_enabled'], '1'); ?>> Publish high-confidence posts automatically</label></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="default_status">Fallback status</label></th>
                        <td>
                            <select id="default_status" name="<?php echo esc_attr(self::OPTION_KEY); ?>[default_status]">
                                <?php foreach (['draft' => 'Draft', 'pending' => 'Pending review', 'publish' => 'Publish'] as $value => $label) : ?>
                                    <option value="<?php echo esc_attr($value); ?>" <?php selected($settings['default_status'], $value); ?>><?php echo esc_html($label); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="minimum_confidence">Minimum confidence</label></th>
                        <td><input id="minimum_confidence" name="<?php echo esc_attr(self::OPTION_KEY); ?>[minimum_confidence]" type="number" min="0" max="1" step="0.01" value="<?php echo esc_attr($settings['minimum_confidence']); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="minimum_sources">Minimum sources</label></th>
                        <td><input id="minimum_sources" name="<?php echo esc_attr(self::OPTION_KEY); ?>[minimum_sources]" type="number" min="1" max="5" value="<?php echo esc_attr($settings['minimum_sources']); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row">Login guard</th>
                        <td>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[login_guard_enabled]" value="1" <?php checked($settings['login_guard_enabled'], '1'); ?>> Rate-limit failed WordPress logins</label>
                            <p class="description">This is a local lockout guard. It is not a network WAF, but it handles the common brute-force path.</p>
                            <p>
                                <label>Failures <input name="<?php echo esc_attr(self::OPTION_KEY); ?>[login_max_failures]" type="number" min="2" max="20" value="<?php echo esc_attr($settings['login_max_failures']); ?>" style="width:70px"></label>
                                <label>Window minutes <input name="<?php echo esc_attr(self::OPTION_KEY); ?>[login_window_minutes]" type="number" min="1" max="120" value="<?php echo esc_attr($settings['login_window_minutes']); ?>" style="width:70px"></label>
                                <label>Lockout minutes <input name="<?php echo esc_attr(self::OPTION_KEY); ?>[login_lockout_minutes]" type="number" min="1" max="1440" value="<?php echo esc_attr($settings['login_lockout_minutes']); ?>" style="width:70px"></label>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Site hardening</th>
                        <td>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[disable_xmlrpc]" value="1" <?php checked($settings['disable_xmlrpc'], '1'); ?>> Disable XML-RPC authentication surface</label><br>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[hide_rest_users]" value="1" <?php checked($settings['hide_rest_users'], '1'); ?>> Hide public REST user endpoints and author enumeration</label><br>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION_KEY); ?>[security_headers]" value="1" <?php checked($settings['security_headers'], '1'); ?>> Send browser security headers</label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="blocked_terms">Blocked/risky terms</label></th>
                        <td><textarea id="blocked_terms" name="<?php echo esc_attr(self::OPTION_KEY); ?>[blocked_terms]" rows="8" class="large-text"><?php echo esc_textarea($settings['blocked_terms']); ?></textarea></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function render_image_review(): void {
        $per_page = 20;
        $current_page = max(1, absint($_GET['fir_paged'] ?? 1));
        $status_filter = sanitize_key((string) ($_GET['fir_status'] ?? 'any'));
        $category_filter = sanitize_key((string) ($_GET['fir_category'] ?? ''));
        $search_filter = sanitize_text_field((string) wp_unslash($_GET['fir_search'] ?? ''));
        $post_status = in_array($status_filter, ['publish', 'draft', 'pending', 'future', 'private'], true) ? $status_filter : ['publish', 'draft', 'pending', 'future', 'private'];
        $query_args = [
            'post_type' => ['post', 'page'],
            'post_status' => $post_status,
            'posts_per_page' => $per_page,
            'paged' => $current_page,
            'orderby' => 'modified',
            'order' => 'DESC',
            'meta_query' => [
                [
                    'key' => '_thumbnail_id',
                    'compare' => 'EXISTS',
                ],
            ],
        ];

        if ($category_filter !== '') {
            $query_args['category_name'] = $category_filter;
        }

        if ($search_filter !== '') {
            // A targeted search is also the entry point for adding an image to
            // published content that does not have one yet.
            unset($query_args['meta_query']);
            if (ctype_digit($search_filter)) {
                $query_args['p'] = (int) $search_filter;
            } else {
                $query_args['s'] = $search_filter;
            }
        }

        $posts = new WP_Query($query_args);
        $category_options = get_categories([
            'hide_empty' => false,
            'orderby' => 'name',
            'order' => 'ASC',
        ]);
        ?>
        <div class="wrap creator-image-review">
            <div class="fir-hero">
                <div class="fir-hero-copy">
                    <p class="fir-eyebrow">Creator Publishing Hub</p>
                    <h1>Image Review</h1>
                    <p class="fir-intro">Swap weak graphics, add Story art, and clean up image sets without bouncing through the post editor.</p>
                </div>
                <div class="fir-summary">
                    <div class="fir-summary-card">
                        <strong><?php echo esc_html(number_format_i18n((int) $posts->found_posts)); ?></strong>
                        <span><?php echo esc_html($search_filter !== '' ? 'matching posts' : 'posts in review'); ?></span>
                    </div>
                    <div class="fir-summary-card">
                        <strong><?php echo esc_html(ucfirst($status_filter === 'any' ? 'all' : $status_filter)); ?></strong>
                        <span>Status filter</span>
                    </div>
                    <div class="fir-summary-card">
                        <strong><?php echo esc_html($category_filter !== '' ? $category_filter : 'All'); ?></strong>
                        <span>Category filter</span>
                    </div>
                </div>
            </div>
            <?php if (!empty($_GET['fir_replaced'])) : ?>
                <div class="notice notice-success is-dismissible"><p>Image replaced, metadata stripped, and attachment details regenerated.</p></div>
            <?php elseif (!empty($_GET['fir_story_added'])) : ?>
                <div class="notice notice-success is-dismissible"><p>Story image added, metadata stripped, and attachment details regenerated.</p></div>
            <?php elseif (!empty($_GET['fir_featured_deleted'])) : ?>
                <div class="notice notice-success is-dismissible"><p>Featured image deleted from the post and Media Library. The post is ready for a new image.</p></div>
            <?php elseif (!empty($_GET['fir_images_deleted'])) : ?>
                <div class="notice notice-success is-dismissible"><p><?php echo esc_html(sprintf(
                    '%d post image%s deleted from the post and Media Library.',
                    absint($_GET['fir_deleted_count'] ?? 0),
                    absint($_GET['fir_deleted_count'] ?? 0) === 1 ? '' : 's'
                )); ?></p></div>
            <?php elseif (!empty($_GET['fir_error'])) : ?>
                <div class="notice notice-error is-dismissible"><p><?php echo esc_html(sanitize_text_field(wp_unslash($_GET['fir_error']))); ?></p></div>
            <?php endif; ?>
            <style>
                .creator-image-review {
                    max-width: 1780px;
                }
                .creator-image-review .fir-hero {
                    align-items: end;
                    display: grid;
                    gap: 18px;
                    grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
                    margin: 10px 0 18px;
                }
                .creator-image-review .fir-eyebrow {
                    color: #2271b1;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: .08em;
                    margin: 0 0 6px;
                    text-transform: uppercase;
                }
                .creator-image-review .fir-hero h1 {
                    font-size: 34px;
                    line-height: 1.02;
                    margin: 0 0 8px;
                }
                .creator-image-review .fir-intro {
                    color: #50575e;
                    font-size: 15px;
                    margin: 0;
                    max-width: 820px;
                }
                .creator-image-review .fir-summary {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                .creator-image-review .fir-summary-card {
                    background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
                    border: 1px solid #d6e3f2;
                    border-radius: 16px;
                    box-shadow: 0 10px 24px rgba(15, 23, 42, .05);
                    display: grid;
                    gap: 4px;
                    min-height: 96px;
                    padding: 16px 18px;
                }
                .creator-image-review .fir-summary-card strong {
                    color: #0f172a;
                    font-size: 26px;
                    line-height: 1;
                }
                .creator-image-review .fir-summary-card span {
                    color: #667085;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .creator-image-review .fir-toolbar {
                    align-items: end;
                    background: #fff;
                    border: 1px solid #dcdcde;
                    border-radius: 18px;
                    box-shadow: 0 12px 24px rgba(15, 23, 42, .05);
                    display: grid;
                    gap: 14px;
                    grid-template-columns: minmax(0, 1fr) auto;
                    margin: 16px 0 18px;
                    padding: 18px;
                }
                .creator-image-review .fir-filter {
                    align-items: end;
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(4, minmax(160px, 1fr));
                }
                .creator-image-review .fir-filter label {
                    color: #344054;
                    display: grid;
                    font-size: 12px;
                    font-weight: 700;
                    gap: 6px;
                    margin: 0;
                    text-transform: uppercase;
                }
                .creator-image-review .fir-filter input[type="search"],
                .creator-image-review .fir-filter select {
                    min-height: 42px;
                    width: 100%;
                }
                .creator-image-review .fir-filter-actions {
                    align-items: end;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-start;
                }
                .creator-image-review .fir-filter-count {
                    color: #475467;
                    font-size: 13px;
                    font-weight: 600;
                    margin: 0;
                    padding-bottom: 8px;
                }
                .creator-image-review .fir-grid {
                    display: grid;
                    gap: 20px;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                }
                .creator-image-review .fir-card {
                    background: #fff;
                    border: 1px solid #dcdcde;
                    border-radius: 20px;
                    box-shadow: 0 14px 30px rgba(15, 23, 42, .06);
                    overflow: hidden;
                    padding: 0;
                }
                .creator-image-review .fir-card-media {
                    background: linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%);
                    padding: 16px 16px 0;
                }
                .creator-image-review .fir-card img {
                    aspect-ratio: 16 / 9;
                    border: 1px solid #d6e3f2;
                    border-radius: 16px;
                    background: #f0f0f1;
                    display: block;
                    height: auto;
                    object-fit: cover;
                    width: 100%;
                }
                .creator-image-review .fir-missing-featured {
                    align-items: center;
                    aspect-ratio: 16 / 9;
                    background: linear-gradient(180deg, #eef4ff 0%, #f8fafc 100%);
                    border: 1px dashed #b7c9e2;
                    border-radius: 16px;
                    color: #646970;
                    display: flex;
                    font-weight: 600;
                    justify-content: center;
                }
                .creator-image-review .fir-card-body {
                    padding: 16px 16px 18px;
                }
                .creator-image-review .fir-card h2 {
                    font-size: 22px;
                    line-height: 1.15;
                    margin: 0 0 8px;
                }
                .creator-image-review .fir-card h2 a {
                    color: #0f172a;
                    text-decoration: none;
                }
                .creator-image-review .fir-card h2 a:hover,
                .creator-image-review .fir-card h2 a:focus {
                    color: #2271b1;
                }
                .creator-image-review .fir-chip-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .creator-image-review .fir-chip {
                    background: #eff6ff;
                    border: 1px solid #dbeafe;
                    border-radius: 999px;
                    color: #1d4ed8;
                    display: inline-flex;
                    font-size: 11px;
                    font-weight: 700;
                    line-height: 1;
                    padding: 7px 10px;
                    text-transform: uppercase;
                }
                .creator-image-review .fir-meta {
                    color: #646970;
                    display: grid;
                    font-size: 12px;
                    gap: 5px;
                    margin: 0 0 14px;
                }
                .creator-image-review .fir-replace {
                    align-items: center;
                    border-top: 1px solid #dcdcde;
                    display: grid;
                    gap: 8px;
                    margin-top: 0;
                    padding-top: 14px;
                }
                .creator-image-review .fir-replace label {
                    color: #344054;
                    display: grid;
                    font-size: 12px;
                    font-weight: 700;
                    gap: 6px;
                    text-transform: uppercase;
                }
                .creator-image-review .fir-actions {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                }
                .creator-image-review .fir-prompts {
                    border-top: 1px solid #dcdcde;
                    margin-top: 14px;
                    padding-top: 14px;
                }
                .creator-image-review .fir-prompts summary {
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                }
                .creator-image-review .fir-prompt-block {
                    display: grid;
                    gap: 6px;
                    margin-top: 12px;
                }
                .creator-image-review .fir-prompt-block textarea {
                    min-height: 120px;
                    resize: vertical;
                    width: 100%;
                }
                .creator-image-review .fir-copy-prompt {
                    justify-self: start;
                }
                .creator-image-review .fir-featured-tools {
                    align-items: center;
                    display: flex;
                    gap: 12px;
                    justify-content: space-between;
                    margin: 0 0 14px;
                }
                .creator-image-review .fir-story-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin: 0 0 14px;
                }
                .creator-image-review .fir-story-item {
                    position: relative;
                }
                .creator-image-review .fir-story-list img {
                    aspect-ratio: 9 / 16;
                    border: 1px solid #dcdcde;
                    border-radius: 10px;
                    height: 112px;
                    object-fit: cover;
                    width: 63px;
                }
                .creator-image-review .fir-delete-story {
                    align-items: center;
                    background: rgba(255, 255, 255, .95);
                    border: 1px solid #d63638;
                    border-radius: 50%;
                    color: #b32d2e;
                    cursor: pointer;
                    display: inline-flex;
                    height: 24px;
                    justify-content: center;
                    padding: 0;
                    position: absolute;
                    right: -6px;
                    top: -6px;
                    width: 24px;
                }
                .creator-image-review .fir-delete-story:hover,
                .creator-image-review .fir-delete-story:focus {
                    background: #d63638;
                    color: #fff;
                }
                .creator-image-review .fir-delete-all {
                    align-items: center;
                    border-top: 1px solid #dcdcde;
                    display: flex;
                    gap: 10px;
                    justify-content: space-between;
                    margin-top: 14px;
                    padding-top: 14px;
                }
                .creator-image-review .fir-delete-all .button-link-delete {
                    font-weight: 600;
                }
                .creator-image-review .fir-pages {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin: 22px 0;
                }
                .creator-image-review .fir-pages .page-numbers {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-radius: 999px;
                    min-width: 18px;
                    padding: 8px 12px;
                    text-align: center;
                    text-decoration: none;
                }
                .creator-image-review .fir-pages .current {
                    background: #2271b1;
                    border-color: #2271b1;
                    color: #fff;
                }
                @media (max-width: 1080px) {
                    .creator-image-review .fir-hero,
                    .creator-image-review .fir-toolbar {
                        grid-template-columns: 1fr;
                    }
                    .creator-image-review .fir-summary,
                    .creator-image-review .fir-filter {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 782px) {
                    .creator-image-review .fir-hero h1 {
                        font-size: 28px;
                    }
                    .creator-image-review .fir-summary,
                    .creator-image-review .fir-filter,
                    .creator-image-review .fir-actions {
                        grid-template-columns: 1fr;
                    }
                    .creator-image-review .fir-grid {
                        grid-template-columns: 1fr;
                    }
                    .creator-image-review .fir-featured-tools,
                    .creator-image-review .fir-delete-all {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }
            </style>
            <div class="fir-toolbar">
                <form class="fir-filter" method="get">
                    <input type="hidden" name="page" value="creator-image-review">
                    <label>
                        Status
                        <select name="fir_status">
                            <option value="any" <?php selected($status_filter, 'any'); ?>>Any</option>
                            <?php foreach (['publish' => 'Published', 'draft' => 'Draft', 'pending' => 'Pending', 'future' => 'Scheduled', 'private' => 'Private'] as $value => $label) : ?>
                                <option value="<?php echo esc_attr($value); ?>" <?php selected($status_filter, $value); ?>><?php echo esc_html($label); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label>
                        Category
                        <select name="fir_category">
                            <option value="" <?php selected($category_filter, ''); ?>>All</option>
                            <?php foreach ($category_options as $category) : ?>
                                <option value="<?php echo esc_attr($category->slug); ?>" <?php selected($category_filter, $category->slug); ?>><?php echo esc_html($category->name); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label>
                        Search
                        <input type="search" name="fir_search" value="<?php echo esc_attr($search_filter); ?>" placeholder="Title, text, or post number">
                    </label>
                    <div class="fir-filter-actions">
                        <?php submit_button('Filter', 'secondary', '', false); ?>
                    </div>
                </form>
                <p class="fir-filter-count"><?php echo esc_html(number_format_i18n((int) $posts->found_posts)); ?> <?php echo $search_filter !== '' ? 'matching posts' : 'posts with images'; ?></p>
            </div>

            <div class="fir-grid">
                <?php if (!$posts->have_posts()) : ?>
                    <p>No assigned images match this filter.</p>
                <?php endif; ?>
                <?php while ($posts->have_posts()) : $posts->the_post(); ?>
                    <?php
                    $post_id = get_the_ID();
                    $thumbnail_id = (int) get_post_thumbnail_id($post_id);
                    $provider = (string) get_post_meta($thumbnail_id, self::META_FEATURED_IMAGE_PROVIDER, true);
                    $origin = (string) get_post_meta($thumbnail_id, self::META_IMAGE_ORIGIN, true);
                    $credit = (string) get_post_meta($thumbnail_id, self::META_IMAGE_CREDIT, true);
                    $status_object = get_post_status_object((string) get_post_status($post_id));
                    $status_label = $status_object ? $status_object->label : (string) get_post_status($post_id);
                    $secondary_items = $this->secondary_social_image_items($post_id);
                    $secondary_count = count($secondary_items);
                    $alternate_main_ids = $this->alternate_main_image_ids($post_id);
                    $all_image_count = count(array_unique(array_filter(array_merge([$thumbnail_id], $alternate_main_ids, array_column($secondary_items, 'attachment_id')))));
                    $category_names = wp_get_post_categories($post_id, ['fields' => 'names']);
                    $category_label = $category_names ? implode(', ', $category_names) : 'Uncategorized';
                    $summary = get_the_excerpt($post_id);
                    if ($summary === '') {
                        $summary = wp_trim_words(wp_strip_all_tags((string) get_post_field('post_content', $post_id)), 34);
                    }
                    $stored_featured_prompt = (string) get_post_meta($post_id, self::META_FEATURED_IMAGE_PROMPT, true);
                    $stored_social_prompt = (string) get_post_meta($post_id, self::META_SOCIAL_IMAGE_PROMPT, true);
                    $landscape_prompt = $this->human_image_prompt([
                        'title' => get_the_title($post_id),
                        'category' => $category_label,
                        'summary' => $summary,
                        'source_prompt' => $stored_social_prompt ?: $stored_featured_prompt,
                        'content' => wp_strip_all_tags((string) get_post_field('post_content', $post_id)),
                    ]);
                    $story_prompt = $this->story_image_prompt_for_post(get_post($post_id), $summary, (string) get_post_meta($post_id, self::META_STORY_IMAGE_PROMPT, true));
                    $landscape_prompt_id = 'fir-landscape-prompt-' . $post_id;
                    $story_prompt_id = 'fir-story-prompt-' . $post_id;
                    ?>
                    <article class="fir-card">
                        <div class="fir-card-media">
                            <a href="<?php echo esc_url(get_edit_post_link($post_id)); ?>">
                                <?php if ($thumbnail_id > 0) : ?>
                                    <?php echo get_the_post_thumbnail($post_id, 'medium_large', ['loading' => 'lazy', 'decoding' => 'async']); ?>
                                <?php else : ?>
                                    <div class="fir-missing-featured">No featured image yet</div>
                                <?php endif; ?>
                            </a>
                        </div>
                        <div class="fir-card-body">
                            <div class="fir-chip-row">
                                <span class="fir-chip">Post #<?php echo esc_html((string) $post_id); ?></span>
                                <span class="fir-chip"><?php echo esc_html($status_label); ?></span>
                                <span class="fir-chip"><?php echo esc_html($category_label); ?></span>
                            </div>
                            <h2><a href="<?php echo esc_url(get_edit_post_link($post_id)); ?>"><?php echo esc_html(get_the_title($post_id)); ?></a></h2>
                            <div class="fir-meta">
                                <span><?php echo $thumbnail_id > 0
                                    ? esc_html('Featured media #' . $thumbnail_id . ' · ' . ($provider ?: 'unknown provider') . ' · ' . ($origin ?: 'unknown origin'))
                                    : 'No featured media assigned'; ?></span>
                                <span><?php echo esc_html($secondary_count . ' Story image' . ($secondary_count === 1 ? '' : 's')); ?></span>
                                <?php if ($credit !== '') : ?>
                                    <span><?php echo esc_html($credit); ?></span>
                                <?php endif; ?>
                            </div>
                            <div class="fir-featured-tools">
                                <span><?php echo $thumbnail_id > 0 ? 'Current featured image' : 'Featured image needed'; ?></span>
                            <?php if ($thumbnail_id > 0) : ?>
                                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                                    <?php wp_nonce_field('cph_delete_featured_image_' . $post_id . '_' . $thumbnail_id); ?>
                                    <input type="hidden" name="action" value="cph_delete_featured_image">
                                    <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $post_id); ?>">
                                    <input type="hidden" name="attachment_id" value="<?php echo esc_attr((string) $thumbnail_id); ?>">
                                    <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_admin_url()); ?>">
                                    <button type="submit" class="button-link-delete" onclick="return confirm('Delete only the current featured image from this post and the Media Library?');">Delete featured image</button>
                                </form>
                            <?php endif; ?>
                            </div>
                            <?php if ($secondary_items) : ?>
                                <div class="fir-story-list" aria-label="Saved Story images">
                                    <?php foreach ($secondary_items as $item) : ?>
                                        <div class="fir-story-item">
                                            <img src="<?php echo esc_url((string) $item['url']); ?>" alt="<?php echo esc_attr((string) ($item['alt'] ?: 'Story image')); ?>" loading="lazy" decoding="async">
                                            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                                                <?php wp_nonce_field('cph_delete_story_image_' . $post_id . '_' . (int) $item['attachment_id']); ?>
                                                <input type="hidden" name="action" value="cph_delete_story_image">
                                                <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $post_id); ?>">
                                                <input type="hidden" name="attachment_id" value="<?php echo esc_attr((string) $item['attachment_id']); ?>">
                                                <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_admin_url()); ?>">
                                                <button type="submit" class="fir-delete-story" title="Delete this Story image from the post and media library" aria-label="Delete this Story image" onclick="return confirm('Delete this Story image from the post and media library?');">
                                                    <span class="dashicons dashicons-trash" aria-hidden="true"></span>
                                                </button>
                                            </form>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                            <div class="fir-actions">
                                <form class="fir-replace" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data">
                                    <?php wp_nonce_field('cph_replace_post_image_' . $post_id); ?>
                                    <input type="hidden" name="action" value="cph_replace_post_image">
                                    <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $post_id); ?>">
                                    <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_admin_url()); ?>">
                                    <label>
                                        <?php echo $thumbnail_id > 0 ? 'Replace featured image' : 'Add featured image'; ?>
                                        <input type="file" name="cph_image" accept="image/png,image/jpeg,image/webp" required>
                                    </label>
                                    <label><input type="checkbox" name="image_origin" value="api"> API generated image</label>
                                    <?php submit_button($thumbnail_id > 0 ? 'Replace image' : 'Add image', 'secondary', 'submit', false); ?>
                                </form>
                                <form class="fir-replace" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data">
                                    <?php wp_nonce_field('cph_add_story_image_' . $post_id); ?>
                                    <input type="hidden" name="action" value="cph_add_story_image">
                                    <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $post_id); ?>">
                                    <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_admin_url()); ?>">
                                    <label>
                                        Add Story image
                                        <input type="file" name="cph_story_image" accept="image/png,image/jpeg,image/webp" required>
                                    </label>
                                    <label><input type="checkbox" name="image_origin" value="api"> API generated image</label>
                                    <?php submit_button('Add Story image', 'secondary', 'submit', false); ?>
                                </form>
                            </div>
                            <details class="fir-prompts" <?php echo ctype_digit($search_filter) ? 'open' : ''; ?>>
                                <summary>Generate new images</summary>
                                <div class="fir-prompt-block">
                                    <strong>Landscape / featured image prompt</strong>
                                    <textarea id="<?php echo esc_attr($landscape_prompt_id); ?>" readonly onclick="this.select();"><?php echo esc_textarea($landscape_prompt); ?></textarea>
                                    <button type="button" class="button fir-copy-prompt" data-copy-target="<?php echo esc_attr($landscape_prompt_id); ?>">Copy landscape prompt</button>
                                </div>
                                <div class="fir-prompt-block">
                                    <strong>Vertical Story / Reel image prompt</strong>
                                    <textarea id="<?php echo esc_attr($story_prompt_id); ?>" readonly onclick="this.select();"><?php echo esc_textarea($story_prompt); ?></textarea>
                                    <button type="button" class="button fir-copy-prompt" data-copy-target="<?php echo esc_attr($story_prompt_id); ?>">Copy Story prompt</button>
                                </div>
                            </details>
                            <?php if ($all_image_count > 0) : ?><form class="fir-delete-all" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                                <?php wp_nonce_field('cph_delete_all_post_images_' . $post_id); ?>
                                <input type="hidden" name="action" value="cph_delete_all_post_images">
                                <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $post_id); ?>">
                                <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_admin_url()); ?>">
                                <span>Featured, extra main, and Story images</span>
                                <button type="submit" class="button-link-delete" onclick="return confirm('Permanently delete all <?php echo esc_js((string) $all_image_count); ?> images for this post from the post and Media Library? This cannot be undone.');">Delete all images (<?php echo esc_html((string) $all_image_count); ?>)</button>
                            </form><?php endif; ?>
                        </div>
                    </article>
                <?php endwhile; wp_reset_postdata(); ?>
            </div>

            <?php
            $page_links = paginate_links([
                'base' => add_query_arg('fir_paged', '%#%', $this->current_admin_url()),
                'format' => '',
                'current' => $current_page,
                'total' => max(1, (int) $posts->max_num_pages),
                'type' => 'array',
                'prev_text' => 'Previous',
                'next_text' => 'Next',
            ]);
            if (is_array($page_links)) :
                ?>
                <nav class="fir-pages" aria-label="Image Review pages">
                    <?php foreach ($page_links as $link) : ?>
                        <?php echo wp_kses_post($link); ?>
                    <?php endforeach; ?>
                </nav>
            <?php endif; ?>
            <script>
                document.addEventListener('click', async function (event) {
                    const button = event.target.closest('.fir-copy-prompt');
                    if (!button) return;
                    const field = document.getElementById(button.dataset.copyTarget || '');
                    if (!field) return;
                    try {
                        await navigator.clipboard.writeText(field.value);
                    } catch (error) {
                        field.focus();
                        field.select();
                        document.execCommand('copy');
                    }
                    const original = button.textContent;
                    button.textContent = 'Copied';
                    window.setTimeout(function () { button.textContent = original; }, 1400);
                });
            </script>
        </div>
        <?php
    }

    public function render_image_stats(): void {
        $stats = $this->image_helper_stats();
        $inventory = $this->image_inventory_stats();
        $activity = $this->image_activity_stats($this->image_activity_log());
        $labels = array_map(static fn(array $row): string => $row['name'], $stats);
        $featured = array_map(static fn(array $row): int => $row['completed'], $stats);
        $extra_main = array_map(static fn(array $row): int => $row['extra_main'], $stats);
        $stories = array_map(static fn(array $row): int => $row['stories'], $stats);
        $hour_labels = array_map(static fn(int $hour): string => sprintf('%02d:00', $hour), range(0, 23));
        $weekday_labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $type_labels = ['Featured', 'Extra main', 'Story'];
        $type_data = [
            (int) ($activity['types']['featured'] ?? 0),
            (int) ($activity['types']['main'] ?? 0),
            (int) ($activity['types']['story'] ?? 0),
        ];
        ?>
        <div class="wrap creator-image-stats">
            <h1>Creator Image Stats</h1>
            <p>Tracks Image Desk production across featured images, extra main images, and Story images. Helper/time charts use recorded Image Desk events; inventory totals count what is attached right now.</p>
            <style>
                .creator-image-stats { max-width: 1500px; }
                .creator-image-stats .fis-kpis {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    margin: 16px 0;
                }
                .creator-image-stats .fis-kpi {
                    background: #fff;
                    border: 1px solid #dcdcde;
                    border-radius: 4px;
                    padding: 13px 14px;
                }
                .creator-image-stats .fis-kpi strong {
                    color: #1d2327;
                    display: block;
                    font-size: 26px;
                    line-height: 1.1;
                }
                .creator-image-stats .fis-kpi span {
                    color: #646970;
                    display: block;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: .04em;
                    margin-top: 5px;
                    text-transform: uppercase;
                }
                .creator-image-stats .fis-grid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    margin-top: 16px;
                }
                .creator-image-stats .fis-panel {
                    background: #fff;
                    border: 1px solid #dcdcde;
                    border-radius: 4px;
                    padding: 16px;
                }
                .creator-image-stats .fis-panel.is-wide { grid-column: 1 / -1; }
                .creator-image-stats .fis-chart-wrap {
                    height: 320px;
                    position: relative;
                }
                .creator-image-stats .fis-bars {
                    display: grid;
                    gap: 8px;
                    margin-top: 14px;
                }
                .creator-image-stats .fis-bar {
                    align-items: center;
                    display: grid;
                    gap: 8px;
                    grid-template-columns: 160px 1fr 70px;
                }
                .creator-image-stats .fis-bar-track {
                    background: #f0f0f1;
                    height: 14px;
                }
                .creator-image-stats .fis-bar-fill {
                    background: #2271b1;
                    height: 14px;
                }
                .creator-image-stats .fis-note {
                    color: #646970;
                    font-size: 12px;
                    margin: 8px 0 0;
                }
                @media (max-width: 960px) {
                    .creator-image-stats .fis-grid { grid-template-columns: 1fr; }
                }
            </style>
            <div class="fis-kpis">
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['waiting_for_images'])); ?></strong><span>Waiting for images</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['ready_drafts'])); ?></strong><span>Ready drafts</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['featured_images'])); ?></strong><span>Featured images</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['extra_main_images'])); ?></strong><span>Extra main images</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['story_images'])); ?></strong><span>Story images</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['total_images'])); ?></strong><span>Total attached images</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['posts_with_extra_main'])); ?></strong><span>Posts with extra main</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($inventory['posts_with_story'])); ?></strong><span>Posts with Stories</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($activity['saved_count'])); ?></strong><span>Recorded saves</span></div>
                <div class="fis-kpi"><strong><?php echo esc_html(number_format_i18n($activity['deleted_count'])); ?></strong><span>Recorded deletions</span></div>
            </div>
            <div class="fis-grid">
                <div class="fis-panel is-wide">
                    <h2>Helper Output by Image Type</h2>
                    <div class="fis-chart-wrap">
                        <canvas id="cph-helper-chart"
                            data-labels="<?php echo esc_attr(wp_json_encode($labels)); ?>"
                            data-featured="<?php echo esc_attr(wp_json_encode($featured)); ?>"
                            data-main="<?php echo esc_attr(wp_json_encode($extra_main)); ?>"
                            data-stories="<?php echo esc_attr(wp_json_encode($stories)); ?>"
                        ></canvas>
                    </div>
                    <div class="fis-bars" aria-label="Fallback helper chart">
                        <?php
                        $max_completed = max(1, ...array_map(static fn(array $row): int => $row['total_images'], $stats ?: [['total_images' => 0]]));
                        foreach ($stats as $row) :
                            $width = max(2, (int) round(($row['total_images'] / $max_completed) * 100));
                            ?>
                            <div class="fis-bar">
                                <span><?php echo esc_html($row['name']); ?></span>
                                <span class="fis-bar-track"><span class="fis-bar-fill" style="display:block;width:<?php echo esc_attr((string) $width); ?>%"></span></span>
                                <strong><?php echo esc_html(number_format_i18n($row['total_images'])); ?></strong>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <p class="fis-note">Featured counts include the original completion tracker. Extra main and Story helper counts start from version 0.2.15 onward.</p>
                </div>
                <div class="fis-panel is-wide">
                    <h2>Helper Ranking</h2>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th>Helper</th>
                                <th>Username</th>
                                <th>Featured</th>
                                <th>Extra main</th>
                                <th>Stories</th>
                                <th>Total</th>
                                <th>Avg featured time</th>
                                <th>Last event</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!$stats) : ?>
                                <tr><td colspan="8">No image completions recorded yet.</td></tr>
                            <?php endif; ?>
                            <?php foreach ($stats as $row) : ?>
                                <tr>
                                    <td><?php echo esc_html($row['name']); ?></td>
                                    <td><?php echo esc_html($row['login']); ?></td>
                                    <td><?php echo esc_html(number_format_i18n($row['completed'])); ?></td>
                                    <td><?php echo esc_html(number_format_i18n($row['extra_main'])); ?></td>
                                    <td><?php echo esc_html(number_format_i18n($row['stories'])); ?></td>
                                    <td><strong><?php echo esc_html(number_format_i18n($row['total_images'])); ?></strong></td>
                                    <td><?php echo esc_html($row['average_minutes'] > 0 ? $row['average_minutes'] . ' min' : 'n/a'); ?></td>
                                    <td><?php echo esc_html($row['last_event'] ?: 'n/a'); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="fis-panel">
                    <h2>Image Type Mix</h2>
                    <div class="fis-chart-wrap">
                        <canvas id="cph-type-chart"
                            data-labels="<?php echo esc_attr(wp_json_encode($type_labels)); ?>"
                            data-values="<?php echo esc_attr(wp_json_encode($type_data)); ?>"
                        ></canvas>
                    </div>
                </div>
                <div class="fis-panel">
                    <h2>Best Work Hours</h2>
                    <div class="fis-chart-wrap">
                        <canvas id="cph-hour-chart"
                            data-labels="<?php echo esc_attr(wp_json_encode($hour_labels)); ?>"
                            data-values="<?php echo esc_attr(wp_json_encode(array_values($activity['hours']))); ?>"
                        ></canvas>
                    </div>
                </div>
                <div class="fis-panel">
                    <h2>Day of Week</h2>
                    <div class="fis-chart-wrap">
                        <canvas id="cph-weekday-chart"
                            data-labels="<?php echo esc_attr(wp_json_encode($weekday_labels)); ?>"
                            data-values="<?php echo esc_attr(wp_json_encode(array_values($activity['weekdays']))); ?>"
                        ></canvas>
                    </div>
                </div>
                <div class="fis-panel">
                    <h2>Inventory Notes</h2>
                    <table class="widefat striped">
                        <tbody>
                            <tr><th>Posts checked</th><td><?php echo esc_html(number_format_i18n($inventory['posts_checked'])); ?></td></tr>
                            <tr><th>Posts with extra main images</th><td><?php echo esc_html(number_format_i18n($inventory['posts_with_extra_main'])); ?></td></tr>
                            <tr><th>Posts with Story images</th><td><?php echo esc_html(number_format_i18n($inventory['posts_with_story'])); ?></td></tr>
                            <tr><th>Largest main stack</th><td><?php echo esc_html(number_format_i18n($inventory['largest_main_stack'])); ?> images</td></tr>
                            <tr><th>Largest Story stack</th><td><?php echo esc_html(number_format_i18n($inventory['largest_story_stack'])); ?> images</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="fis-panel is-wide">
                    <h2>Recent Image Desk Saves</h2>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th>When</th>
                                <th>Helper</th>
                                <th>Action</th>
                                <th>Preview</th>
                                <th>Type</th>
                                <th>Post</th>
                                <th>File</th>
                                <th>Source</th>
                                <th>Size</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!$activity['recent']) : ?>
                                <tr><td colspan="10">No detailed image events recorded yet. New saves and deletions will appear here.</td></tr>
                            <?php endif; ?>
                            <?php foreach ($activity['recent'] as $event) : ?>
                                <tr>
                                    <td><?php echo esc_html((string) ($event['local_at'] ?? $event['at'] ?? '')); ?></td>
                                    <td><?php echo esc_html((string) (($event['user_name'] ?? '') ?: ($event['user_login'] ?? 'unknown'))); ?></td>
                                    <td><strong><?php echo esc_html(ucfirst((string) ($event['action'] ?? 'saved'))); ?></strong></td>
                                    <td>
                                        <?php if (!empty($event['thumbnail_url'])) : ?>
                                            <a href="<?php echo esc_url((string) ($event['full_url'] ?? $event['thumbnail_url'])); ?>" target="_blank" rel="noopener">
                                                <img src="<?php echo esc_url((string) $event['thumbnail_url']); ?>" alt="" loading="lazy" style="display:block;width:72px;height:48px;object-fit:cover;">
                                            </a>
                                        <?php else : ?>
                                            n/a
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo esc_html($this->image_activity_type_label((string) ($event['type'] ?? ''))); ?></td>
                                    <td>
                                        <a href="<?php echo esc_url(get_edit_post_link((int) ($event['post_id'] ?? 0))); ?>">
                                            #<?php echo esc_html((string) ((int) ($event['post_id'] ?? 0))); ?>
                                            <?php echo esc_html((string) ($event['post_title'] ?? '')); ?>
                                        </a>
                                    </td>
                                    <td><?php echo esc_html((string) ($event['filename'] ?? '')); ?></td>
                                    <td><?php echo esc_html(implode(' / ', array_filter([(string) ($event['provider'] ?? ''), (string) ($event['origin'] ?? '')])) ?: 'unknown'); ?></td>
                                    <td><?php echo esc_html(!empty($event['width']) && !empty($event['height']) ? ((int) $event['width']) . '×' . ((int) $event['height']) : 'n/a'); ?></td>
                                    <td><?php echo esc_html(!empty($event['seconds']) ? max(1, (int) round(((int) $event['seconds']) / 60)) . ' min' : 'n/a'); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js"></script>
            <script>
                (function () {
                    if (typeof Chart === 'undefined') {
                        return;
                    }
                    const chart = (id, config) => {
                        const canvas = document.getElementById(id);
                        if (canvas) {
                            new Chart(canvas, config(canvas));
                        }
                    };
                    chart('cph-helper-chart', (canvas) => ({
                        type: 'bar',
                        data: {
                            labels: JSON.parse(canvas.dataset.labels || '[]'),
                            datasets: [
                                { label: 'Featured', data: JSON.parse(canvas.dataset.featured || '[]'), backgroundColor: '#2271b1' },
                                { label: 'Extra main', data: JSON.parse(canvas.dataset.main || '[]'), backgroundColor: '#00a32a' },
                                { label: 'Story', data: JSON.parse(canvas.dataset.stories || '[]'), backgroundColor: '#dba617' }
                            ]
                        },
                        options: { maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
                    }));
                    chart('cph-type-chart', (canvas) => ({
                        type: 'doughnut',
                        data: {
                            labels: JSON.parse(canvas.dataset.labels || '[]'),
                            datasets: [{ data: JSON.parse(canvas.dataset.values || '[]'), backgroundColor: ['#2271b1', '#00a32a', '#dba617'] }]
                        },
                        options: { maintainAspectRatio: false, responsive: true }
                    }));
                    chart('cph-hour-chart', (canvas) => ({
                        type: 'bar',
                        data: {
                            labels: JSON.parse(canvas.dataset.labels || '[]'),
                            datasets: [{ label: 'Saves', data: JSON.parse(canvas.dataset.values || '[]'), backgroundColor: '#2271b1' }]
                        },
                        options: { maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
                    }));
                    chart('cph-weekday-chart', (canvas) => ({
                        type: 'bar',
                        data: {
                            labels: JSON.parse(canvas.dataset.labels || '[]'),
                            datasets: [{ label: 'Saves', data: JSON.parse(canvas.dataset.values || '[]'), backgroundColor: '#00a32a' }]
                        },
                        options: { maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
                    }));
                })();
            </script>
        </div>
        <?php
    }

    public function render_image_audit(): void {
        if (!current_user_can('edit_posts')) {
            wp_die('You do not have permission to view image audit.');
        }

        $snapshot = $this->image_inventory_audit_snapshot();
        $view = sanitize_key((string) ($_GET['audit_view'] ?? 'needs_review'));
        if ($view === 'all') {
            $view = 'needs_review';
        }
        if (!in_array($view, ['current', 'needs_review', 'flagged', 'approved', 'history'], true)) {
            $view = 'needs_review';
        }

        $reviews = $this->image_audit_reviews();
        $events = $this->image_activity_log();
        $automation = $this->image_automation_stats($events, $reviews);
        $audio_automation = $this->audio_automation_stats();
        $rows = [];
        $counts = [
            'current' => 0,
            'needs_review' => 0,
            'flagged' => 0,
            'approved' => 0,
            'history' => 0,
        ];

        foreach ($events as $event) {
            if (!is_array($event)) {
                continue;
            }

            $key = $this->image_audit_event_key($event);
            $review = is_array($reviews[$key] ?? null) ? $reviews[$key] : [];
            $decision = sanitize_key((string) ($review['decision'] ?? ''));
            $event = $this->resolve_image_audit_event($event);
            $warnings = $this->image_audit_warnings($event);
            $reviewable = (string) ($event['current_media_state'] ?? '') === 'current';
            $needs_review = $reviewable && $decision === '' && !empty($warnings);
            if (!$reviewable) {
                $decision = 'history';
            } elseif ($decision === '') {
                $decision = $needs_review ? 'needs_review' : 'unreviewed';
            }

            if (!$reviewable) {
                $counts['history']++;
            } else {
                $counts['current']++;
                if ($decision === 'approved') {
                    $counts['approved']++;
                } elseif ($decision === 'flagged') {
                    $counts['flagged']++;
                } elseif ($needs_review) {
                    $counts['needs_review']++;
                }
            }

            $include = match ($view) {
                'approved' => $reviewable && $decision === 'approved',
                'flagged' => $reviewable && $decision === 'flagged',
                'history' => !$reviewable,
                'needs_review' => $decision === 'flagged' || $needs_review,
                default => $reviewable,
            };
            if (!$include) {
                continue;
            }

            $rows[] = [
                'key' => $key,
                'event' => $event,
                'review' => $review,
                'decision' => $decision,
                'warnings' => $warnings,
                'reviewable' => $reviewable,
            ];
        }

        $rows = array_slice($rows, 0, 250);
        $base_url = admin_url('admin.php?page=creator-image-audit');
        $run_audit_url = wp_nonce_url(
            add_query_arg(['action' => 'cph_run_image_inventory_audit'], admin_url('admin-post.php')),
            'cph_run_image_inventory_audit'
        );
        ?>
        <div class="wrap creator-image-audit">
            <h1>Image &amp; Automation Audit</h1>
            <p>Run a live scan of every managed image attached to an active post. The audit verifies attachment records, physical files, generated thumbnails, dimensions, and Landscape/Story orientation, then saves a completed result you can review.</p>
            <?php if (!empty($_GET['audit_updated'])) : ?>
                <div class="notice notice-success is-dismissible"><p>Image audit decision saved.</p></div>
            <?php endif; ?>
            <?php if (!empty($_GET['audit_completed'])) : ?>
                <div class="notice notice-success is-dismissible"><p>Live media audit completed and saved.</p></div>
            <?php endif; ?>
            <style>
                .creator-image-audit { max-width: 1500px; }
                .creator-image-audit .fia-tabs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin: 16px 0;
                }
                .creator-image-audit .fia-tabs a {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-radius: 4px;
                    color: #1d2327;
                    font-weight: 700;
                    padding: 8px 11px;
                    text-decoration: none;
                }
                .creator-image-audit .fia-tabs a.is-current {
                    background: #2271b1;
                    border-color: #2271b1;
                    color: #fff;
                }
                .creator-image-audit .fia-automation {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-radius: 4px;
                    margin: 16px 0;
                    padding: 16px;
                }
                .creator-image-audit .fia-automation h2 {
                    margin: 0 0 4px;
                }
                .creator-image-audit .fia-automation-grid {
                    display: grid;
                    gap: 10px;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    margin-top: 14px;
                }
                .creator-image-audit .fia-automation-kpi {
                    background: #f6f7f7;
                    border-left: 4px solid #2271b1;
                    padding: 12px;
                }
                .creator-image-audit .fia-automation-kpi strong {
                    display: block;
                    font-size: 24px;
                    line-height: 1.1;
                }
                .creator-image-audit .fia-automation-kpi span,
                .creator-image-audit .fia-automation-note {
                    color: #50575e;
                    font-size: 12px;
                }
                .creator-image-audit .fia-automation-note {
                    margin: 12px 0 0;
                }
                .creator-image-audit .fia-audio-table {
                    margin-top: 14px;
                }
                .creator-image-audit .fia-audio-status {
                    font-weight: 700;
                }
                .creator-image-audit .fia-audio-status.is-success { color: #006b2d; }
                .creator-image-audit .fia-audio-status.is-empty { color: #50575e; }
                .creator-image-audit .fia-audio-status.is-running { color: #135e96; }
                .creator-image-audit .fia-audio-status.is-failed { color: #b32d2e; }
                .creator-image-audit .fia-audio-error {
                    color: #b32d2e;
                    display: block;
                    max-width: 520px;
                    overflow-wrap: anywhere;
                }
                .creator-image-audit .fia-warning {
                    background: #fff4ce;
                    border-radius: 999px;
                    color: #5c4400;
                    display: inline-block;
                    font-size: 12px;
                    font-weight: 700;
                    margin: 0 4px 4px 0;
                    padding: 3px 8px;
                }
                .creator-image-audit .fia-decision {
                    background: #f6f7f7;
                    border-radius: 999px;
                    display: inline-block;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 3px 8px;
                    text-transform: uppercase;
                }
                .creator-image-audit .fia-decision.is-approved { background: #edfaef; color: #006b2d; }
                .creator-image-audit .fia-decision.is-flagged { background: #fcf0f1; color: #8a2424; }
                .creator-image-audit .fia-thumb {
                    background: #f0f0f1;
                    display: block;
                    height: 76px;
                    object-fit: cover;
                    width: 112px;
                }
                .creator-image-audit .fia-thumb-state {
                    align-items: center;
                    background: #f0f0f1;
                    border: 1px dashed #a7aaad;
                    color: #50575e;
                    display: flex;
                    font-size: 12px;
                    font-weight: 700;
                    height: 74px;
                    justify-content: center;
                    text-align: center;
                    width: 110px;
                }
                .creator-image-audit .fia-actions {
                    align-items: center;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .creator-image-audit .fia-actions .button {
                    min-height: 30px;
                }
                .creator-image-audit table td {
                    vertical-align: middle;
                }
                .creator-image-audit .fia-empty {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-left: 4px solid #00a32a;
                    margin-top: 12px;
                    padding: 18px;
                }
                .creator-image-audit .fia-empty strong {
                    display: block;
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                .creator-image-audit .fia-run {
                    align-items: center;
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    justify-content: space-between;
                    margin: 16px 0;
                    padding: 16px;
                }
                .creator-image-audit .fia-run h2 { margin: 0 0 4px; }
                .creator-image-audit .fia-run p { margin: 0; }
                .creator-image-audit .fia-result-grid {
                    display: grid;
                    gap: 10px;
                    grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
                    margin: 14px 0 0;
                }
                .creator-image-audit .fia-result {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-top: 4px solid #2271b1;
                    padding: 12px;
                }
                .creator-image-audit .fia-result.is-pass { border-top-color: #00a32a; }
                .creator-image-audit .fia-result.is-fail { border-top-color: #d63638; }
                .creator-image-audit .fia-result strong { display: block; font-size: 24px; }
            </style>
            <section class="fia-run" aria-labelledby="fia-run-title">
                <div>
                    <h2 id="fia-run-title">Live media audit</h2>
                    <?php if (!empty($snapshot['completed_at'])) : ?>
                        <p><strong>Completed:</strong> <?php echo esc_html((string) $snapshot['completed_at']); ?> by <?php echo esc_html((string) (($snapshot['completed_by'] ?? '') ?: 'CPH authenticated worker')); ?>. This is a saved scan result, not an activity estimate.</p>
                    <?php else : ?>
                        <p>No completed live media audit has been saved yet.</p>
                    <?php endif; ?>
                </div>
                <a class="button button-primary button-hero" href="<?php echo esc_url($run_audit_url); ?>">Run live image audit now</a>
            </section>
            <?php if (!empty($snapshot['completed_at'])) : ?>
                <div class="fia-result-grid" aria-label="Completed audit results">
                    <div class="fia-result"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['posts_checked'] ?? 0))); ?></strong><span>Posts checked</span></div>
                    <div class="fia-result"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['images_checked'] ?? 0))); ?></strong><span>Managed images checked</span></div>
                    <div class="fia-result"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['roles_expected'] ?? 0))); ?></strong><span>Required roles checked</span></div>
                    <div class="fia-result is-pass"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['passed'] ?? 0))); ?></strong><span>Images passed</span></div>
                    <div class="fia-result <?php echo !empty($snapshot['failed']) ? 'is-fail' : 'is-pass'; ?>"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['failed'] ?? 0))); ?></strong><span>Images failed</span></div>
                    <div class="fia-result <?php echo !empty($snapshot['posts_missing_landscape']) ? 'is-fail' : 'is-pass'; ?>"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['posts_missing_landscape'] ?? 0))); ?></strong><span>Posts missing Landscape</span></div>
                    <div class="fia-result <?php echo !empty($snapshot['posts_missing_story']) ? 'is-fail' : 'is-pass'; ?>"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['posts_missing_story'] ?? 0))); ?></strong><span>Posts missing Story</span></div>
                    <div class="fia-result <?php echo !empty($snapshot['visual_reviews_required']) ? 'is-fail' : 'is-pass'; ?>"><strong><?php echo esc_html(number_format_i18n((int) ($snapshot['visual_reviews_required'] ?? 0))); ?></strong><span>Visual reviews waiting</span></div>
                </div>
                <?php $audit_issues = is_array($snapshot['issues'] ?? null) ? $snapshot['issues'] : []; ?>
                <h2>Completed scan exceptions</h2>
                <?php if (!$audit_issues) : ?>
                    <div class="fia-empty"><strong>Every checked managed image passed.</strong><span>No missing files, thumbnail failures, dimension failures, or role-orientation problems were found in this completed scan.</span></div>
                <?php else : ?>
                    <table class="widefat striped">
                        <thead><tr><th>Post</th><th>Role</th><th>Attachment</th><th>Result</th><th>Checks failed</th></tr></thead>
                        <tbody>
                        <?php foreach ($audit_issues as $issue) : ?>
                            <tr>
                                <td><a href="<?php echo esc_url(get_edit_post_link((int) ($issue['post_id'] ?? 0), 'raw')); ?>">#<?php echo esc_html((string) ((int) ($issue['post_id'] ?? 0))); ?> <?php echo esc_html((string) ($issue['post_title'] ?? '')); ?></a></td>
                                <td><?php echo esc_html((string) ($issue['role'] ?? '')); ?></td>
                                <td><?php echo !empty($issue['attachment_id']) ? '#' . esc_html((string) ((int) $issue['attachment_id'])) : '&mdash;'; ?></td>
                                <td><strong>Failed</strong></td>
                                <td><?php echo esc_html(implode('; ', array_map('sanitize_text_field', (array) ($issue['failures'] ?? [])))); ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
                <?php $visual_reviews = is_array($snapshot['visual_reviews'] ?? null) ? $snapshot['visual_reviews'] : []; ?>
                <h2>Visual reviews waiting</h2>
                <?php if (!$visual_reviews) : ?>
                    <div class="fia-empty"><strong>No provider-based visual reviews are waiting.</strong><span>Every present role is either trusted or already handled by the current image workflow.</span></div>
                <?php else : ?>
                    <table class="widefat striped">
                        <thead><tr><th>Post</th><th>Role</th><th>Attachment</th><th>Provider</th><th>Review</th></tr></thead>
                        <tbody>
                        <?php foreach ($visual_reviews as $visual_review) : ?>
                            <tr>
                                <td>#<?php echo esc_html((string) ((int) ($visual_review['post_id'] ?? 0))); ?> <?php echo esc_html((string) ($visual_review['post_title'] ?? '')); ?></td>
                                <td><?php echo esc_html((string) ($visual_review['role'] ?? '')); ?></td>
                                <td>#<?php echo esc_html((string) ((int) ($visual_review['attachment_id'] ?? 0))); ?></td>
                                <td><?php echo esc_html((string) ($visual_review['provider'] ?? 'unknown')); ?></td>
                                <td><a class="button" href="<?php echo esc_url(add_query_arg(['page' => 'creator-image-review', 'fir_search' => (int) ($visual_review['post_id'] ?? 0)], admin_url('admin.php'))); ?>">Open visual review</a></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            <?php endif; ?>
            <section class="fia-automation" aria-labelledby="fia-automation-title">
                <h2 id="fia-automation-title">Automation activity</h2>
                <p>Counts come from retained Image Desk save events. An event is automated only when its saved origin is <code>api</code>; manual and unknown-origin saves are kept separate.</p>
                <div class="fia-automation-grid">
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['automated_saves'])); ?></strong><span>API-automated saves</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['automation_share'], 1)); ?>%</strong><span>Automation share</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['automated_last_24h'])); ?></strong><span>Automated in last 24h</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['passed_automatic_checks'])); ?></strong><span>Passed automatic checks</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['exceptions_waiting'])); ?></strong><span>Automation exceptions waiting</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['human_reviewed_automated'])); ?></strong><span>Human-reviewed API saves</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($automation['manual_or_unknown_saves'])); ?></strong><span>Manual or unknown saves</span></div>
                </div>
                <p class="fia-automation-note">
                    Automated role mix: <?php echo esc_html(number_format_i18n($automation['automated_landscapes'])); ?> Landscape and <?php echo esc_html(number_format_i18n($automation['automated_stories'])); ?> Story saves.
                    Automatic checks do not equal editorial approval; Approve and Flag remain human audit decisions.
                </p>
            </section>
            <section class="fia-automation" aria-labelledby="fia-audio-automation-title">
                <h2 id="fia-audio-automation-title">Audio automation</h2>
                <p>Ryzen reports each scheduled audio attempt here, including successful attachments, empty queues, active runs, and failures. Failure emails go to the configured CPH operations recipients once per state change.</p>
                <div class="fia-automation-grid">
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($audio_automation['runs_last_24h'])); ?></strong><span>Runs in last 24h</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($audio_automation['processed_last_24h'])); ?></strong><span>Audio items attached in last 24h</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($audio_automation['empty_last_24h'])); ?></strong><span>Healthy empty-queue runs</span></div>
                    <div class="fia-automation-kpi"><strong><?php echo esc_html(number_format_i18n($audio_automation['failed_last_24h'])); ?></strong><span>Failed runs in last 24h</span></div>
                </div>
                <table class="widefat striped fia-audio-table">
                    <thead>
                        <tr>
                            <th>Publication</th>
                            <th>Status</th>
                            <th>Last attempt</th>
                            <th>Checked</th>
                            <th>Attached</th>
                            <th>Next expected by</th>
                            <th>Failure detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($audio_automation['sites'] as $audio_site) : ?>
                            <tr>
                                <td><strong><?php echo esc_html($audio_site['site_name']); ?></strong></td>
                                <td><span class="fia-audio-status is-<?php echo esc_attr($audio_site['outcome']); ?>"><?php echo esc_html(ucfirst($audio_site['outcome'])); ?></span></td>
                                <td><?php echo esc_html($audio_site['last_attempt'] ?: 'Not reported'); ?></td>
                                <td><?php echo esc_html(number_format_i18n((int) $audio_site['checked'])); ?></td>
                                <td><?php echo esc_html(number_format_i18n((int) $audio_site['processed'])); ?></td>
                                <td><?php echo esc_html($audio_site['next_expected_at'] ?: 'Awaiting first report'); ?></td>
                                <td>
                                    <?php if ($audio_site['error'] !== '') : ?>
                                        <span class="fia-audio-error"><?php echo esc_html($audio_site['error']); ?></span>
                                    <?php else : ?>
                                        &mdash;
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p class="fia-automation-note">Cadence: every 15 minutes on Ryzen. “Empty” means the scheduler ran successfully and found no published article waiting for audio; it is not a failure.</p>
            </section>
            <nav class="fia-tabs" aria-label="Image audit filters">
                <?php
                $tabs = [
                    'needs_review' => 'Needs review',
                    'flagged' => 'Flagged',
                    'current' => 'Passing/current',
                    'approved' => 'Approved',
                    'history' => 'History',
                ];
                foreach ($tabs as $tab_key => $label) :
                    $url = add_query_arg('audit_view', $tab_key, $base_url);
                    ?>
                    <a class="<?php echo $view === $tab_key ? 'is-current' : ''; ?>" href="<?php echo esc_url($url); ?>">
                        <?php echo esc_html($label); ?> <?php echo esc_html(number_format_i18n((int) ($counts[$tab_key] ?? 0))); ?>
                    </a>
                <?php endforeach; ?>
            </nav>
            <h2>Image Desk event review</h2>
            <p>This separate section retains Image Desk save history. It is not the completed live-media audit above.</p>
            <?php if (!$rows) : ?>
                <div class="fia-empty">
                    <strong><?php echo $view === 'needs_review' ? 'No Image Desk event warnings are waiting.' : 'No Image Desk events in this view.'; ?></strong>
                    <span><?php echo $view === 'needs_review' ? 'Use the completed live-media audit above for missing-role failures and visual reviews.' : 'Choose another event-history view to inspect its records.'; ?></span>
                </div>
            <?php else : ?>
            <table class="widefat striped">
                <thead>
                    <tr>
                        <th>Recorded</th>
                        <th>Helper</th>
                        <th>Image</th>
                        <th>Post</th>
                        <th>Checks</th>
                        <th>Status</th>
                        <th>Review</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $row) :
                        $event = $row['event'];
                        $warnings = $row['warnings'];
                        $decision = $row['decision'];
                        $post_id = (int) ($event['post_id'] ?? 0);
                        $attachment_id = (int) ($event['attachment_id'] ?? 0);
                        $edit_url = $post_id > 0 ? get_edit_post_link($post_id, 'raw') : '';
                        $review_url = $post_id > 0 ? add_query_arg(['page' => 'creator-image-review', 'fir_search' => $post_id], admin_url('admin.php')) : '';
                        ?>
                        <tr>
                            <td>
                                <?php echo esc_html((string) ($event['local_at'] ?? $event['at'] ?? '')); ?><br>
                                <small><?php echo esc_html(ucfirst((string) ($event['action'] ?? 'saved'))); ?></small>
                            </td>
                            <td>
                                <strong><?php echo esc_html((string) (($event['user_name'] ?? '') ?: ($event['user_login'] ?? 'unknown'))); ?></strong><br>
                                <small><?php echo esc_html((string) ($event['user_login'] ?? '')); ?></small>
                            </td>
                            <td>
                                <?php if (!empty($event['current_thumbnail_url']) && !empty($event['physical_file_exists'])) : ?>
                                    <a href="<?php echo esc_url((string) ($event['current_full_url'] ?? $event['current_thumbnail_url'])); ?>" target="_blank" rel="noopener">
                                        <img class="fia-thumb" src="<?php echo esc_url((string) $event['current_thumbnail_url']); ?>" alt="" loading="lazy">
                                    </a>
                                <?php else : ?>
                                    <span class="fia-thumb-state"><?php echo esc_html((string) ($event['current_media_state_label'] ?? 'Media unavailable')); ?></span>
                                <?php endif; ?>
                                <small>
                                    <?php echo esc_html($this->image_activity_type_label((string) ($event['type'] ?? ''))); ?>
                                    <?php if ($attachment_id > 0) : ?> #<?php echo esc_html((string) $attachment_id); ?><?php endif; ?>
                                    <br><?php echo esc_html(!empty($event['width']) && !empty($event['height']) ? ((int) $event['width']) . ' x ' . ((int) $event['height']) : 'size unknown'); ?>
                                </small>
                            </td>
                            <td>
                                <?php if ($edit_url !== '') : ?>
                                    <a href="<?php echo esc_url($edit_url); ?>">#<?php echo esc_html((string) $post_id); ?> <?php echo esc_html((string) ($event['post_title'] ?? '')); ?></a>
                                <?php else : ?>
                                    #<?php echo esc_html((string) $post_id); ?> <?php echo esc_html((string) ($event['post_title'] ?? '')); ?>
                                <?php endif; ?>
                                <?php if ($review_url !== '') : ?>
                                    <br><a href="<?php echo esc_url($review_url); ?>">Open Image Review</a>
                                <?php endif; ?>
                                <br><small><?php echo esc_html((string) ($event['filename'] ?? '')); ?></small>
                            </td>
                            <td>
                                <?php if (!$warnings) : ?>
                                    <span class="fia-warning" style="background:#edfaef;color:#006b2d;">No warnings</span>
                                <?php endif; ?>
                                <?php foreach ($warnings as $warning) : ?>
                                    <span class="fia-warning"><?php echo esc_html($warning); ?></span>
                                <?php endforeach; ?>
                            </td>
                            <td>
                                <span class="fia-decision is-<?php echo esc_attr($decision); ?>"><?php echo esc_html(str_replace('_', ' ', $decision)); ?></span>
                                <?php if (!empty($row['review']['reviewer'])) : ?>
                                    <br><small>By <?php echo esc_html((string) $row['review']['reviewer']); ?> at <?php echo esc_html((string) ($row['review']['reviewed_at'] ?? '')); ?></small>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if (!empty($row['reviewable']) && ($decision === 'flagged' || !empty($warnings))) : ?>
                                    <div class="fia-actions">
                                        <a class="button button-primary" href="<?php echo esc_url($this->image_audit_action_url($row['key'], 'approved', $view)); ?>">Approve</a>
                                        <a class="button" href="<?php echo esc_url($this->image_audit_action_url($row['key'], 'flagged', $view)); ?>">Flag</a>
                                        <?php if ($decision === 'approved' || $decision === 'flagged') : ?>
                                            <a class="button" href="<?php echo esc_url($this->image_audit_action_url($row['key'], 'unreviewed', $view)); ?>">Undo</a>
                                        <?php endif; ?>
                                    </div>
                                <?php elseif (!empty($row['reviewable'])) : ?>
                                    <strong>No action needed</strong><br><small>Passed current checks.</small>
                                <?php else : ?>
                                    <strong>Historical record</strong><br><small>No approval required.</small>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php endif; ?>
        </div>
        <?php
    }

    public function register_routes(): void {
        register_rest_route(self::REST_NAMESPACE, '/status', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_status'],
            'permission_callback' => [$this, 'can_read'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/public-work-status', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_public_work_status'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-audit', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_image_audit'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 250,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-audit/run', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_run_image_audit'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route('net30-updates/v1', '/plugin/(?P<slug>[a-z0-9-]+)', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_update_manifest'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(self::REST_NAMESPACE, '/readiness', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_readiness'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 12,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/ingest', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_ingest'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/recycle-candidates', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_recycle_candidates'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 100,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/repost', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_repost'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/needs-images', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_needs_images'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 50,
                    'sanitize_callback' => 'absint',
                ],
                'page' => [
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ],
                'category' => [
                    'default' => '',
                    'sanitize_callback' => 'sanitize_key',
                ],
                'search' => [
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-production/jobs', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_image_production_jobs'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 20,
                    'sanitize_callback' => 'absint',
                ],
                'page' => [
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ],
                'category' => [
                    'default' => '',
                    'sanitize_callback' => 'sanitize_key',
                ],
                'search' => [
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-production/sites', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_image_production_sites'],
            'permission_callback' => [$this, 'can_read'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-production/rss', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_image_production_rss'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 20,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-production/complete', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_image_production_complete'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-production/approve', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_image_production_approve'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/image-production/reject', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_image_production_reject'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/publish-ready', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_publish_ready'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 10,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/publish-ready/publish', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_publish_ready_post'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/attach-video', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_attach_video'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/audio-queue', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_audio_queue'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 3,
                    'sanitize_callback' => 'absint',
                ],
                'include_existing' => [
                    'default' => false,
                    'sanitize_callback' => 'rest_sanitize_boolean',
                ],
                'existing_engine' => [
                    'default' => '',
                    'sanitize_callback' => 'sanitize_key',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/attach-audio', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_attach_audio'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/attach-audio-chunk', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_attach_audio_chunk'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/audio-automation/runs', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'rest_audio_automation_runs'],
                'permission_callback' => [$this, 'can_read'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'rest_record_audio_automation_run'],
                'permission_callback' => [$this, 'can_write'],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/attach-existing-images', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_attach_existing_images'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/social-queue', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_social_queue'],
            'permission_callback' => [$this, 'can_read'],
            'args' => [
                'per_page' => [
                    'default' => 10,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/social-queue/mark-shared', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_mark_social_shared'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        register_rest_route(self::REST_NAMESPACE, '/creator-tip-article-drafts', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_import_creator_tip_article_drafts'],
            'permission_callback' => [$this, 'can_write'],
        ]);

        foreach ([self::REST_NAMESPACE] as $namespace) {
            register_rest_route($namespace, '/extension/bootstrap', [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'rest_extension_bootstrap'],
                'permission_callback' => [$this, 'can_read'],
            ]);

            register_rest_route($namespace, '/extension/capture', [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'rest_extension_capture'],
                'permission_callback' => [$this, 'can_write'],
            ]);
        }
    }

    public function can_read(WP_REST_Request $request): bool {
        return current_user_can('edit_posts') || $this->valid_worker_token($request);
    }

    public function can_write(WP_REST_Request $request): bool {
        return current_user_can('edit_posts') || $this->valid_worker_token($request);
    }

    public function creator_publishing_hub_brands_shortcode(): string {
        return $this->matthew_author_brands_markup();
    }

    public function maybe_render_matthew_author_brands($query): void {
        if ($this->rendered_matthew_author_brands) {
            return;
        }

        if (!is_author() || !($query instanceof WP_Query) || !$query->is_main_query()) {
            return;
        }

        $author = get_queried_object();
        if (!($author instanceof WP_User) || !$this->is_matthew_author($author)) {
            return;
        }

        $this->rendered_matthew_author_brands = true;
        echo $this->matthew_author_brands_markup(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }

    public function rest_import_creator_tip_article_drafts(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected a JSON object.', ['status' => 400]);
        }

        $items = $payload['items'] ?? null;
        if (is_array($items)) {
            $drafts = array_values(array_filter($items, 'is_array'));
        } elseif (!empty($payload['title'])) {
            $drafts = [$payload];
        } else {
            return new WP_Error('missing_items', 'Provide one draft or an items array.', ['status' => 400]);
        }

        $author_id = $this->matthew_author_id();
        $created = [];
        $duplicates = [];
        $errors = [];

        foreach ($drafts as $index => $draft) {
            $title = sanitize_text_field($draft['title'] ?? '');
            $content = wp_kses_post($draft['contentHtml'] ?? $draft['content_html'] ?? '');
            $excerpt = sanitize_textarea_field($draft['excerpt'] ?? '');
            $source_url = esc_url_raw($draft['sourceUrl'] ?? $draft['source_url'] ?? '');
            $source_title = sanitize_text_field($draft['sourceTitle'] ?? $draft['source_title'] ?? '');
            $tip_number = absint($draft['tipNumber'] ?? $draft['tip_number'] ?? 0);
            $slug = sanitize_title($draft['slug'] ?? $title);

            if ($title === '' || $content === '') {
                $errors[] = ['index' => $index, 'title' => $title, 'message' => 'title and content are required'];
                continue;
            }

            $sources = array_values(array_filter([$source_url]));
            $existing_id = $this->find_existing_post_for_ingest($title, $sources);
            if ($existing_id > 0) {
                $duplicates[] = [
                    'title' => $title,
                    'post_id' => $existing_id,
                    'permalink' => get_permalink($existing_id),
                ];
                continue;
            }

            $post_id = wp_insert_post([
                'post_title' => $title,
                'post_name' => $slug,
                'post_content' => $content,
                'post_excerpt' => $excerpt,
                'post_status' => 'draft',
                'post_type' => 'post',
                'post_category' => [absint(get_option('default_category'))],
                'post_author' => $author_id > 0 ? $author_id : get_current_user_id(),
                'meta_input' => [
                    self::META_SOURCES => wp_json_encode($sources),
                    self::META_WORKER => sanitize_text_field($draft['worker'] ?? 'social-desk-creator-tip-article'),
                    self::META_SITE_NAME => 'Creator Newsdesk',
                    self::META_PAGE_PROFILE => 'creatornewsdesk',
                    self::META_SOCIAL_QUEUE_STATUS => 'article-draft',
                    self::META_TITLE_HOOK_ID => $tip_number > 0 ? 'creator-tip-' . $tip_number : '',
                    self::META_TITLE_HOOK_TEMPLATE => $source_title,
                ],
            ], true);

            if (is_wp_error($post_id)) {
                $errors[] = ['index' => $index, 'title' => $title, 'message' => $post_id->get_error_message()];
                continue;
            }

            $created[] = [
                'title' => $title,
                'post_id' => (int) $post_id,
                'permalink' => get_permalink($post_id),
                'edit_url' => get_edit_post_link($post_id, 'raw'),
            ];
        }

        return new WP_REST_Response([
            'ok' => empty($errors),
            'created' => $created,
            'duplicates' => $duplicates,
            'errors' => $errors,
        ], empty($errors) ? 201 : 207);
    }

    public function register_image_production_feed(): void {
        add_feed('creator-image-jobs', [$this, 'render_image_production_feed']);
    }

    public function render_image_production_feed(): void {
        if (!current_user_can('edit_posts') && !$this->valid_worker_secret($this->bearer_secret_from_server())) {
            status_header(403);
            nocache_headers();
            header('Content-Type: text/plain; charset=' . get_option('blog_charset'));
            echo 'Forbidden';
            exit;
        }

        $items = array_map([$this, 'image_production_item'], $this->needs_image_items(20, 0));
        header('Content-Type: application/rss+xml; charset=' . get_option('blog_charset'));
        echo $this->image_production_rss_xml($items); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        exit;
    }

    private function valid_worker_token(WP_REST_Request $request): bool {
        $auth = (string) $request->get_header('authorization');
        if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $matches)) {
            return false;
        }

        return $this->valid_worker_secret(trim($matches[1]));
    }

    private function valid_worker_secret(string $secret): bool {
        $hash = $this->settings()['worker_token_hash'] ?? '';
        if (!$hash) {
            return false;
        }

        if ($secret === '') {
            return false;
        }

        return wp_check_password($secret, $hash);
    }

    private function bearer_secret_from_server(): string {
        $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if ($auth === '' && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $auth = is_array($headers) ? (string) ($headers['Authorization'] ?? $headers['authorization'] ?? '') : '';
        }
        if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $matches)) {
            return '';
        }

        return trim($matches[1]);
    }

    private function image_production_item(array $item): array {
        $post_id = (int) ($item['post_id'] ?? 0);
        $logo_url = $this->site_logo_payload_url();
        $requested_by = $this->current_user_login_name();
        $managed_images = is_array($item['managed_images'] ?? null) ? $item['managed_images'] : [];
        $has_landscape = (int) ($item['featured_media'] ?? 0) > 0;
        $story_images = array_values(array_filter($managed_images, static fn(array $image): bool => ($image['kind'] ?? '') === 'story'));
        $has_story = count($story_images) > 0;
        $landscape_provider = sanitize_key((string) ($item['image_provider'] ?? ($has_landscape ? 'unknown' : 'none')));
        $landscape_provider_state = $this->image_provider_review_state($landscape_provider);
        $story_providers = array_values(array_unique(array_map(
            static fn(array $image): string => sanitize_key((string) ($image['provider'] ?? 'unknown')) ?: 'unknown',
            $story_images
        )));
        $story_provider_states = array_map([$this, 'image_provider_review_state'], $story_providers);
        $story_provider_state = !$has_story
            ? 'missing'
            : (in_array('replace', $story_provider_states, true)
                ? 'replace'
                : (in_array('review', $story_provider_states, true) ? 'review' : 'trusted'));
        $required_roles = [];
        if (!$has_landscape || !empty($item['redo_required']) || $landscape_provider_state === 'replace') {
            $required_roles[] = 'landscape';
        }
        if (!$has_story || !empty($item['story_required']) || $story_provider_state === 'replace') {
            $required_roles[] = 'story';
        }
        $review_roles = [];
        if ($has_landscape && $landscape_provider_state === 'review' && !in_array('landscape', $required_roles, true)) {
            $review_roles[] = 'landscape';
        }
        if ($has_story && $story_provider_state === 'review' && !in_array('story', $required_roles, true)) {
            $review_roles[] = 'story';
        }
        $preserve_roles = array_values(array_diff(['landscape', 'story'], $required_roles, $review_roles));
        return [
            'post_id' => $post_id,
            'title' => (string) ($item['title'] ?? ''),
            'status' => (string) ($item['status'] ?? ''),
            'category' => (string) ($item['category'] ?? ''),
            'post_date_gmt' => (string) ($item['post_date_gmt'] ?? ''),
            'post_modified_gmt' => (string) ($item['post_modified_gmt'] ?? ''),
            'news_priority' => (bool) ($item['news_priority'] ?? false),
            'headline_led_prompt' => (bool) ($item['headline_led_prompt'] ?? false),
            'trend_score' => (int) ($item['trend_score'] ?? 0),
            'trend_label' => (string) ($item['trend_label'] ?? ''),
            'summary' => (string) ($item['summary'] ?? ''),
            'permalink' => (string) ($item['permalink'] ?? ''),
            'edit_url' => (string) ($item['edit_url'] ?? ''),
            'chatgpt_prompt' => (string) ($item['chatgpt_prompt'] ?? ''),
            'story_image_prompt' => (string) ($item['story_image_prompt'] ?? ''),
            'required_roles' => $required_roles,
            'review_roles' => $review_roles,
            'preserve_roles' => $preserve_roles,
            'existing_media' => $managed_images,
            'provider_evidence' => [
                'landscape' => [
                    'provider' => $landscape_provider,
                    'review_state' => $landscape_provider_state,
                ],
                'story' => [
                    'providers' => $story_providers,
                    'review_state' => $story_provider_state,
                ],
            ],
            'site_name' => get_bloginfo('name'),
            'site_logo_url' => $logo_url,
            'landscape_api_payload' => [
                'model' => 'gpt-image-1',
                'size' => '1536x1024',
                'quality' => 'high',
                'prompt' => (string) ($item['chatgpt_prompt'] ?? ''),
                'site_name' => get_bloginfo('name'),
                'site_logo_url' => $logo_url,
                'requested_by_user_login' => $requested_by,
            ],
            'story_api_payload' => [
                'model' => 'gpt-image-1',
                'size' => '1080x1920',
                'quality' => 'high',
                'prompt' => (string) ($item['story_image_prompt'] ?? ''),
                'site_name' => get_bloginfo('name'),
                'site_logo_url' => $logo_url,
                'requested_by_user_login' => $requested_by,
            ],
            'complete_payload_shape' => [
                'post_id' => $post_id,
                'required_roles' => $required_roles,
                'landscape_image_base64' => 'base64 PNG/JPG/WebP or data URL',
                'landscape_image_filename' => sanitize_title((string) ($item['title'] ?? 'image')) . '-landscape.png',
                'story_image_base64' => 'base64 PNG/JPG/WebP or data URL',
                'story_image_filename' => sanitize_title((string) ($item['title'] ?? 'image')) . '-story.png',
                'provider' => 'chatgpt-pro',
                'site_logo_url' => $logo_url,
                'requested_by_user_login' => $requested_by,
            ],
        ];
    }

    private function image_production_rss_xml(array $items): string {
        $site_title = get_bloginfo('name') ?: 'Creator Publishing Hub';
        $xml = '<?xml version="1.0" encoding="' . esc_attr(get_option('blog_charset')) . "\"?>\n";
        $xml .= "<rss version=\"2.0\">\n<channel>\n";
        $xml .= '<title>' . esc_html($site_title . ' Image Production Jobs') . "</title>\n";
        $xml .= '<link>' . esc_url(home_url('/')) . "</link>\n";
        $xml .= '<description>Private Creator Publishing Hub image generation queue. Generate landscape and story images, then POST them to the complete endpoint.</description>' . "\n";
        foreach ($items as $item) {
            $description = "Post #" . (int) $item['post_id'] . "\n\nLandscape prompt:\n" . (string) $item['chatgpt_prompt'] . "\n\nStory prompt:\n" . (string) $item['story_image_prompt'];
            $xml .= "<item>\n";
            $xml .= '<title>' . esc_html('#' . (int) $item['post_id'] . ' ' . (string) $item['title']) . "</title>\n";
            $xml .= '<link>' . esc_url((string) $item['edit_url']) . "</link>\n";
            $xml .= '<guid isPermaLink="false">' . esc_html(home_url('/') . '#image-job-' . (int) $item['post_id']) . "</guid>\n";
            $xml .= '<category>' . esc_html((string) $item['category']) . "</category>\n";
            $xml .= '<description><![CDATA[' . $description . "]]></description>\n";
            $xml .= "</item>\n";
        }
        $xml .= "</channel>\n</rss>\n";

        return $xml;
    }


    public function rest_status(): WP_REST_Response {
        $settings = $this->settings();
        return new WP_REST_Response([
            'ok' => true,
            'autopublish_enabled' => $settings['autopublish_enabled'] === '1',
            'default_status' => $settings['default_status'],
            'minimum_confidence' => (float) $settings['minimum_confidence'],
            'minimum_sources' => (int) $settings['minimum_sources'],
            'token_configured' => !empty($settings['worker_token_hash']),
            'indexnow_enabled' => $settings['indexnow_enabled'] === '1',
            'indexnow_key_location' => home_url('/' . $this->indexnow_key() . '.txt'),
            'ai_sitemap' => home_url('/ai-sitemap.xml'),
            'time' => current_time('mysql', true),
        ]);
    }

    public function rest_image_audit(WP_REST_Request $request): WP_REST_Response {
        $limit = min(1000, max(1, absint($request->get_param('per_page') ?: 250)));
        $events = array_slice($this->image_activity_log(), 0, $limit);
        $reviews = $this->image_audit_reviews();
        $items = [];
        $counts = [
            'events' => 0,
            'saved' => 0,
            'deleted' => 0,
            'current' => 0,
            'reviewable_current' => 0,
            'needs_review' => 0,
            'flagged' => 0,
            'approved' => 0,
            'history' => 0,
            'missing_attachment' => 0,
            'missing_file' => 0,
        ];

        foreach ($events as $event) {
            $event = $this->resolve_image_audit_event($event);
            $event['warnings'] = $this->image_audit_warnings($event);
            $event['event_key'] = $this->image_audit_event_key($event);
            $event['reviewable'] = (string) ($event['current_media_state'] ?? '') === 'current';
            $review = is_array($reviews[$event['event_key']] ?? null) ? $reviews[$event['event_key']] : [];
            $decision = sanitize_key((string) ($review['decision'] ?? ''));
            $needs_review = $event['reviewable'] && $decision === '' && !empty($event['warnings']);
            $event['audit_state'] = !$event['reviewable']
                ? 'history'
                : ($decision !== '' ? $decision : ($needs_review ? 'needs_review' : 'passing'));
            $event['review'] = $review;
            $items[] = $event;
            $counts['events']++;
            $action = (string) ($event['action'] ?? 'saved');
            $counts[$action === 'deleted' ? 'deleted' : 'saved']++;
            if (!empty($event['attachment_exists']) && !empty($event['physical_file_exists'])) {
                $counts['current']++;
                $counts['reviewable_current']++;
                if ($decision === 'approved') {
                    $counts['approved']++;
                } elseif ($decision === 'flagged') {
                    $counts['flagged']++;
                } elseif ($needs_review) {
                    $counts['needs_review']++;
                }
            } elseif (empty($event['attachment_exists'])) {
                $counts['missing_attachment']++;
                $counts['history']++;
            } else {
                $counts['missing_file']++;
                $counts['history']++;
            }
        }

        return new WP_REST_Response([
            'ok' => true,
            'site' => home_url('/'),
            'counts' => $counts,
            'completed_audit' => $this->image_inventory_audit_snapshot(),
            'items' => $items,
            'time' => current_time('mysql', true),
        ]);
    }

    public function rest_run_image_audit(): WP_REST_Response {
        return new WP_REST_Response([
            'ok' => true,
            'site' => home_url('/'),
            'completed_audit' => $this->run_image_inventory_audit(),
            'time' => current_time('mysql', true),
        ]);
    }

    public function rest_extension_bootstrap(): WP_REST_Response {
        $settings = $this->settings();
        $user = wp_get_current_user();
        $stats = $this->dashboard_overview_stats();
        $recent_captures = get_option(self::OPTION_EXTENSION_CAPTURE_LOG, []);
        $recent_captures = is_array($recent_captures) ? array_slice($recent_captures, 0, 10) : [];

        return new WP_REST_Response([
            'ok' => true,
            'site' => [
                'name' => $this->canonical_brand_name(trim((string) ($settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'Creator Publishing Hub')),
                'home_url' => home_url('/'),
                'admin_url' => admin_url(),
                'image_desk_url' => admin_url('edit.php?page=creator-needs-images'),
                'image_review_url' => admin_url('edit.php?page=creator-image-review'),
                'dashboard_url' => admin_url('admin.php?page=' . self::ADMIN_MENU_SLUG),
            ],
            'user' => [
                'id' => get_current_user_id(),
                'login' => $user instanceof WP_User ? $user->user_login : '',
                'display_name' => $user instanceof WP_User ? $user->display_name : '',
            ],
            'counts' => [
                'needs_images' => (int) ($stats['needs_images'] ?? 0),
                'ready_to_publish' => (int) ($stats['ready_to_publish'] ?? 0),
                'drafts' => (int) ($stats['draft_total'] ?? 0),
                'scheduled' => (int) ($stats['scheduled'] ?? 0),
                'social_queued' => (int) ($stats['social_queued'] ?? 0),
                'audio_needed' => $this->audio_needed_count(),
            ],
            'endpoints' => [
                'capture' => rest_url(self::REST_NAMESPACE . '/extension/capture'),
                'image_jobs' => rest_url(self::REST_NAMESPACE . '/image-production/jobs'),
                'image_complete' => rest_url(self::REST_NAMESPACE . '/image-production/complete'),
                'social_queue' => rest_url(self::REST_NAMESPACE . '/social-queue'),
            ],
            'recent_captures' => $recent_captures,
            'version' => self::VERSION,
        ]);
    }

    public function rest_extension_capture(WP_REST_Request $request): WP_REST_Response {
        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : [];
        $url = esc_url_raw((string) ($payload['url'] ?? ''));
        if ($url === '') {
            return new WP_REST_Response([
                'ok' => false,
                'error' => 'A URL is required.',
            ], 400);
        }

        $title = sanitize_text_field((string) ($payload['title'] ?? ''));
        $selection = sanitize_textarea_field((string) ($payload['selection'] ?? ''));
        $note = sanitize_textarea_field((string) ($payload['note'] ?? ''));
        $source = sanitize_key((string) ($payload['source'] ?? 'browser-extension'));
        $captures = get_option(self::OPTION_EXTENSION_CAPTURE_LOG, []);
        $captures = is_array($captures) ? $captures : [];
        $record = [
            'id' => wp_generate_uuid4(),
            'url' => $url,
            'title' => $title,
            'selection' => mb_substr($selection, 0, 4000),
            'note' => mb_substr($note, 0, 2000),
            'source' => $source !== '' ? $source : 'browser-extension',
            'captured_at' => current_time('mysql', true),
            'user_id' => get_current_user_id(),
            'user_login' => wp_get_current_user() instanceof WP_User ? wp_get_current_user()->user_login : '',
        ];
        array_unshift($captures, $record);
        $captures = array_slice($captures, 0, 200);
        update_option(self::OPTION_EXTENSION_CAPTURE_LOG, $captures, false);

        return new WP_REST_Response([
            'ok' => true,
            'capture' => $record,
            'recent_total' => count($captures),
        ]);
    }

    public function rest_public_work_status(): WP_REST_Response {
        return new WP_REST_Response($this->public_work_status_payload());
    }

    private function public_work_status_payload(): array {
        $fast_metrics = $this->fast_public_work_status_metrics();
        $stats = $this->dashboard_overview_stats();
        $image_workload = $this->image_workload_summary();
        $audio_needed = (int) ($fast_metrics['audio_needed'] ?? 0);
        $needs_images = (int) ($stats['needs_images'] ?? 0);
        $ready_queue = (int) ($stats['ready_to_publish'] ?? 0);
        $social_queued = (int) ($stats['social_queued'] ?? 0);
        $scheduled = (int) ($stats['scheduled'] ?? 0);
        $work_score = ($needs_images * 5) + ($ready_queue * 3) + ($audio_needed * 2) + ($social_queued * 2) + $scheduled;
        $settings = $this->settings();
        $logo_url = $this->site_logo_payload_url();
        $site_name = trim((string) ($settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'Creator Publishing Hub');

        return [
            'ok' => true,
            'name' => $this->canonical_brand_name($site_name),
            'host' => (string) wp_parse_url(home_url('/'), PHP_URL_HOST),
            'logo_url' => $logo_url,
            'version' => self::VERSION,
            'metrics' => [
                'published' => (int) ($stats['published_total'] ?? 0),
                'published_7_days' => (int) ($stats['published_7_days'] ?? 0),
                'drafts' => (int) ($stats['draft_total'] ?? 0),
                'scheduled' => $scheduled,
                'needs_images' => $needs_images,
                'ready_queue' => $ready_queue,
                'social_queued' => $social_queued,
                'audio_needed' => $audio_needed,
                'image_redo' => (int) $image_workload['redo'],
                'image_missing' => (int) $image_workload['missing'],
                'image_story_missing_or_redo' => (int) $image_workload['story_missing_or_redo'],
                'image_provider_replace' => (int) $image_workload['provider_replace'],
                'image_provider_review' => (int) $image_workload['provider_review'],
            ],
            'image_workload' => $image_workload,
            'work_score' => $work_score,
            'admin_url' => admin_url('index.php'),
            'image_desk_url' => admin_url('admin.php?page=creator-needs-images'),
            'updated_at' => current_time('mysql', true),
        ];
    }

    public function rest_update_manifest(WP_REST_Request $request) {
        $slug = sanitize_key((string) $request->get_param('slug'));
        $packages = $this->update_packages();
        if (!isset($packages[$slug])) {
            return new WP_Error('package_not_found', 'Update package not found.', ['status' => 404]);
        }

        $package = $packages[$slug];
        $upload_dir = wp_upload_dir(null, false);
        $base_dir = trailingslashit((string) ($upload_dir['basedir'] ?? '')) . 'net30-updates';
        $base_url = trailingslashit((string) ($upload_dir['baseurl'] ?? '')) . 'net30-updates';
        $zip_name = $slug . '-' . $package['version'] . '.zip';
        $zip_path = $base_dir . '/' . $zip_name;
        $download_url = is_readable($zip_path) ? $base_url . '/' . rawurlencode($zip_name) : '';

        return new WP_REST_Response([
            'ok' => true,
            'slug' => $slug,
            'name' => $package['name'],
            'version' => $package['version'],
            'requires' => $package['requires'],
            'tested' => $package['tested'],
            'download_url' => $download_url,
            'homepage' => home_url('/'),
            'last_checked' => current_time('mysql', true),
            'sections' => [
                'description' => $package['description'],
                'changelog' => $package['changelog'],
            ],
        ]);
    }

    private function update_packages(): array {
        return [
            'net30-autopilot-installer' => [
                'name' => 'Creator Publishing Hub Installer',
                'version' => '0.1.2',
                'requires' => '6.4',
                'tested' => '6.8',
                'description' => 'Installer and updater for Creator Newsdesk automated publishing packages.',
                'changelog' => 'Adds central update metadata support for customer-site extensions.',
            ],
            'creator-publishing-hub' => [
                'name' => 'Creator Publishing Hub',
                'version' => self::VERSION,
                'requires' => '6.4',
                'tested' => '7.0',
                'description' => 'Reusable multi-site Image Desk, controlled publishing, media, and social queue workflow.',
                'changelog' => 'Adds a Facebook 1.91:1 center-crop safe band for Landscape images while preserving exact titles, logo rules, and Story safe zones.',
            ],
            'net30-contextual-ads' => [
                'name' => 'Contextual Ads',
                'version' => '0.1.3',
                'requires' => '6.4',
                'tested' => '6.8',
                'description' => 'Contextual sponsorship inventory, lead capture, footer CTA, and ad rendering shortcodes for automated publishing sites.',
                'changelog' => 'Adds Cloudflare Turnstile verification and honeypot protection to lead forms.',
            ],
        ];
    }

    public function check_for_plugin_update($transient) {
        if (!is_object($transient)) {
            return $transient;
        }

        $manifest = $this->remote_plugin_manifest();
        if (!$manifest || empty($manifest['version']) || empty($manifest['download_url'])) {
            return $transient;
        }

        if (!version_compare((string) $manifest['version'], self::VERSION, '>')) {
            return $transient;
        }

        $plugin_file = plugin_basename(__FILE__);
        $transient->response[$plugin_file] = (object) [
            'slug' => 'creator-publishing-hub',
            'plugin' => $plugin_file,
            'new_version' => (string) $manifest['version'],
            'url' => (string) ($manifest['homepage'] ?? ''),
            'package' => (string) $manifest['download_url'],
            'tested' => (string) ($manifest['tested'] ?? ''),
            'requires' => (string) ($manifest['requires'] ?? ''),
        ];

        return $transient;
    }

    public function plugin_update_info($result, string $action, object $args) {
        if ($action !== 'plugin_information' || ($args->slug ?? '') !== 'creator-publishing-hub') {
            return $result;
        }

        $manifest = $this->remote_plugin_manifest();
        if (!$manifest) {
            return $result;
        }

        return (object) [
            'name' => (string) ($manifest['name'] ?? 'Creator Publishing Hub'),
            'slug' => 'creator-publishing-hub',
            'version' => (string) ($manifest['version'] ?? self::VERSION),
            'author' => 'Creator Publishing Hub',
            'homepage' => (string) ($manifest['homepage'] ?? ''),
            'requires' => (string) ($manifest['requires'] ?? ''),
            'tested' => (string) ($manifest['tested'] ?? ''),
            'download_link' => (string) ($manifest['download_url'] ?? ''),
            'sections' => is_array($manifest['sections'] ?? null) ? $manifest['sections'] : [],
        ];
    }

    private function remote_plugin_manifest(): ?array {
        $endpoint = apply_filters('creator_publishing_hub_update_endpoint', self::UPDATE_ENDPOINT);
        if (!is_string($endpoint) || trim($endpoint) === '') {
            return null;
        }

        $response = wp_remote_get($endpoint, [
            'timeout' => 8,
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($body) || empty($body['ok'])) {
            return null;
        }

        return $body;
    }

    public function rest_readiness(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(50, max(1, (int) $request->get_param('per_page')));
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => ['publish', 'future'],
            'numberposts' => $per_page,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);
        $items = [];

        foreach ($posts as $post) {
            $caption = (string) get_post_meta($post->ID, self::META_SOCIAL, true);
            $featured_media = (int) get_post_thumbnail_id($post->ID);
            $image_provider = $this->image_provider($post->ID, $featured_media);
            $hashtag_count = $this->hashtag_count($caption);

            $items[] = [
                'post_id' => (int) $post->ID,
                'status' => get_post_status($post->ID),
                'title' => get_the_title($post->ID),
                'permalink' => get_permalink($post->ID),
                'featured_media' => $featured_media,
                'image_provider' => $image_provider,
                'recyclable_image' => $this->is_recyclable_image($image_provider),
                'social_caption_configured' => $caption !== '',
                'social_caption_hashtags' => $hashtag_count,
                'facebook_ready' => $featured_media > 0 && $hashtag_count >= 3,
            ];
        }

        $not_ready = array_values(array_filter($items, static fn(array $item): bool => !$item['facebook_ready']));

        return new WP_REST_Response([
            'ok' => true,
            'checked' => count($items),
            'not_ready_count' => count($not_ready),
            'all_recent_facebook_ready' => count($items) > 0 && count($not_ready) === 0,
            'items' => $items,
        ]);
    }

    public function rest_recycle_candidates(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(200, max(1, (int) $request->get_param('per_page')));
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'numberposts' => $per_page,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);
        $items = [];

        foreach ($posts as $post) {
            $featured_media = (int) get_post_thumbnail_id($post->ID);
            if ($featured_media <= 0) {
                continue;
            }

            $provider = $this->image_provider($post->ID, $featured_media);
            if (!$this->is_recyclable_image($provider)) {
                continue;
            }

            $caption = (string) get_post_meta($post->ID, self::META_SOCIAL, true);
            $items[] = [
                'post_id' => (int) $post->ID,
                'title' => get_the_title($post->ID),
                'permalink' => get_permalink($post->ID),
                'excerpt' => get_the_excerpt($post->ID),
                'date_gmt' => get_post_time('Y-m-d H:i:s', true, $post->ID),
                'featured_media' => $featured_media,
                'featured_image_url' => wp_get_attachment_image_url($featured_media, 'full'),
                'image_provider' => $provider,
                'category_ids' => wp_get_post_categories($post->ID),
                'tag_names' => wp_get_post_tags($post->ID, ['fields' => 'names']),
                'social_caption_hashtags' => $this->hashtag_count($caption),
                'last_reposted_at' => (string) get_post_meta($post->ID, self::META_REPOSTED_AT, true),
            ];
        }

        usort($items, static function (array $a, array $b): int {
            $a_repost = $a['last_reposted_at'] ?: '1970-01-01 00:00:00';
            $b_repost = $b['last_reposted_at'] ?: '1970-01-01 00:00:00';
            if ($a_repost === $b_repost) {
                return strcmp((string) $b['date_gmt'], (string) $a['date_gmt']);
            }

            return strcmp((string) $a_repost, (string) $b_repost);
        });

        return new WP_REST_Response([
            'ok' => true,
            'checked' => count($posts),
            'eligible' => count($items),
            'items' => $items,
        ]);
    }

    public function rest_repost(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $source_post_id = (int) ($payload['source_post_id'] ?? 0);
        $source = $source_post_id > 0 ? get_post($source_post_id) : null;
        if (!$source || $source->post_type !== 'post' || $source->post_status !== 'publish') {
            return new WP_Error('source_post_not_found', 'Source post must be a published post.', ['status' => 404]);
        }

        $featured_media = (int) get_post_thumbnail_id($source_post_id);
        $provider = $this->image_provider($source_post_id, $featured_media);
        if ($featured_media <= 0 || !$this->is_recyclable_image($provider)) {
            return new WP_Error('source_image_not_recyclable', 'Source post does not have a recyclable featured image.', ['status' => 409]);
        }

        $title = sanitize_text_field($payload['title'] ?? '');
        if ($title === '') {
            $title = 'From the archive: ' . get_the_title($source_post_id) . ' - ' . current_time('Y-m-d H:i', true) . ' UTC';
        }

        $source_link = get_permalink($source_post_id);
        $excerpt = sanitize_textarea_field($payload['excerpt'] ?? get_the_excerpt($source_post_id));
        $content = wp_kses_post($payload['content_html'] ?? '');
        if ($content === '') {
            $content = sprintf(
                '<p><strong>%s</strong></p><p>Fresh share from the site archive. Read the original sourced post here: <a href="%s">%s</a></p>',
                esc_html(get_the_title($source_post_id)),
                esc_url($source_link),
                esc_html($source_link)
            );
        }

        $caption = sanitize_textarea_field($payload['social_caption'] ?? '');
        if ($caption === '') {
            $brand_tag = sanitize_title((string) ($this->settings()['site_brand_name'] ?? get_bloginfo('name')));
            $brand_tag = str_replace('-', '', $brand_tag);
            $caption = "Worth another look:\n\n" . get_the_title($source_post_id) . "\n\nRead it here: " . $source_link . "\n\n#learnmore" . ($brand_tag !== '' ? ' #' . $brand_tag : '');
        }

        $worker = sanitize_text_field($payload['worker'] ?? 'unknown-worker');
        $desk_settings = $this->settings();
        $brand_name = trim((string) ($desk_settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'Publishing Desk');
        $page_profile = sanitize_key((string) ($desk_settings['page_profile'] ?? '')) ?: sanitize_key((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
        $caption = $this->social_safe_language($caption, $page_profile);

        $post_id = wp_insert_post([
            'post_title' => $title,
            'post_content' => $content,
            'post_excerpt' => $excerpt,
            'post_status' => 'publish',
            'post_type' => 'post',
            'post_category' => wp_get_post_categories($source_post_id),
            'meta_input' => [
                self::META_WORKER => $worker,
                self::META_SOCIAL => $caption,
                '_wpas_mess' => $caption,
                '_jetpack_publicize_message' => $caption,
                self::META_FEATURED_IMAGE_PROVIDER => 'recycled-' . $provider,
                self::META_REPOST_SOURCE_ID => (string) $source_post_id,
                self::META_REPOSTED_AT => current_time('mysql', true),
            ],
        ], true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $tag_names = wp_get_post_tags($source_post_id, ['fields' => 'names']);
        if ($tag_names) {
            wp_set_post_tags($post_id, $tag_names, false);
        }

        set_post_thumbnail($post_id, $featured_media);
        update_post_meta($source_post_id, self::META_REPOSTED_AT, current_time('mysql', true));

        return new WP_REST_Response([
            'ok' => true,
            'repost' => true,
            'source_post_id' => $source_post_id,
            'post_id' => (int) $post_id,
            'status' => get_post_status($post_id),
            'permalink' => get_permalink($post_id),
            'featured_media' => $featured_media,
            'image_provider' => 'recycled-' . $provider,
            'social_caption_hashtags' => $this->hashtag_count($caption),
            'facebook_ready' => get_post_status($post_id) === 'publish' && $featured_media > 0 && $this->hashtag_count($caption) >= 3,
        ], 201);
    }

    public function rest_needs_images(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(500, max(1, (int) $request->get_param('per_page')));
        $page = max(1, (int) $request->get_param('page'));
        $category = sanitize_key((string) $request->get_param('category'));
        $search = sanitize_text_field((string) $request->get_param('search'));
        $offset = ($page - 1) * $per_page;

        return new WP_REST_Response([
            'ok' => true,
            'count' => $this->needs_image_count($category, $search),
            'page' => $page,
            'per_page' => $per_page,
            'category' => $category,
            'search' => $search,
            'items' => $this->needs_image_items($per_page, $offset, $category, $search),
        ]);
    }

    public function rest_image_production_sites(): WP_REST_Response {
        $sites = array_map(function (array $site): array {
            $base_url = untrailingslashit((string) ($site['url'] ?? ''));
            $workload = is_array($site['image_workload'] ?? null)
                ? $site['image_workload']
                : ['total' => (int) ($site['metrics']['needs_images'] ?? 0)];
            $host = (string) ($site['host'] ?? wp_parse_url($base_url, PHP_URL_HOST));

            return [
                'name' => $this->canonical_brand_name((string) ($site['name'] ?? $host)),
                'host' => $host,
                'site_url' => $base_url,
                'version' => (string) ($site['version'] ?? ''),
                'logo_url' => esc_url_raw((string) ($site['logo_url'] ?? '')),
                'workload' => [
                    'total' => (int) ($workload['total'] ?? 0),
                    'redo' => (int) ($workload['redo'] ?? 0),
                    'missing' => (int) ($workload['missing'] ?? 0),
                    'story_missing_or_redo' => (int) ($workload['story_missing_or_redo'] ?? 0),
                    'provider_replace' => (int) ($workload['provider_replace'] ?? 0),
                    'provider_review' => (int) ($workload['provider_review'] ?? 0),
                    'priority_score' => (int) ($workload['priority_score'] ?? 0),
                ],
                'jobs_url' => $base_url . '/wp-json/' . self::REST_NAMESPACE . '/image-production/jobs',
                'complete_url' => $base_url . '/wp-json/' . self::REST_NAMESPACE . '/image-production/complete',
                'image_desk_url' => (string) ($site['image_desk_url'] ?? ($base_url . '/wp-admin/admin.php?page=creator-needs-images')),
                'agent_assignment_key' => sanitize_title($host),
                'ready_for_agent' => empty($site['error']) && (int) ($workload['total'] ?? 0) > 0,
                'error' => (string) ($site['error'] ?? ''),
            ];
        }, $this->dashboard_fleet_statuses());

        usort($sites, static function (array $a, array $b): int {
            $priority_compare = ((int) $b['workload']['priority_score']) <=> ((int) $a['workload']['priority_score']);
            if ($priority_compare !== 0) {
                return $priority_compare;
            }
            return ((int) $b['workload']['total']) <=> ((int) $a['workload']['total']);
        });

        return new WP_REST_Response([
            'ok' => true,
            'updated_at' => current_time('mysql', true),
            'assignment_policy' => 'Use parallel bounded Codex subagents with at most one active lane per site. Never exceed available subagent slots. Give the highest-priority site the largest bounded batch, fill other slots with distinct sites in priority order, and rotate through every unstarted site before reusing non-primary capacity. Keep each site\'s credentials and worker tokens inside its own lane.',
            'sites' => $sites,
        ]);
    }

    public function rest_image_production_jobs(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(100, max(1, (int) $request->get_param('per_page')));
        $page = max(1, (int) $request->get_param('page'));
        $category = sanitize_key((string) $request->get_param('category'));
        $search = sanitize_text_field((string) $request->get_param('search'));
        $offset = ($page - 1) * $per_page;
        $items = $this->needs_image_items($per_page, $offset, $category, $search);
        $brand = $this->canonical_prompt_brand(trim((string) ($this->settings()['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: ''));
        $is_creator_newsdesk = stripos($brand, 'Creator Newsdesk') !== false;
        $count = $category === '' && $search === ''
            ? (int) ($this->image_workload_summary()['total'] ?? 0)
            : $this->needs_image_count($category, $search);

        return new WP_REST_Response([
            'ok' => true,
            'site' => get_bloginfo('name'),
            'queue_policy' => $is_creator_newsdesk ? 'live-news-newest-first' : 'editorial-priority',
            'recommended_poll_seconds' => $is_creator_newsdesk ? 300 : null,
            'count' => $count,
            'page' => $page,
            'per_page' => $per_page,
            'category' => $category,
            'search' => $search,
            'feed_url' => rest_url(self::REST_NAMESPACE . '/image-production/rss'),
            'complete_url' => rest_url(self::REST_NAMESPACE . '/image-production/complete'),
            'instructions' => array_values(array_filter([
                'Process jobs in the returned order so redo and missing work are handled first.',
                'Generate only the roles listed in required_roles and keep preserve_roles unchanged.',
                'Use chatgpt_prompt for Landscape and story_image_prompt for the 1080x1920 Story role.',
                'Use the exact site_logo_url in the job; do not substitute a personal image or another site logo.',
                $is_creator_newsdesk ? 'Creator Newsdesk is a live-news lane. Process newly published or modified valid headlines before historical backlog work after any explicit redo.' : '',
                $is_creator_newsdesk ? 'Use the headline as the primary visual brief and do not invent facts that are not present in it.' : '',
                'POST only the completed role payloads to complete_url with the same post_id and required_roles.',
                'The upload endpoint strips metadata, optimizes images, sets the featured image, stores the story image, and queues the article for controlled publishing.',
            ])),
            'items' => array_map([$this, 'image_production_item'], $items),
        ]);
    }

    public function rest_image_production_rss(WP_REST_Request $request): void {
        $per_page = min(100, max(1, (int) $request->get_param('per_page')));
        $items = array_map([$this, 'image_production_item'], $this->needs_image_items($per_page, 0));

        nocache_headers();
        header('Content-Type: application/rss+xml; charset=' . get_option('blog_charset'));
        echo $this->image_production_rss_xml($items); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        exit;
    }

    public function rest_image_production_complete(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $post_id = absint($payload['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found.', ['status' => 404]);
        }

        $landscape_base64 = trim((string) ($payload['landscape_image_base64'] ?? ($payload['featured_image_base64'] ?? '')));
        $story_base64 = trim((string) ($payload['story_image_base64'] ?? ''));
        $role_aware = array_key_exists('required_roles', $payload) && is_array($payload['required_roles']);
        $required_roles = $role_aware
            ? array_values(array_intersect(['landscape', 'story'], array_map('sanitize_key', $payload['required_roles'])))
            : [];
        $actionable_roles = [];
        if ($role_aware) {
            $current_items = $this->needs_image_items(1, 0, '', (string) $post_id);
            $current_job = $current_items ? $this->image_production_item($current_items[0]) : null;
            $actionable_roles = is_array($current_job)
                ? array_values(array_unique(array_merge(
                    (array) ($current_job['required_roles'] ?? []),
                    (array) ($current_job['review_roles'] ?? [])
                )))
                : [];
            $submitted_roles = array_values(array_filter([
                $landscape_base64 !== '' ? 'landscape' : '',
                $story_base64 !== '' ? 'story' : '',
            ]));
            $unexpected_roles = array_values(array_diff($submitted_roles, $actionable_roles));
            if ($unexpected_roles) {
                return new WP_Error(
                    'preserved_image_role',
                    'This upload would replace a ready companion that the server marked for preservation.',
                    ['status' => 409, 'roles' => $unexpected_roles]
                );
            }
        }
        $require_story = !array_key_exists('require_story_image', $payload) || rest_sanitize_boolean($payload['require_story_image']);
        if ($landscape_base64 === '' && $story_base64 === '') {
            return new WP_Error('missing_image_payload', 'Send at least one Landscape or Story image payload.', ['status' => 400]);
        }
        if ((!$role_aware || in_array('landscape', $required_roles, true)) && $landscape_base64 === '') {
            return new WP_Error('missing_landscape_image', 'landscape_image_base64 is required.', ['status' => 400]);
        }
        if (($role_aware ? in_array('story', $required_roles, true) : $require_story) && $story_base64 === '') {
            return new WP_Error('missing_story_image', 'story_image_base64 is required unless require_story_image is false.', ['status' => 400]);
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $provider = sanitize_key((string) ($payload['provider'] ?? 'chatgpt-pro')) ?: 'chatgpt-pro';
        $origin = sanitize_key((string) ($payload['origin'] ?? 'api'));
        $origin = $origin === 'human' ? 'human' : 'api';
        $landscape_file = null;
        if ($landscape_base64 !== '') {
            $landscape_file = $this->image_file_from_base64_payload(
                $post_id,
                $landscape_base64,
                sanitize_file_name((string) ($payload['landscape_image_filename'] ?? ($payload['featured_image_filename'] ?? 'landscape-image.png')))
            );
            if (is_wp_error($landscape_file)) {
                return $landscape_file;
            }
            if ($this->uploaded_image_orientation($landscape_file) === 'portrait') {
                return new WP_Error('landscape_image_wrong_orientation', 'Landscape image payload is portrait. Send the wide image as landscape_image_base64.', ['status' => 422]);
            }
        }

        $story_file = null;
        if ($story_base64 !== '') {
            $story_file = $this->image_file_from_base64_payload(
                $post_id,
                $story_base64,
                sanitize_file_name((string) ($payload['story_image_filename'] ?? 'story-image.png'))
            );
            if (is_wp_error($story_file)) {
                return $story_file;
            }
            if ($this->uploaded_image_orientation($story_file) !== 'portrait') {
                return new WP_Error('story_image_wrong_orientation', 'Story image payload is not portrait. Send the 1080x1920 image as story_image_base64.', ['status' => 422]);
            }
        }

        $featured_id = (int) get_post_thumbnail_id($post_id);
        $completed_roles = [];
        if (is_array($landscape_file)) {
            $landscape = $this->attach_cleaned_image_file($post_id, $post, $landscape_file, $provider, $origin, 'featured');
            if (is_wp_error($landscape)) {
                return $landscape;
            }

            $featured_id = (int) $landscape['attachment_id'];
            set_post_thumbnail($post_id, $featured_id);
            update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
            update_post_meta($post_id, self::META_IMAGE_ORIGIN, $origin);
            update_post_meta($post_id, self::META_IMAGE_CREDIT, (string) $landscape['credit']);
            update_post_meta($post_id, self::META_IMAGE_ATTACHED_AT, current_time('mysql', true));
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
            delete_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED);
            update_post_meta($post_id, '_cph_metadata_stripped', !empty($landscape['metadata_stripped']) ? '1' : '0');
            $completed_roles[] = 'landscape';
        }

        $story_id = 0;
        if (is_array($story_file)) {
            $story = $this->attach_cleaned_image_file($post_id, $post, $story_file, $provider, $origin, 'social-alt');
            if (is_wp_error($story)) {
                return $story;
            }
            $story_id = (int) $story['attachment_id'];
            $this->append_secondary_social_image($post_id, $story_id);
            update_post_meta($post_id, self::META_STORY_REQUIRED, '0');
            $completed_roles[] = 'story';
        }

        if ($role_aware && in_array('story', $actionable_roles, true) && !in_array('story', $completed_roles, true)) {
            update_post_meta($post_id, self::META_STORY_REQUIRED, '1');
            wp_update_post([
                'ID' => $post_id,
                'post_modified' => current_time('mysql'),
                'post_modified_gmt' => current_time('mysql', true),
            ]);
        }

        if ($featured_id > 0) {
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
            if (in_array(get_post_status($post_id), ['draft', 'pending'], true)) {
                update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
                update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
            } else {
                update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '0');
                delete_post_meta($post_id, self::META_IMAGE_READY_AT);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
                delete_post_meta($post_id, '_wpas_skip_publicize');
            }
        }

        if (get_current_user_id() > 0) {
            if (in_array('landscape', $completed_roles, true)) {
                $this->record_image_claim_completion($post_id, get_current_user_id());
            }
            if ($story_id > 0) {
                $this->record_auxiliary_image_completion($post_id, get_current_user_id(), $story_id, 'story');
            }
        }
        $this->clear_image_claim($post_id);
        delete_post_meta($post_id, self::META_IMAGE_PROCESSING_STARTED_BY);
        delete_post_meta($post_id, self::META_IMAGE_PROCESSING_STARTED_AT);

        if ($completed_roles) {
            $refresh_args = ['ID' => $post_id];
            if ($this->is_creator_newsdesk_site()) {
                $matthew_author_id = $this->matthew_author_id();
                if ($matthew_author_id > 0) {
                    $refresh_args['post_author'] = $matthew_author_id;
                }
            }
            wp_update_post($refresh_args);
        }

        $auto_published = false;
        $auto_publish_error = '';
        if (
            $this->is_creator_newsdesk_site()
            && in_array(get_post_status($post_id), ['draft', 'pending'], true)
            && $this->creator_newsdesk_post_media_ready($post_id)
        ) {
            $release_post = get_post($post_id);
            $social_message = trim((string) get_post_meta($post_id, self::META_SOCIAL, true));
            if ($social_message === '') {
                $social_message = get_the_title($post_id);
            }
            delete_post_meta($post_id, '_wpas_skip_publicize');
            delete_post_meta($post_id, '_publicize_pending');
            delete_post_meta($post_id, 'jetpack_social_post_already_shared');
            update_post_meta($post_id, 'jetpack_publicize_feature_enabled', true);
            update_post_meta($post_id, 'jetpack_publicize_message', $social_message);
            update_post_meta($post_id, '_jetpack_publicize_message', $social_message);

            $release_args = [
                'ID' => $post_id,
                'post_status' => 'publish',
            ];
            $matthew_author_id = $this->matthew_author_id();
            if ($matthew_author_id > 0) {
                $release_args['post_author'] = $matthew_author_id;
            }
            if ($release_post instanceof WP_Post) {
                $release_args['post_date'] = $release_post->post_date;
                $release_args['post_date_gmt'] = $release_post->post_date_gmt;
                $release_args['edit_date'] = true;
            }
            $released = wp_update_post($release_args, true);
            if (is_wp_error($released)) {
                $auto_publish_error = $released->get_error_message();
                error_log(sprintf('Creator Publishing Hub release failed for Creator Newsdesk post %d: %s', $post_id, $auto_publish_error));
            } else {
                $auto_published = true;
                update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '0');
                delete_post_meta($post_id, self::META_IMAGE_READY_AT);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
                delete_post_meta($post_id, self::META_SOCIAL_SHARED_AT);
                delete_post_meta($post_id, self::META_SOCIAL_SHARE_ID);
            }
        }

        return new WP_REST_Response([
            'ok' => $auto_publish_error === '',
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'status' => get_post_status($post_id),
            'permalink' => get_permalink($post_id),
            'featured_id' => $featured_id,
            'story_id' => $story_id,
            'completed_roles' => $completed_roles,
            'preserved_roles' => array_values(array_diff(['landscape', 'story'], $completed_roles)),
            'managed_images' => $this->managed_image_items($post_id),
            'ready_for_publish' => get_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, true) === '1',
            'auto_published' => $auto_published,
            'auto_publish_error' => $auto_publish_error,
            'jetpack_publicize_requested' => $auto_published,
        ], 201);
    }

    private function image_role_attachment_id(int $post_id, string $role, int $requested_id = 0): int {
        if ($role === 'landscape') {
            $featured_id = (int) get_post_thumbnail_id($post_id);
            return $requested_id > 0 && $requested_id === $featured_id ? $requested_id : $featured_id;
        }

        $story_ids = $this->secondary_social_image_ids($post_id);
        if ($requested_id > 0 && in_array($requested_id, $story_ids, true)) {
            return $requested_id;
        }

        return (int) ($story_ids[0] ?? 0);
    }

    public function rest_image_production_approve(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : [];
        $post_id = absint($payload['post_id'] ?? 0);
        $role = sanitize_key((string) ($payload['role'] ?? ''));
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !in_array($role, ['landscape', 'story'], true)) {
            return new WP_Error('invalid_image_review', 'Choose a valid post and Landscape or Story role.', ['status' => 400]);
        }

        $attachment_id = $this->image_role_attachment_id($post_id, $role, absint($payload['attachment_id'] ?? 0));
        if ($attachment_id <= 0) {
            return new WP_Error('image_not_found', 'That image role has no attachment to approve.', ['status' => 404]);
        }

        $provider = $this->image_provider($post_id, $attachment_id);
        $approved_provider = sanitize_key('approved-' . ($provider !== 'none' ? $provider : 'unknown'));
        update_post_meta($attachment_id, self::META_FEATURED_IMAGE_PROVIDER, $approved_provider);
        if ($role === 'landscape') {
            update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $approved_provider);
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
            delete_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED);
        } else {
            update_post_meta($post_id, self::META_STORY_REQUIRED, '0');
        }

        $reviewer = $this->resolve_api_trigger_user($payload);
        $reviews = get_option(self::OPTION_IMAGE_AUDIT_REVIEWS, []);
        $reviews = is_array($reviews) ? $reviews : [];
        $reviews[$post_id . ':' . $role . ':' . $attachment_id] = [
            'decision' => 'approved',
            'reviewed_by' => $reviewer instanceof WP_User ? (int) $reviewer->ID : get_current_user_id(),
            'reviewer' => $reviewer instanceof WP_User ? (string) $reviewer->display_name : (string) wp_get_current_user()->display_name,
            'reviewed_at' => current_time('mysql'),
            'provider_before_review' => $provider,
        ];
        update_option(self::OPTION_IMAGE_AUDIT_REVIEWS, $reviews, false);

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'role' => $role,
            'attachment_id' => $attachment_id,
            'provider' => $approved_provider,
            'message' => sprintf('%s approved and removed from provider review.', ucfirst($role)),
        ]);
    }

    public function rest_image_production_reject(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : [];
        $post_id = absint($payload['post_id'] ?? 0);
        $role = sanitize_key((string) ($payload['role'] ?? ''));
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !in_array($role, ['landscape', 'story'], true)) {
            return new WP_Error('invalid_image_review', 'Choose a valid post and Landscape or Story role.', ['status' => 400]);
        }

        $attachment_id = $this->image_role_attachment_id($post_id, $role, absint($payload['attachment_id'] ?? 0));
        if ($attachment_id <= 0) {
            return new WP_Error('image_not_found', 'That image role has no attachment to reject.', ['status' => 404]);
        }
        if ($role === 'landscape') {
            delete_post_thumbnail($post_id);
        } else {
            $this->remove_secondary_social_image($post_id, $attachment_id);
        }

        $reviewer = $this->resolve_api_trigger_user($payload);
        $reviewer_id = $reviewer instanceof WP_User ? (int) $reviewer->ID : get_current_user_id();
        if ($reviewer_id > 0) {
            $this->record_image_activity($post_id, $reviewer_id, $attachment_id, $role === 'story' ? 'story' : 'featured', 0, 'deleted', 'image_review_reject');
        }
        if (!wp_delete_attachment($attachment_id, true)) {
            if ($role === 'landscape') {
                set_post_thumbnail($post_id, $attachment_id);
            } else {
                $this->append_secondary_social_image($post_id, $attachment_id);
            }
            return new WP_Error('image_delete_failed', 'WordPress could not delete that image file.', ['status' => 500]);
        }

        if ($role === 'landscape') {
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '1');
            update_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED, '1');
            delete_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH);
            delete_post_meta($post_id, self::META_IMAGE_READY_AT);
            delete_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER);
        } elseif (!$this->secondary_social_image_ids($post_id)) {
            update_post_meta($post_id, self::META_STORY_REQUIRED, '1');
        }

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'role' => $role,
            'deleted_attachment_id' => $attachment_id,
            'required_roles' => [$role],
            'message' => sprintf('%s deleted and queued for regeneration.', ucfirst($role)),
        ]);
    }

    public function rest_publish_ready(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(50, max(1, (int) $request->get_param('per_page')));

        return new WP_REST_Response([
            'ok' => true,
            'count' => $this->image_ready_publish_count(),
            'items' => $this->image_ready_publish_items($per_page),
        ]);
    }

    public function rest_publish_ready_post(WP_REST_Request $request): WP_REST_Response {
        $items = $this->image_ready_publish_items(1);
        if (!$items) {
            return new WP_REST_Response([
                'ok' => true,
                'published' => false,
                'reason' => 'no_image_ready_drafts',
            ]);
        }

        $item = $items[0];
        $post_id = (int) $item['post_id'];
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_REST_Response([
                'ok' => false,
                'published' => false,
                'reason' => 'candidate_missing',
            ], 409);
        }

        $is_creator_newsdesk = $this->is_creator_newsdesk_site();
        $matthew_author_id = $is_creator_newsdesk ? $this->matthew_author_id() : 0;
        if ($is_creator_newsdesk) {
            $social_message = trim((string) get_post_meta($post_id, self::META_SOCIAL, true));
            if ($social_message === '') {
                $social_message = get_the_title($post_id);
            }
            delete_post_meta($post_id, '_wpas_skip_publicize');
            delete_post_meta($post_id, '_publicize_pending');
            delete_post_meta($post_id, 'jetpack_social_post_already_shared');
            update_post_meta($post_id, 'jetpack_publicize_feature_enabled', true);
            update_post_meta($post_id, 'jetpack_publicize_message', $social_message);
            update_post_meta($post_id, '_jetpack_publicize_message', $social_message);
        } else {
            $this->suppress_instant_social_share($post_id);
        }
        $result = wp_update_post([
            'ID' => $post_id,
            'post_status' => 'publish',
            'post_author' => $matthew_author_id > 0 ? $matthew_author_id : (int) $post->post_author,
            // Preserve deliberately assigned editorial/backlog dates. New
            // drafts already carry their creation or scheduled date.
            'post_date' => $post->post_date,
            'post_date_gmt' => $post->post_date_gmt,
            'edit_date' => true,
        ], true);

        if (is_wp_error($result)) {
            return new WP_REST_Response([
                'ok' => false,
                'published' => false,
                'post_id' => $post_id,
                'reason' => $result->get_error_message(),
            ], 500);
        }

        update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '0');
        delete_post_meta($post_id, self::META_IMAGE_READY_AT);
        if ($is_creator_newsdesk) {
            delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
            delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
            delete_post_meta($post_id, self::META_SOCIAL_SHARED_AT);
            delete_post_meta($post_id, self::META_SOCIAL_SHARE_ID);
        } else {
            $this->queue_social_share($post_id);
        }

        return new WP_REST_Response([
            'ok' => true,
            'published' => true,
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'permalink' => get_permalink($post_id),
            'featured_media' => (int) get_post_thumbnail_id($post_id),
            'social_queue_status' => (string) get_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS, true),
            'jetpack_publicize_requested' => $is_creator_newsdesk,
        ]);
    }

    public function render_needs_images(): void {
        $per_page = 10;
        $current_user_id = get_current_user_id();
        $current_page = max(1, absint($_GET['fni_paged'] ?? 1));
        $category_filter = sanitize_key((string) ($_GET['fni_category'] ?? ''));
        $search_filter = sanitize_text_field((string) wp_unslash($_GET['fni_search'] ?? ''));
        if ($search_filter === '') {
            $this->ensure_image_claim_batch($current_user_id);
        }
        $total = $this->needs_image_count($category_filter, $search_filter, $current_user_id, true);
        $total_pages = max(1, (int) ceil($total / $per_page));
        $current_page = min($current_page, $total_pages);
        $offset = ($current_page - 1) * $per_page;
        $items = $this->needs_image_items($per_page, $offset, $category_filter, $search_filter, $current_user_id, true);
        $category_options = get_categories([
            'hide_empty' => false,
            'orderby' => 'name',
            'order' => 'ASC',
        ]);
        $showing_start = $total > 0 ? $offset + 1 : 0;
        $showing_end = min($offset + count($items), $total);
        $claim_minutes = (int) ceil(self::IMAGE_CLAIM_TTL_SECONDS / 60);
        $completion_count = $current_user_id > 0 ? (int) get_user_meta($current_user_id, self::USER_META_IMAGE_COMPLETION_COUNT, true) : 0;
        $completion_total = $current_user_id > 0 ? (int) get_user_meta($current_user_id, self::USER_META_IMAGE_COMPLETION_TOTAL_SECONDS, true) : 0;
        $completion_average = $completion_count > 0 ? max(1, (int) round(($completion_total / $completion_count) / 60)) : 0;
        $claim_expires_values = array_values(array_filter(array_map(static fn(array $item): int => (int) ($item['claim_expires'] ?? 0), $items)));
        $page_claim_expires = $claim_expires_values ? min($claim_expires_values) : 0;
        $searched_post = null;
        $searched_post_thumbnail = 0;
        $searched_post_image_required = '';
        if ($search_filter !== '' && ctype_digit($search_filter)) {
            $candidate = get_post((int) $search_filter);
            if ($candidate instanceof WP_Post && $candidate->post_type === 'post') {
                $searched_post = $candidate;
                $searched_post_thumbnail = (int) get_post_thumbnail_id($candidate->ID);
                $searched_post_image_required = (string) get_post_meta($candidate->ID, self::META_IMAGE_REQUIRED, true);
            }
        }
        ?>
        <div class="wrap creator-needs-images">
            <h1>Autopilot Image Desk</h1>
            <?php if (!empty($_GET['fni_uploaded'])) : ?>
                <?php
                $saved_id = absint($_GET['fni_saved_id'] ?? 0);
                $saved_title = sanitize_text_field((string) wp_unslash($_GET['fni_saved_title'] ?? ''));
                $saved_message = $saved_title !== ''
                    ? sprintf('Image saved for "%s" (#%d), metadata stripped, and the draft moved out of Image Desk. It is not public yet; Ryzen will publish it on the scheduled queue.', $saved_title, $saved_id)
                    : 'Image saved, metadata stripped, and the draft moved out of Image Desk. It is not public yet; Ryzen will publish it on the scheduled queue.';
                ?>
                <div class="notice notice-success is-dismissible fni-status-notice fni-auto-dismiss"><p><?php echo esc_html($saved_message); ?></p></div>
            <?php elseif (!empty($_GET['fni_trashed'])) : ?>
                <div class="notice notice-success is-dismissible fni-status-notice fni-auto-dismiss"><p>Draft moved to Trash.</p></div>
            <?php elseif (!empty($_GET['fni_error'])) : ?>
                <div class="notice notice-error is-dismissible fni-status-notice"><p><?php echo esc_html(sanitize_text_field(wp_unslash($_GET['fni_error']))); ?></p></div>
            <?php endif; ?>
            <p class="fni-lede">Choose an image job, copy its ChatGPT prompt, and paste or upload the finished artwork. Drafts enter the publishing queue; published articles stay public while their images are replaced.</p>
            <style>
                .creator-needs-images {
                    max-width: 1760px;
                }
                .creator-needs-images .fni-status-notice {
                    margin: 12px 0 14px;
                    max-height: 120px;
                    opacity: 1;
                    overflow: hidden;
                    transition: opacity .2s ease, transform .2s ease, max-height .2s ease, margin .2s ease, padding .2s ease;
                    transform: translateY(0);
                }
                .creator-needs-images .fni-status-notice.is-hiding {
                    margin-bottom: 0;
                    margin-top: 0;
                    max-height: 0;
                    opacity: 0;
                    padding-bottom: 0;
                    padding-top: 0;
                    transform: translateY(-6px);
                }
                .creator-needs-images .fni-status-actions {
                    align-items: center;
                    display: flex;
                    gap: 8px;
                    margin: 8px 0 0;
                }
                .creator-needs-images .fni-status-report {
                    margin-top: 10px;
                }
                .creator-needs-images .fni-status-report summary {
                    color: #1d2327;
                    cursor: pointer;
                    font-weight: 600;
                }
                .creator-needs-images .fni-status-report pre {
                    background: #f6f7f7;
                    border: 1px solid #dcdcde;
                    border-radius: 6px;
                    margin: 8px 0 0;
                    max-height: 260px;
                    overflow: auto;
                    padding: 12px;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .creator-needs-images .fni-processing-panel {
                    align-items: center;
                    background: linear-gradient(135deg, #0f172a 0%, #173c5f 100%);
                    border: 1px solid #294f70;
                    border-radius: 16px;
                    color: #fff;
                    display: grid;
                    gap: 18px;
                    grid-template-columns: minmax(0, 1fr) auto;
                    margin: 16px 0;
                    padding: 20px 22px;
                }
                .creator-needs-images .fni-processing-panel h2 {
                    color: #fff;
                    font-size: 20px;
                    margin: 0 0 6px;
                }
                .creator-needs-images .fni-processing-panel p {
                    color: #d7e7f5;
                    margin: 0;
                    max-width: 880px;
                }
                .creator-needs-images .fni-processing-fallback {
                    display: grid;
                    gap: 7px;
                    grid-column: 1 / -1;
                }
                .creator-needs-images .fni-processing-fallback[hidden] {
                    display: none;
                }
                .creator-needs-images .fni-processing-fallback label {
                    color: #fff;
                    font-size: 13px;
                    font-weight: 700;
                }
                .creator-needs-images .fni-processing-fallback textarea {
                    box-sizing: border-box;
                    min-height: 220px;
                    resize: vertical;
                    width: 100%;
                }
                .creator-needs-images .fni-processing-actions {
                    align-items: flex-end;
                    display: grid;
                    gap: 8px;
                    justify-items: end;
                }
                .creator-needs-images .fni-processing-actions .button {
                    background: #f4b740;
                    border-color: #f4b740;
                    color: #17202a;
                    font-weight: 700;
                    min-height: 42px;
                    padding: 0 18px;
                }
                .creator-needs-images .fni-processing-actions .button:hover,
                .creator-needs-images .fni-processing-actions .button:focus {
                    background: #ffd06a;
                    border-color: #ffd06a;
                    color: #111827;
                }
                .creator-needs-images .fni-processing-status {
                    color: #d7e7f5;
                    font-size: 12px;
                    max-width: 340px;
                    text-align: right;
                }
                .creator-needs-images .fni-helper {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-left: 4px solid #2271b1;
                    margin: 16px 0 20px;
                    padding: 14px 16px;
                }
                .creator-needs-images .fni-helper ol {
                    margin: 8px 0 0 20px;
                }
                .creator-needs-images .fni-filter {
                    align-items: center;
                    display: flex;
                    flex: 1 1 auto;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: flex-end;
                    margin: 0;
                    position: relative;
                }
                .creator-needs-images .fni-toolbar {
                    align-items: center;
                    display: flex;
                    flex-wrap: nowrap;
                    gap: 10px;
                    justify-content: space-between;
                    margin: 12px 0;
                }
                .creator-needs-images .fni-count {
                    color: #50575e;
                    font-weight: 600;
                }
                .creator-needs-images .fni-pagination {
                    align-items: center;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin: 14px 0;
                }
                .creator-needs-images .fni-pagination .page-numbers {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-radius: 3px;
                    display: inline-block;
                    line-height: 1;
                    min-width: 18px;
                    padding: 7px 9px;
                    text-align: center;
                    text-decoration: none;
                }
                .creator-needs-images .fni-pagination .current {
                    background: #2271b1;
                    border-color: #2271b1;
                    color: #fff;
                }
                .creator-needs-images .fni-list {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
                    align-items: start;
                }
                .creator-needs-images .fni-card {
                    background: #fff;
                    border: 1px solid #dcdcde;
                    border-radius: 4px;
                    padding: 14px 16px;
                    position: relative;
                }
                .creator-needs-images .fni-card.is-image-collector-ready {
                    padding-right: 54px;
                }
                .creator-needs-images .fni-card.is-saving {
                    opacity: .62;
                    pointer-events: none;
                }
                .creator-needs-images .fni-card.is-saving::after {
                    content: "Saving image...";
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: rgba(255, 255, 255, .72);
                    color: #1d2327;
                    font-weight: 700;
                }
                .creator-needs-images .fni-card h2 {
                    font-size: 18px;
                    line-height: 1.3;
                    margin: 0 0 6px;
                }
                .creator-needs-images .fni-state-badge {
                    background: #fff3cd;
                    border: 1px solid #e0a800;
                    border-radius: 999px;
                    color: #5c3b00;
                    display: inline-flex;
                    font-size: 11px;
                    font-weight: 800;
                    line-height: 1;
                    margin-left: 6px;
                    padding: 4px 7px;
                    text-transform: uppercase;
                    vertical-align: middle;
                }
                .creator-needs-images .fni-state-badge.is-missing {
                    background: #eef6ff;
                    border-color: #72aee6;
                    color: #135e96;
                }
                .creator-needs-images .fni-card-header {
                    align-items: flex-start;
                    display: grid;
                    gap: 12px;
                    grid-template-columns: 1fr;
                }
                .creator-needs-images .fni-actions {
                    align-items: center;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    justify-content: flex-start;
                }
                .creator-needs-images .fni-icon-action {
                    align-items: center;
                    appearance: none;
                    background: transparent;
                    border: 0;
                    box-shadow: none;
                    color: #50575e;
                    cursor: pointer;
                    display: inline-flex;
                    height: 30px;
                    justify-content: center;
                    margin: 0;
                    min-height: 30px;
                    min-width: 30px;
                    padding: 0;
                    text-decoration: none;
                }
                .creator-needs-images .fni-icon-action:hover,
                .creator-needs-images .fni-icon-action:focus {
                    background: transparent;
                    border: 0;
                    box-shadow: none;
                    color: #2271b1;
                }
                .creator-needs-images .fni-icon-action:focus-visible {
                    outline: 2px solid #2271b1;
                    outline-offset: 2px;
                }
                .creator-needs-images .fni-icon-action:disabled {
                    color: #a7aaad;
                    cursor: progress;
                }
                .creator-needs-images .fni-icon-action .dashicons,
                .creator-needs-images .fni-icon-action .fa-regular,
                .creator-needs-images .fni-icon-action .fa-solid,
                .creator-needs-images .fni-icon-action .fa-brands {
                    font-size: 20px;
                    height: 20px;
                    line-height: 1;
                    width: 20px;
                }
                .creator-needs-images .fni-icon-action .fni-save-icon {
                    display: block;
                    height: 21px;
                    width: 21px;
                }
                .creator-needs-images .fni-save-both {
                    gap: 6px;
                    width: auto;
                }
                .creator-needs-images .fni-save-both .fni-save-text {
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .creator-needs-images .fni-upload.is-secondary-enabled .fni-primary-save {
                    display: none;
                }
                .creator-needs-images .fni-tooltip {
                    position: relative;
                }
                .creator-needs-images .fni-tooltip::after {
                    background: #1d2327;
                    border-radius: 3px;
                    bottom: calc(100% + 8px);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
                    color: #fff;
                    content: attr(data-tooltip);
                    display: none;
                    font-size: 12px;
                    font-weight: 400;
                    left: 50%;
                    line-height: 1.35;
                    max-width: 240px;
                    min-width: 180px;
                    padding: 7px 9px;
                    pointer-events: none;
                    position: absolute;
                    text-align: left;
                    transform: translateX(-50%);
                    white-space: normal;
                    z-index: 20;
                }
                .creator-needs-images .fni-tooltip::before {
                    border: 6px solid transparent;
                    border-top-color: #1d2327;
                    bottom: calc(100% - 4px);
                    content: "";
                    display: none;
                    left: 50%;
                    pointer-events: none;
                    position: absolute;
                    transform: translateX(-50%);
                    z-index: 21;
                }
                .creator-needs-images .fni-tooltip:hover::after,
                .creator-needs-images .fni-tooltip:hover::before,
                .creator-needs-images .fni-tooltip:focus-visible::after,
                .creator-needs-images .fni-tooltip:focus-visible::before,
                .creator-needs-images .fni-tooltip:focus-within::after,
                .creator-needs-images .fni-tooltip:focus-within::before {
                    display: block;
                }
                .creator-needs-images .fni-auto-note {
                    align-items: center;
                    color: #646970;
                    display: inline-flex;
                    gap: 4px;
                    line-height: 1.4;
                }
                .creator-needs-images .fni-auto-note .dashicons {
                    color: #646970;
                    font-size: 16px;
                    height: 16px;
                    width: 16px;
                }
                .creator-needs-images .fni-copy.is-copied {
                    color: #008a20;
                }
                .creator-needs-images .fni-inline-copy {
                    appearance: none;
                    background: transparent;
                    border: 0;
                    box-shadow: none;
                    color: #2271b1;
                    cursor: pointer;
                    margin: 0;
                    padding: 0;
                    text-decoration: underline;
                }
                .creator-needs-images .fni-inline-copy:hover,
                .creator-needs-images .fni-inline-copy:focus {
                    color: #135e96;
                }
                .creator-needs-images .fni-inline-copy.is-copied {
                    color: #008a20;
                }
                .creator-needs-images .fni-trash-form {
                    display: inline;
                    margin: 0;
                }
                .creator-needs-images .fni-trash-button {
                    color: #b32d2e;
                }
                .creator-needs-images .fni-trash-article {
                    align-items: center;
                    display: inline-flex;
                    font-size: 12px;
                    font-weight: 700;
                    gap: 4px;
                    line-height: 1;
                    text-transform: uppercase;
                }
                .creator-needs-images .fni-trash-button:hover,
                .creator-needs-images .fni-trash-button:focus {
                    color: #8a2424;
                }
                .creator-needs-images textarea {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                    min-height: 180px;
                    width: 100%;
                }
                .creator-needs-images .fni-meta {
                    color: #646970;
                    margin: 0;
                }
                .creator-needs-images .fni-trend {
                    align-items: center;
                    color: #50575e;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin: 8px 0 0;
                }
                .creator-needs-images .fni-trend-legend {
                    align-items: center;
                    color: #646970;
                    display: flex;
                    flex-wrap: wrap;
                    font-size: 12px;
                    gap: 8px;
                    margin: 8px 0 0;
                }
                .creator-needs-images .fni-trend-legend strong {
                    color: #1d2327;
                }
                .creator-needs-images .fni-trend-badge {
                    border-radius: 999px;
                    display: inline-flex;
                    font-size: 11px;
                    font-weight: 800;
                    line-height: 1;
                    padding: 5px 8px;
                    text-transform: uppercase;
                }
                .creator-needs-images .fni-trend-badge.is-hot {
                    background: #d63638;
                    color: #fff;
                }
                .creator-needs-images .fni-trend-badge.is-strong {
                    background: #f0b849;
                    color: #1d2327;
                }
                .creator-needs-images .fni-trend-badge.is-medium {
                    background: #dbeafe;
                    color: #135e96;
                }
                .creator-needs-images .fni-trend-badge.is-low {
                    background: #f0f0f1;
                    color: #50575e;
                }
                .creator-needs-images .fni-trend-tags {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                    font-size: 12px;
                }
                .creator-needs-images .fni-trend-reasons {
                    color: #646970;
                    font-size: 12px;
                }
                .creator-needs-images .fni-claim {
                    color: #646970;
                    display: inline-block;
                    margin-top: 4px;
                }
                .creator-needs-images .fni-summary {
                    color: #3c434a;
                    font-size: 14px;
                    margin: 10px 0 12px;
                    max-width: 72ch;
                }
                .creator-needs-images .fni-details {
                    border-top: 1px solid #f0f0f1;
                    margin-top: 12px;
                    padding-top: 10px;
                }
                .creator-needs-images .fni-details summary {
                    cursor: pointer;
                    font-weight: 600;
                }
                .creator-needs-images .fni-upload {
                    background: #f6f7f7;
                    border: 1px solid #dcdcde;
                    border-radius: 6px;
                    display: grid;
                    gap: 10px;
                    margin-top: 12px;
                    padding: 12px;
                    position: relative;
                }
                .creator-needs-images .fni-upload.is-featured-saved {
                    background: #fff;
                    border-color: #dcdcde;
                }
                .creator-needs-images .fni-story-progress {
                    background: #f6f7f7;
                    border-left: 4px solid #2271b1;
                    color: #1d2327;
                    display: none;
                    font-size: 13px;
                    line-height: 1.35;
                    padding: 8px 10px;
                }
                .creator-needs-images .fni-upload.is-featured-saved .fni-story-progress {
                    display: block;
                }
                .creator-needs-images .fni-stack-count {
                    color: #646970;
                    display: none;
                    font-size: 12px;
                    font-weight: 700;
                }
                .creator-needs-images .fni-upload.is-featured-saved .fni-stack-count {
                    display: inline;
                }
                .creator-needs-images .fni-saved-files {
                    display: none;
                    gap: 6px;
                    grid-template-columns: 1fr;
                }
                .creator-needs-images .fni-upload.is-featured-saved .fni-saved-files {
                    display: grid;
                }
                .creator-needs-images .fni-saved-file-list {
                    color: #646970;
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 0;
                    min-width: 0;
                }
                .creator-needs-images .fni-saved-file-list strong {
                    color: #1d2327;
                    display: block;
                    font-size: 11px;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }
                .creator-needs-images .fni-saved-file-list span {
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .creator-needs-images .fni-media-shelf {
                    display: none;
                    gap: 10px;
                    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
                }
                .creator-needs-images .fni-media-shelf:not(:empty) {
                    display: grid;
                }
                .creator-needs-images .fni-media-item {
                    background: #fff;
                    border: 1px solid #dcdcde;
                    display: grid;
                    gap: 6px;
                    min-width: 0;
                    padding: 6px;
                    position: relative;
                }
                .creator-needs-images .fni-media-thumb {
                    align-items: center;
                    background: #eef0f2;
                    display: flex;
                    height: 156px;
                    justify-content: center;
                    overflow: hidden;
                    width: 100%;
                }
                .creator-needs-images .fni-media-thumb img {
                    height: 100%;
                    object-fit: contain;
                    width: 100%;
                }
                .creator-needs-images .fni-media-kind {
                    background: rgba(29, 35, 39, .88);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                    left: 10px;
                    padding: 3px 5px;
                    position: absolute;
                    text-transform: uppercase;
                    top: 10px;
                }
                .creator-needs-images .fni-media-meta {
                    align-items: center;
                    display: grid;
                    gap: 4px;
                    grid-template-columns: minmax(0, 1fr) auto auto;
                }
                .creator-needs-images .fni-media-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .creator-needs-images .fni-media-action {
                    appearance: none;
                    background: transparent;
                    border: 0;
                    color: #50575e;
                    cursor: pointer;
                    font-size: 17px;
                    line-height: 1;
                    padding: 3px;
                }
                .creator-needs-images .fni-media-action:hover,
                .creator-needs-images .fni-media-action:focus {
                    color: #2271b1;
                }
                .creator-needs-images .fni-media-delete:hover,
                .creator-needs-images .fni-media-delete:focus {
                    color: #b32d2e;
                }
                .creator-needs-images .fni-image-viewer {
                    align-items: center;
                    background: rgba(0, 0, 0, .86);
                    display: none;
                    inset: 0;
                    justify-content: center;
                    padding: 32px;
                    position: fixed;
                    z-index: 100100;
                }
                .creator-needs-images .fni-image-viewer.is-open {
                    display: flex;
                }
                .creator-needs-images .fni-image-viewer img {
                    max-height: calc(100vh - 80px);
                    max-width: calc(100vw - 80px);
                    object-fit: contain;
                }
                .creator-needs-images .fni-image-viewer-close {
                    color: #fff;
                    font-size: 28px;
                    position: fixed;
                    right: 22px;
                    top: 22px;
                }
                .creator-needs-images .fni-close-story {
                    display: none;
                    color: #50575e;
                    font-size: 30px;
                    line-height: 1;
                    position: absolute;
                    right: 14px;
                    top: 14px;
                    z-index: 5;
                }
                .creator-needs-images .fni-card.is-image-collector-ready .fni-close-story {
                    display: inline-flex;
                }
                .creator-needs-images .fni-close-story:hover,
                .creator-needs-images .fni-close-story:focus {
                    color: #b32d2e;
                }
                .creator-needs-images .fni-drop {
                    align-items: center;
                    background: #fff;
                    border: 2px dashed #c3c4c7;
                    border-radius: 4px;
                    color: #50575e;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-height: 92px;
                    justify-content: center;
                    overflow: hidden;
                    padding: 12px;
                    text-align: center;
                }
                .creator-needs-images .fni-drop span {
                    max-width: 100%;
                }
                .creator-needs-images .fni-image-grid {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .creator-needs-images .fni-upload.is-secondary-enabled .fni-image-grid {
                    grid-template-columns: 1fr;
                }
                .creator-needs-images .fni-upload.is-featured-saved .fni-image-grid {
                    grid-template-columns: 1fr;
                }
                .creator-needs-images .fni-image-slot {
                    display: grid;
                    gap: 8px;
                    min-width: 0;
                }
                .creator-needs-images .fni-upload.is-featured-saved .fni-featured-slot {
                    display: grid;
                }
                .creator-needs-images .fni-image-label {
                    color: #1d2327;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                }
                .creator-needs-images .fni-story-slot {
                    display: grid;
                }
                .creator-needs-images .fni-upload.is-secondary-enabled .fni-story-slot {
                    display: grid;
                }
                .creator-needs-images .fni-secondary-drop {
                    min-height: 92px;
                    width: 100%;
                }
                .creator-needs-images .fni-upload.is-secondary-enabled .fni-drop {
                    min-height: 180px;
                }
                .creator-needs-images .fni-drop.is-active {
                    border-color: #2271b1;
                    color: #1d2327;
                }
                .creator-needs-images .fni-preview {
                    display: none;
                    max-height: 130px;
                    max-width: 220px;
                    object-fit: contain;
                }
                .creator-needs-images .fni-upload.is-secondary-enabled .fni-preview {
                    max-height: 170px;
                    max-width: 100%;
                }
                .creator-needs-images .fni-preview[src] {
                    display: block;
                }
                .creator-needs-images .fni-upload-row {
                    align-items: center;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .creator-needs-images .fni-upload-row input[type="file"] {
                    max-width: 280px;
                }
                .creator-needs-images .fni-secondary-row {
                    display: none;
                }
                .creator-needs-images .fni-upload.is-secondary-enabled .fni-secondary-row {
                    display: flex;
                }
                .creator-needs-images .fni-prompt-grid {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: 1fr;
                    margin-top: 12px;
                }
                .creator-needs-images .fni-prompt-grid h3 {
                    font-size: 13px;
                    margin: 0 0 6px;
                    text-transform: uppercase;
                }
                .creator-needs-images .fni-search-modal {
                    background: rgba(0, 0, 0, .42);
                    display: none;
                    inset: 0;
                    padding: 32px 16px;
                    position: fixed;
                    z-index: 100000;
                }
                .creator-needs-images .fni-search-modal.is-open {
                    display: grid;
                    place-items: start center;
                }
                .creator-needs-images .fni-search-panel {
                    background: #fff;
                    border-radius: 4px;
                    box-shadow: 0 16px 48px rgba(0, 0, 0, .28);
                    max-width: 760px;
                    padding: 18px;
                    width: min(760px, 100%);
                }
                .creator-needs-images .fni-search-panel-header {
                    align-items: center;
                    display: flex;
                    gap: 12px;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }
                .creator-needs-images .fni-search-panel-header h2 {
                    margin: 0;
                }
                .creator-needs-images .fni-search-mode {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin: 10px 0;
                }
                .creator-needs-images .fni-search-mode label {
                    align-items: center;
                    display: inline-flex;
                    gap: 5px;
                }
                .creator-needs-images .fni-search-row {
                    align-items: center;
                    display: flex;
                    gap: 8px;
                }
                .creator-needs-images .fni-search-row input[type="search"] {
                    flex: 1 1 auto;
                    min-width: 160px;
                }
                .creator-needs-images .fni-search-results {
                    display: grid;
                    gap: 8px;
                    margin-top: 14px;
                    max-height: min(58vh, 560px);
                    overflow: auto;
                }
                .creator-needs-images .fni-search-suggestions {
                    background: #fff;
                    border: 1px solid #c3c4c7;
                    border-radius: 6px;
                    box-shadow: 0 12px 28px rgba(0, 0, 0, .16);
                    display: none;
                    left: 104px;
                    max-height: min(62vh, 520px);
                    overflow: auto;
                    padding: 10px;
                    position: absolute;
                    right: 120px;
                    top: calc(100% + 6px);
                    z-index: 50;
                }
                .creator-needs-images .fni-search-suggestions.is-open {
                    display: grid;
                    gap: 8px;
                }
                .creator-needs-images .fni-search-result {
                    border: 1px solid #dcdcde;
                    border-radius: 4px;
                    padding: 10px;
                }
                .creator-needs-images .fni-search-result h3 {
                    font-size: 15px;
                    margin: 0 0 5px;
                }
                .creator-needs-images .fni-search-result p {
                    margin: 5px 0;
                }
                .creator-needs-images .fni-search-result-actions {
                    align-items: center;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 7px;
                }
                .creator-needs-images .fni-compose-panel {
                    max-width: 900px;
                    width: min(900px, 100%);
                }
                .creator-needs-images .fni-compose-grid {
                    display: grid;
                    gap: 14px;
                    grid-template-columns: minmax(0, 2fr) minmax(180px, 1fr);
                }
                .creator-needs-images .fni-compose-field {
                    display: grid;
                    gap: 6px;
                }
                .creator-needs-images .fni-compose-field label {
                    font-weight: 600;
                }
                .creator-needs-images .fni-compose-field input,
                .creator-needs-images .fni-compose-field select,
                .creator-needs-images .fni-compose-field textarea {
                    box-sizing: border-box;
                    max-width: none;
                    width: 100%;
                }
                .creator-needs-images .fni-compose-story {
                    grid-column: 1 / -1;
                }
                .creator-needs-images .fni-compose-story textarea {
                    min-height: 260px;
                    resize: vertical;
                }
                .creator-needs-images .fni-compose-actions {
                    align-items: center;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    margin-top: 16px;
                }
                .creator-needs-images .fni-compose-status {
                    color: #50575e;
                    margin-right: auto;
                }
                @media (max-width: 782px) {
                    .creator-needs-images .fni-processing-panel {
                        align-items: stretch;
                        grid-template-columns: 1fr;
                    }
                    .creator-needs-images .fni-processing-actions {
                        justify-items: stretch;
                    }
                    .creator-needs-images .fni-processing-status {
                        max-width: none;
                        text-align: left;
                    }
                    .creator-needs-images .fni-list {
                        grid-template-columns: 1fr;
                    }
                    .creator-needs-images .fni-card-header {
                        grid-template-columns: 1fr;
                    }
                    .creator-needs-images .fni-actions {
                        justify-content: flex-start;
                    }
                    .creator-needs-images .fni-upload.is-secondary-enabled .fni-image-grid {
                        grid-template-columns: 1fr;
                    }
                    .creator-needs-images .fni-image-grid {
                        grid-template-columns: 1fr;
                    }
                    .creator-needs-images .fni-search-suggestions {
                        left: 0;
                        right: 0;
                    }
                    .creator-needs-images .fni-compose-grid {
                        grid-template-columns: 1fr;
                    }
                    .creator-needs-images .fni-toolbar {
                        align-items: flex-start;
                        flex-wrap: wrap;
                    }
                    .creator-needs-images .fni-filter {
                        justify-content: flex-start;
                        width: 100%;
                    }
                }
            </style>
            <section class="fni-processing-panel" aria-labelledby="fni-processing-title">
                <div>
                    <h2 id="fni-processing-title">Process the Media queue with Codex</h2>
                    <p>Copies every missing or flagged media role in your current reserved batch, up to <?php echo esc_html((string) self::IMAGE_PROCESSING_BATCH_SIZE); ?> posts. The handoff includes each post's exact Landscape or Story prompt and this site's logo, while preserving any companion that is already ready.</p>
                </div>
                <div class="fni-processing-actions">
                    <button type="button" class="button" id="fni-start-processing">Copy all missing-media prompt</button>
                    <span class="fni-processing-status" id="fni-processing-status" aria-live="polite">Nothing is sent or published by this action. The processing request is copied for Codex.</span>
                </div>
                <div class="fni-processing-fallback" id="fni-processing-fallback" hidden>
                    <label for="fni-processing-prompt">Full Codex batch prompt — includes the publication, WordPress URLs, post IDs, required roles, and exact image prompts</label>
                    <textarea id="fni-processing-prompt" readonly rows="12" onclick="this.select();"></textarea>
                </div>
            </section>
            <div class="fni-helper">
                <strong><?php echo esc_html(number_format_i18n($total)); ?> image jobs available to you</strong>
                <p class="fni-meta">
                    Your work batch can hold up to <?php echo esc_html((string) self::IMAGE_CLAIM_BATCH_SIZE); ?> reserved drafts for about <?php echo esc_html((string) $claim_minutes); ?> minutes, with <?php echo esc_html((string) count($items)); ?> shown on this page. A strong session goal is <?php echo esc_html((string) self::IMAGE_SESSION_GOAL); ?> finished cards. Other helpers will see different unclaimed cards; expired claims return to the queue.
                    <?php if ($page_claim_expires > 0) : ?>
                        Time left: <strong id="fni-lease-countdown" data-expires="<?php echo esc_attr((string) $page_claim_expires); ?>">calculating...</strong>
                    <?php endif; ?>
                    <?php if ($completion_average > 0) : ?>
                        Your recent average is about <?php echo esc_html((string) $completion_average); ?> minutes per saved image.
                    <?php endif; ?>
                </p>
                <p class="fni-trend-legend">
                    <strong>Trend score:</strong>
                    Low 0-37
                    Medium 38-57
                    Strong 58-77
                    Hot 78-100
                    <span class="fni-tooltip" tabindex="0" data-tooltip="Trend score ranks which drafts may be worth making images for first. It looks at social captions, hashtags, trend query, category, and curiosity-friendly terms. Hashtags shown beside the badge are suggested social tags, not the score itself.">How it works</span>
                </p>
            </div>
            <div class="fni-toolbar">
                <span class="fni-count">
                    <?php echo esc_html(sprintf(
                        'Showing %s-%s of %s',
                        number_format_i18n($showing_start),
                        number_format_i18n($showing_end),
                        number_format_i18n($total)
                    )); ?>
                </span>
                <form class="fni-filter" method="get" action="<?php echo esc_url(admin_url('admin.php')); ?>">
                    <input type="hidden" name="page" value="creator-needs-images">
                    <label for="fni-category-filter">Category</label>
                    <select id="fni-category-filter" name="fni_category">
                        <option value="">All categories</option>
                        <?php foreach ($category_options as $category_option) : ?>
                            <option value="<?php echo esc_attr($category_option->slug); ?>" <?php selected($category_filter, $category_option->slug); ?>>
                                <?php echo esc_html($category_option->name); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <label for="fni-search-filter">Search Image Desk</label>
                    <input type="search" id="fni-search-filter" name="fni_search" class="regular-text" value="<?php echo esc_attr($search_filter); ?>" placeholder="Title, article text, or post number">
                    <div class="fni-search-suggestions" id="fni-search-suggestions" aria-live="polite"></div>
                    <button type="submit" class="button">Filter</button>
                    <button type="button" class="button button-primary" id="fni-smart-search-open">Smart search</button>
                    <?php if ($category_filter !== '' || $search_filter !== '') : ?>
                        <a class="button" href="<?php echo esc_url(admin_url('admin.php?page=creator-needs-images')); ?>">Clear</a>
                    <?php endif; ?>
                    <button type="button" class="fni-icon-action fni-tooltip" id="fni-grab-batch" data-tooltip="Reserve up to 10 more unprocessed image jobs." aria-label="Grab more image jobs" title="Grab more image jobs">
                        <i class="fa-solid fa-images" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="fni-icon-action fni-tooltip" id="fni-compose-open" data-tooltip="Write a new image-ready story." aria-label="Write a new story" title="Write a new story">
                        <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                </form>
            </div>
            <div class="fni-search-modal" id="fni-search-modal" aria-hidden="true">
                <div class="fni-search-panel" role="dialog" aria-modal="true" aria-labelledby="fni-search-title">
                    <div class="fni-search-panel-header">
                        <h2 id="fni-search-title">Search posts</h2>
                        <button type="button" class="button-link" id="fni-smart-search-close">Close</button>
                    </div>
                    <form id="fni-smart-search-form">
                        <p class="fni-meta">What are we searching for?</p>
                        <div class="fni-search-mode">
                            <label><input type="radio" name="mode" value="everything" checked> Everything</label>
                            <label><input type="radio" name="mode" value="post_id"> Post ID</label>
                            <label><input type="radio" name="mode" value="text"> Text/context</label>
                        </div>
                        <div class="fni-search-row">
                            <input type="search" id="fni-smart-search-query" class="regular-text" placeholder="1958, Tetris effect, or a sentence from the article">
                            <button type="submit" class="button button-primary">Search</button>
                        </div>
                    </form>
                    <div class="fni-search-results" id="fni-smart-search-results" aria-live="polite"></div>
                </div>
            </div>
            <div class="fni-search-modal" id="fni-compose-modal" aria-hidden="true">
                <div class="fni-search-panel fni-compose-panel" role="dialog" aria-modal="true" aria-labelledby="fni-compose-title">
                    <div class="fni-search-panel-header">
                        <h2 id="fni-compose-title">New image-ready story</h2>
                        <button type="button" class="button-link" id="fni-compose-close">Close</button>
                    </div>
                    <form id="fni-compose-form">
                        <div class="fni-compose-grid">
                            <div class="fni-compose-field">
                                <label for="fni-compose-post-title">Title</label>
                                <input type="text" id="fni-compose-post-title" name="title" required autocomplete="off">
                            </div>
                            <div class="fni-compose-field">
                                <label for="fni-compose-category">Category</label>
                                <select id="fni-compose-category" name="category_id" required>
                                    <?php foreach ($category_options as $category_option) : ?>
                                        <option value="<?php echo esc_attr((string) $category_option->term_id); ?>" <?php selected($category_option->slug, $category_filter); ?>><?php echo esc_html($category_option->name); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="fni-compose-field fni-compose-story">
                                <label for="fni-compose-content">Story text</label>
                                <textarea id="fni-compose-content" name="content" required placeholder="Paste the sourced story or article text here."></textarea>
                            </div>
                            <div class="fni-compose-field">
                                <label for="fni-compose-source">Source URL</label>
                                <input type="url" id="fni-compose-source" name="source_url" placeholder="https://">
                            </div>
                            <div class="fni-compose-field">
                                <label for="fni-compose-tags">Tags</label>
                                <input type="text" id="fni-compose-tags" name="tags" placeholder="history, science, Philippines">
                            </div>
                        </div>
                        <div class="fni-compose-actions">
                            <span class="fni-compose-status" id="fni-compose-status" aria-live="polite"></span>
                            <button type="button" class="button" id="fni-compose-cancel">Cancel</button>
                            <button type="submit" class="button button-primary" id="fni-compose-submit">Create image draft</button>
                        </div>
                    </form>
                </div>
            </div>
            <?php $this->render_needs_images_pagination($current_page, $total_pages, $category_filter, $search_filter); ?>
            <?php if (!$items) : ?>
                <?php if ($searched_post instanceof WP_Post && $searched_post_thumbnail > 0) : ?>
                    <div class="notice notice-info"><p>
                        Post #<?php echo esc_html((string) $searched_post->ID); ?> already has a featured image, so it is not in Image Desk.
                        <a href="<?php echo esc_url(admin_url('admin.php?page=creator-image-review&fir_search=' . (int) $searched_post->ID)); ?>">Open it in Image Review to replace the wrong graphic.</a>
                    </p></div>
                <?php elseif ($searched_post instanceof WP_Post && $searched_post_image_required !== '1') : ?>
                    <div class="notice notice-info"><p>
                        Post #<?php echo esc_html((string) $searched_post->ID); ?> exists, but it is not marked as waiting for an image.
                        <a href="<?php echo esc_url(get_edit_post_link($searched_post->ID)); ?>">Open the post editor.</a>
                    </p></div>
                <?php else : ?>
                    <div class="notice notice-success"><p>No draft posts are currently waiting on images.</p></div>
                <?php endif; ?>
            <?php endif; ?>
            <div class="fni-list">
                <?php foreach ($items as $item) : ?>
                    <?php
                    $prompt_id = 'fni-prompt-' . (int) $item['post_id'];
                    $story_id = 'fni-story-' . (int) $item['post_id'];
                    $managed_images = (array) ($item['managed_images'] ?? []);
                    $has_saved_main = count(array_filter($managed_images, static fn(array $image): bool => ($image['kind'] ?? '') === 'main')) > 0;
                    ?>
                    <section class="fni-card<?php echo $has_saved_main ? ' is-image-collector-ready' : ''; ?>" data-post-id="<?php echo esc_attr((string) $item['post_id']); ?>" data-search="<?php echo esc_attr(strtolower($item['title'] . ' ' . $item['category'] . ' #' . $item['post_id'])); ?>">
                        <button type="button" class="fni-icon-action fni-close-story fni-tooltip" data-tooltip="Done: close this whole card. The saved draft is already in the scheduled publish queue." aria-label="Close and queue image card" title="Close and queue image card">&times;</button>
                        <div class="fni-card-header">
                            <div>
                                <h2>
                                    <?php echo esc_html($item['title']); ?>
                                    <?php if (($item['image_state'] ?? '') === 'redo') : ?>
                                        <span class="fni-state-badge">Redo</span>
                                    <?php elseif ((int) ($item['featured_media'] ?? 0) <= 0) : ?>
                                        <span class="fni-state-badge is-missing">Missing image</span>
                                    <?php endif; ?>
                                </h2>
                                <p class="fni-meta">
                                    <button type="button" class="fni-inline-copy fni-diagnostic-copy fni-tooltip" data-diagnostic="<?php echo esc_attr($item['diagnostic']); ?>" data-tooltip="Copy post ID and diagnosis info for Codex." aria-label="Copy diagnosis info for post <?php echo esc_attr((string) $item['post_id']); ?>" title="Copy diagnosis info">Post #<?php echo esc_html((string) $item['post_id']); ?></button> ·
                                    <?php echo esc_html(ucfirst($item['status'])); ?> ·
                                    <?php echo esc_html($item['category']); ?> ·
                                    <a href="<?php echo esc_url($item['edit_url']); ?>"><?php echo $item['status'] === 'publish' ? 'Open article editor' : 'Open draft'; ?></a>
                                    <?php if (!empty($item['claim_label'])) : ?>
                                        <br><span class="fni-claim"><?php echo esc_html($item['claim_label']); ?></span>
                                    <?php endif; ?>
                                </p>
                                <?php
                                $trend_class = 'is-' . sanitize_html_class(strtolower((string) ($item['trend_label'] ?? 'low')));
                                $trend_tags = !empty($item['trend_hashtags']) ? implode(' ', array_map('sanitize_text_field', (array) $item['trend_hashtags'])) : '';
                                $trend_reasons = !empty($item['trend_reasons']) ? implode(', ', array_map('sanitize_text_field', (array) $item['trend_reasons'])) : '';
                                $trend_tooltip = sprintf(
                                    'Trend priority %s/100. Low 0-37, Medium 38-57, Strong 58-77, Hot 78-100. Higher scores mean this draft has stronger social/image priority signals. Hashtags beside it are suggested social tags.',
                                    (string) ((int) ($item['trend_score'] ?? 0))
                                );
                                ?>
                                <div class="fni-trend">
                                    <span class="fni-trend-badge fni-tooltip <?php echo esc_attr($trend_class); ?>" tabindex="0" data-tooltip="<?php echo esc_attr($trend_tooltip); ?>">
                                        <?php echo esc_html(($item['trend_label'] ?? 'Low') . ' ' . (int) ($item['trend_score'] ?? 0)); ?>
                                    </span>
                                    <?php if ($trend_tags !== '') : ?>
                                        <span class="fni-trend-tags fni-tooltip" tabindex="0" data-tooltip="Suggested hashtags for later social captions. They do not mean the post is already shared."><?php echo esc_html($trend_tags); ?></span>
                                    <?php endif; ?>
                                    <?php if (!empty($item['trend_query'])) : ?>
                                        <span class="fni-trend-reasons">Trend: <?php echo esc_html((string) $item['trend_query']); ?></span>
                                    <?php elseif ($trend_reasons !== '') : ?>
                                        <span class="fni-trend-reasons"><?php echo esc_html($trend_reasons); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="fni-actions">
                                <button type="button" class="fni-icon-action fni-copy fni-tooltip" data-copy-target="<?php echo esc_attr($prompt_id); ?>" data-tooltip="Copy the landscape ChatGPT prompt for this article." aria-label="Copy ChatGPT prompt" title="Copy ChatGPT prompt">
                                    <i class="fa-regular fa-copy" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="fni-icon-action fni-copy fni-tooltip" data-copy-target="<?php echo esc_attr($story_id); ?>" data-tooltip="Copy the vertical story prompt. Use this later for Stories/Reels art." aria-label="Copy story prompt" title="Copy story prompt">
                                    <i class="fa-solid fa-thumbtack" aria-hidden="true"></i>
                                </button>
                                <?php if (!empty($item['api_generation_allowed'])) : ?>
                                    <button type="button" class="fni-icon-action fni-run-paid-api fni-tooltip" data-post-id="<?php echo esc_attr((string) $item['post_id']); ?>" data-tooltip="Generate both the landscape and Story image with the paid OpenAI lane, then save them straight into this draft." aria-label="Run paid image generation" title="Run paid image generation">
                                        <i class="fa-solid fa-bolt" aria-hidden="true"></i>
                                    </button>
                                <?php endif; ?>
                                <form class="fni-trash-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                                    <?php wp_nonce_field('cph_trash_image_draft_' . (int) $item['post_id']); ?>
                                    <input type="hidden" name="action" value="cph_trash_image_draft">
                                    <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $item['post_id']); ?>">
                                    <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_needs_images_url()); ?>">
                                    <button type="submit" class="fni-icon-action fni-trash-button fni-trash-article fni-tooltip" data-tooltip="Move this whole article to WordPress Trash because it does not fit this site." aria-label="Trash article" title="Trash article" onclick="return confirm('Move this whole article to WordPress Trash?');"><i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>Trash article</span></button>
                                </form>
                            </div>
                        </div>
                        <?php if (!empty($item['summary'])) : ?>
                            <p class="fni-summary"><?php echo esc_html($item['summary']); ?></p>
                        <?php endif; ?>
                        <form class="fni-upload is-secondary-enabled<?php echo $has_saved_main ? ' is-featured-saved' : ''; ?>" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data" data-fni-featured-saved="<?php echo $has_saved_main ? '1' : '0'; ?>" data-max-upload-bytes="<?php echo esc_attr((string) wp_max_upload_size()); ?>">
                            <?php wp_nonce_field('cph_upload_image_' . (int) $item['post_id']); ?>
                            <input type="hidden" name="action" value="cph_upload_image">
                            <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $item['post_id']); ?>">
                            <input type="hidden" name="redirect_to" value="<?php echo esc_url($this->current_needs_images_url()); ?>">
                            <textarea name="pasted_image_data" hidden></textarea>
                            <input type="hidden" name="pasted_image_name" value="">
                            <input type="hidden" name="pasted_image_debug" value="">
                            <textarea name="secondary_pasted_image_data" hidden></textarea>
                            <input type="hidden" name="secondary_pasted_image_name" value="">
                            <input type="hidden" name="secondary_pasted_image_debug" value="">
                            <input type="hidden" name="image_origin" value="human">
                            <input type="hidden" name="image_credit" value="">
                            <div class="fni-story-progress" aria-live="polite"></div>
                            <div class="fni-upload-row">
                                <span class="fni-auto-note fni-tooltip" tabindex="0" data-tooltip="WordPress will strip metadata, create the SEO filename, alt text, caption, and description from the article title and post text, then mark it ready for the slow publisher. The article stays a draft until the scheduled publisher runs.">
                                    Auto metadata
                                    <span class="dashicons dashicons-editor-help" aria-hidden="true"></span>
                                </span>
                                <span class="fni-meta">Saved image = ready draft, not public yet.</span>
                            </div>
                            <div class="fni-saved-files" aria-live="polite">
                                <p class="fni-saved-file-list fni-main-files"><strong>Main images</strong><span>No saved main images yet.</span></p>
                                <p class="fni-saved-file-list fni-story-files"><strong>Story images</strong><span>No saved Story images yet.</span></p>
                            </div>
                            <?php if ($managed_images) : ?>
                                <div class="fni-upload-row fni-managed-actions">
                                    <button type="button" class="fni-icon-action fni-delete-all-images fni-tooltip" data-tooltip="Delete every managed main and Story image from this post and start the card over." aria-label="Delete all images for this post" title="Delete all images">
                                        <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
                                        <span class="screen-reader-text">Delete all images</span>
                                    </button>
                                </div>
                            <?php endif; ?>
                            <div class="fni-media-shelf" aria-label="Saved images" aria-live="polite">
                                <?php foreach ($managed_images as $managed_image) : ?>
                                    <?php echo $this->managed_image_item_markup($managed_image); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                                <?php endforeach; ?>
                            </div>
                            <div class="fni-image-grid">
                                <div class="fni-image-slot fni-featured-slot">
                                    <span class="fni-image-label">Image collector <span class="fni-stack-count fni-main-count">1 of 1</span></span>
                                    <div class="fni-drop" tabindex="0">
                                        <span>Paste, drop, or choose an image. First image saves the featured/OG image.</span>
                                        <img class="fni-preview" alt="">
                                    </div>
                                    <div class="fni-upload-row">
                                        <input type="file" name="cph_image" accept="image/png,image/jpeg,image/webp">
                                        <button type="button" class="fni-icon-action fni-use-clipboard fni-tooltip" data-tooltip="Focus this card so you can paste the current clipboard image without a browser permission popup." aria-label="Focus card for paste" title="Focus card for paste">
                                            <i class="fa-regular fa-paste" aria-hidden="true"></i>
                                        </button>
                                        <button type="submit" class="fni-icon-action fni-save-button fni-primary-save fni-tooltip" data-tooltip="Save the image, strip metadata, and move this draft into the scheduled site-publish queue." aria-label="Save image and queue for publishing" title="Save image and queue for publishing">
                                            <i class="fa-regular fa-floppy-disk" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="fni-image-slot fni-story-slot">
                                    <span class="fni-image-label">Story portrait <span class="fni-stack-count fni-story-count">0 saved</span></span>
                                    <div class="fni-drop fni-secondary-drop" tabindex="0">
                                        <span>Story image preview appears here.</span>
                                        <img class="fni-preview fni-secondary-preview" alt="">
                                    </div>
                                    <div class="fni-upload-row">
                                        <label class="fni-alt-upload fni-tooltip" data-tooltip="Portrait image for Stories. It does not replace the featured/OG landscape image.">
                                            Story image file
                                            <input type="file" name="cph_secondary_image" accept="image/png,image/jpeg,image/webp">
                                        </label>
                                        <button type="button" class="fni-icon-action fni-use-secondary-clipboard fni-tooltip" data-tooltip="Focus the Story slot so you can paste the current clipboard image without a browser permission popup." aria-label="Focus Story slot for paste" title="Focus Story slot for paste">
                                            <i class="fa-regular fa-paste" aria-hidden="true"></i>
                                        </button>
                                        <button type="submit" class="fni-icon-action fni-save-button fni-save-both fni-tooltip" data-tooltip="Fallback save for the staged Story or extra image." aria-label="Save staged image" title="Save staged image">
                                            <i class="fa-regular fa-floppy-disk" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="fni-upload-row">
                                <label class="fni-alt-toggle fni-tooltip" data-tooltip="Turn this on when ChatGPT made a portrait Story image too. The landscape image stays featured/OG; the portrait image is saved for Stories.">
                                    <input type="checkbox" name="save_secondary_image" value="1" class="fni-secondary-toggle" checked>
                                    Multi-image collector
                                </label>
                            </div>
                        </form>
                        <details class="fni-details">
                            <summary>Show prompt text</summary>
                            <div class="fni-prompt-grid">
                                <div>
                                    <h3>ChatGPT Prompt</h3>
                                    <textarea id="<?php echo esc_attr($prompt_id); ?>" readonly onclick="this.select();"><?php echo esc_textarea($item['chatgpt_prompt']); ?></textarea>
                                </div>
                                <div>
                                    <h3>Story Prompt</h3>
                                    <textarea id="<?php echo esc_attr($story_id); ?>" readonly onclick="this.select();"><?php echo esc_textarea($item['story_image_prompt']); ?></textarea>
                                </div>
                            </div>
                        </details>
                    </section>
                <?php endforeach; ?>
            </div>
            <?php $this->render_needs_images_pagination($current_page, $total_pages, $category_filter, $search_filter); ?>
            <div class="fni-image-viewer" id="fni-image-viewer" aria-hidden="true" role="dialog" aria-label="Full-size image preview">
                <button type="button" class="fni-media-action fni-image-viewer-close" aria-label="Close image preview" title="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                <img alt="">
            </div>
            <script>
                (function () {
                    const search = document.getElementById('fni-search');
                    let cards = Array.from(document.querySelectorAll('.fni-card'));
                    const params = new URLSearchParams(window.location.search);
                    const countdown = document.getElementById('fni-lease-countdown');
                    const smartSearchOpen = document.getElementById('fni-smart-search-open');
                    const smartSearchClose = document.getElementById('fni-smart-search-close');
                    const smartSearchModal = document.getElementById('fni-search-modal');
                    const smartSearchForm = document.getElementById('fni-smart-search-form');
                    const smartSearchQuery = document.getElementById('fni-smart-search-query');
                    const smartSearchResults = document.getElementById('fni-smart-search-results');
                    const mainSearchInput = document.getElementById('fni-search-filter');
                    const searchSuggestions = document.getElementById('fni-search-suggestions');
                    const smartSearchNonce = '<?php echo esc_js(wp_create_nonce('cph_image_desk_search')); ?>';
                    const composeOpen = document.getElementById('fni-compose-open');
                    const composeClose = document.getElementById('fni-compose-close');
                    const composeCancel = document.getElementById('fni-compose-cancel');
                    const composeModal = document.getElementById('fni-compose-modal');
                    const composeForm = document.getElementById('fni-compose-form');
                    const composeSubmit = document.getElementById('fni-compose-submit');
                    const composeStatus = document.getElementById('fni-compose-status');
                    const composeTitle = document.getElementById('fni-compose-post-title');
                    const composeNonce = '<?php echo esc_js(wp_create_nonce('cph_create_image_draft')); ?>';
                    const runPaidApiNonce = '<?php echo esc_js(wp_create_nonce('cph_run_paid_image_api')); ?>';
                    const grabBatch = document.getElementById('fni-grab-batch');
                    const grabBatchNonce = '<?php echo esc_js(wp_create_nonce('cph_grab_image_batch')); ?>';
                    const startProcessing = document.getElementById('fni-start-processing');
                    const processingStatus = document.getElementById('fni-processing-status');
                    const processingFallback = document.getElementById('fni-processing-fallback');
                    const processingPrompt = document.getElementById('fni-processing-prompt');
                    const startProcessingNonce = '<?php echo esc_js(wp_create_nonce('cph_start_image_processing')); ?>';
                    const startProcessingLabel = 'Copy all missing-media prompt';
                    const managedImageNonce = '<?php echo esc_js(wp_create_nonce('cph_manage_image')); ?>';
                    const imageViewer = document.getElementById('fni-image-viewer');
                    const sessionGoal = <?php echo esc_js((string) self::IMAGE_SESSION_GOAL); ?>;
                    let searchSuggestTimer = 0;
                    let searchSuggestAbort = null;

                    const readJsonResponse = async (response, fallbackMessage) => {
                        const body = await response.text();
                        try {
                            return JSON.parse(body);
                        } catch (error) {
                            if (response.status === 413) {
                                throw new Error('That image is larger than the server upload limit. Try a smaller image or JPG/WebP.');
                            }
                            if (response.status === 401 || response.status === 403 || /<!doctype|<html/i.test(body)) {
                                throw new Error('WordPress returned a login or server page instead of JSON. Refresh Image Desk and try again.');
                            }
                            throw new Error(fallbackMessage || 'The server returned an invalid response.');
                        }
                    };

                    const fetchJsonWithRetry = async (url, options, fallbackMessage, attempts = 2) => {
                        let response;
                        for (let attempt = 0; attempt < attempts; attempt += 1) {
                            response = await fetch(url, options);
                            if (![502, 503, 504].includes(response.status) || attempt === attempts - 1) {
                                return readJsonResponse(response, fallbackMessage);
                            }
                            await new Promise((resolve) => window.setTimeout(resolve, 1200));
                        }
                        return readJsonResponse(response, fallbackMessage);
                    };

                    const copyProcessingRequest = async (value) => {
                        if (processingPrompt) {
                            processingPrompt.value = value;
                        }
                        if (processingFallback) {
                            processingFallback.hidden = false;
                        }
                        try {
                            if (navigator.clipboard?.writeText) {
                                await navigator.clipboard.writeText(value);
                                return;
                            }
                        } catch (error) {
                            // Safari can expose the Clipboard API while rejecting it in wp-admin.
                            // Keep the click's user gesture and fall through to the legacy copy path.
                        }
                        const textarea = document.createElement('textarea');
                        textarea.value = value;
                        textarea.setAttribute('readonly', 'readonly');
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        textarea.style.pointerEvents = 'none';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        textarea.setSelectionRange(0, textarea.value.length);
                        const copied = document.execCommand('copy');
                        textarea.remove();
                        if (!copied) {
                            processingPrompt?.focus();
                            processingPrompt?.select();
                            throw new Error('Safari could not copy automatically. The full site-specific batch prompt is selected below; press Command-C.');
                        }
                    };

                    startProcessing?.addEventListener('click', async () => {
                        if (startProcessing.disabled) {
                            return;
                        }
                        startProcessing.disabled = true;
                        startProcessing.textContent = 'Building priority batch...';
                        processingStatus.textContent = 'Finding the highest-priority missing and redo roles.';
                        const formData = new FormData();
                        formData.set('action', 'cph_start_image_processing');
                        formData.set('nonce', startProcessingNonce);
                        formData.set('category', '<?php echo esc_js($category_filter); ?>');
                        formData.set('search', '<?php echo esc_js($search_filter); ?>');
                        try {
                            const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            });
                            const payload = await readJsonResponse(response, 'Could not start image processing.');
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Could not start image processing.');
                            }
                            if (!payload.data.codex_request) {
                                processingStatus.textContent = payload.data.message || 'No image roles are waiting in this batch.';
                                showNotice(processingStatus.textContent, 'success');
                                return;
                            }
                            await copyProcessingRequest(payload.data.codex_request);
                            processingStatus.textContent = payload.data.message || 'Processing request copied for Codex.';
                            startProcessing.textContent = 'Request copied - paste into Codex';
                            showNotice(processingStatus.textContent, 'success');
                            window.setTimeout(() => {
                                startProcessing.textContent = startProcessingLabel;
                            }, 2400);
                        } catch (error) {
                            processingStatus.textContent = error.message || 'Could not start image processing.';
                            showNotice(processingStatus.textContent, 'error');
                        } finally {
                            startProcessing.disabled = false;
                            if (startProcessing.textContent === 'Building priority batch...') {
                                startProcessing.textContent = startProcessingLabel;
                            }
                        }
                    });

                    grabBatch?.addEventListener('click', async () => {
                        if (grabBatch.disabled) {
                            return;
                        }
                        grabBatch.disabled = true;
                        grabBatch.setAttribute('aria-label', 'Grabbing more image jobs');
                        const formData = new FormData();
                        formData.set('action', 'cph_grab_image_batch');
                        formData.set('nonce', grabBatchNonce);
                        try {
                            const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            });
                            const payload = await readJsonResponse(response, 'Could not grab more image jobs.');
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Could not grab more image jobs.');
                            }
                            showNotice(payload.data.message || 'More image jobs reserved.', 'success');
                            window.location.href = '<?php echo esc_js(admin_url('admin.php?page=creator-needs-images')); ?>';
                        } catch (error) {
                            showNotice(error.message || 'Could not grab more image jobs.', 'error', {
                                report: codexReportFromCard({
                                    message: error.message || 'Could not grab more image jobs.',
                                    action: 'Reserve more image jobs'
                                })
                            });
                            grabBatch.disabled = false;
                            grabBatch.setAttribute('aria-label', 'Grab more image jobs');
                        }
                    });

                    const pastedImageFile = (dataUrl, fileName, maxUploadBytes = 0) => new Promise((resolve, reject) => {
                        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                            resolve(null);
                            return;
                        }
                        const image = new Image();
                        image.onload = () => {
                            const limitBytes = Number(maxUploadBytes || 0);
                            const requestedDimensions = [2048, 1920, 1800, 1600, 1440, 1280, 1152, 1024, 896, 768, 640];
                            const requestedQualities = [0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.46];
                            const stem = (fileName || 'clipboard-image').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-');

                            const tryEncode = (stepIndex) => {
                                if (stepIndex >= requestedDimensions.length * requestedQualities.length) {
                                    reject(new Error('That pasted image is still too large after compression. Save/export a smaller image and use Choose File.'));
                                    return;
                                }

                                const dimension = requestedDimensions[Math.floor(stepIndex / requestedQualities.length)];
                                const quality = requestedQualities[stepIndex % requestedQualities.length];
                                const scale = Math.min(1, dimension / Math.max(image.naturalWidth, image.naturalHeight));
                                const canvas = document.createElement('canvas');
                                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                                const context = canvas.getContext('2d');
                                if (!context) {
                                    reject(new Error('The pasted image could not be prepared for upload.'));
                                    return;
                                }
                                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                                canvas.toBlob((blob) => {
                                    if (!blob) {
                                        reject(new Error('The pasted image could not be prepared for upload.'));
                                        return;
                                    }
                                    if (limitBytes > 0 && blob.size > limitBytes) {
                                        tryEncode(stepIndex + 1);
                                        return;
                                    }
                                    resolve(new File([blob], stem + '.webp', { type: 'image/webp' }));
                                }, 'image/webp', quality);
                            };

                            tryEncode(0);
                        };
                        image.onerror = () => reject(new Error('The pasted image could not be read.'));
                        image.src = dataUrl;
                    });

                    const preparePastedFiles = async (formData, form) => {
                        const maxUploadBytes = Number(form?.dataset?.maxUploadBytes || 0);
                        const primaryData = form.querySelector('[name="pasted_image_data"]')?.value || '';
                        const secondaryData = form.querySelector('[name="secondary_pasted_image_data"]')?.value || '';
                        if (primaryData.startsWith('data:image/')) {
                            const primaryFile = await pastedImageFile(primaryData, form.querySelector('[name="pasted_image_name"]')?.value || 'clipboard-image', maxUploadBytes);
                            if (primaryFile) {
                                formData.set('cph_image', primaryFile, primaryFile.name);
                                formData.delete('pasted_image_data');
                            }
                        }
                        if (secondaryData.startsWith('data:image/')) {
                            const secondaryFile = await pastedImageFile(secondaryData, form.querySelector('[name="secondary_pasted_image_name"]')?.value || 'story-image', maxUploadBytes);
                            if (secondaryFile) {
                                formData.set('cph_secondary_image', secondaryFile, secondaryFile.name);
                                formData.delete('secondary_pasted_image_data');
                            }
                        }
                    };

                    if (params.get('fni_uploaded') === '1') {
                        recordSessionDone();
                    }

                    let noticeDismissTimer = 0;

                    const dismissNotice = (notice) => {
                        if (!notice) {
                            return;
                        }
                        notice.classList.add('is-hiding');
                        window.setTimeout(() => notice.remove(), 240);
                    };

                    const topLevelNotices = () => {
                        const wrap = document.querySelector('.creator-needs-images');
                        if (!wrap) {
                            return [];
                        }
                        return Array.from(wrap.children).filter((child) => child.classList?.contains('notice'));
                    };

                    const scheduleNoticeDismiss = (notice) => {
                        if (!notice || !notice.classList.contains('notice-success')) {
                            return;
                        }
                        window.clearTimeout(noticeDismissTimer);
                        noticeDismissTimer = window.setTimeout(() => dismissNotice(notice), 6500);
                    };

                    const compactNotices = () => {
                        const notices = topLevelNotices();
                        const successNotices = notices.filter((notice) => notice.classList.contains('notice-success'));
                        successNotices.slice(0, -1).forEach((notice) => notice.remove());
                        scheduleNoticeDismiss(successNotices.at(-1));
                    };

                    const copyText = async (value) => {
                        if (!value) {
                            return false;
                        }
                        try {
                            await navigator.clipboard.writeText(value);
                            return true;
                        } catch (error) {
                            const scratch = document.createElement('textarea');
                            scratch.value = value;
                            scratch.setAttribute('readonly', 'readonly');
                            scratch.style.position = 'fixed';
                            scratch.style.left = '-9999px';
                            document.body.appendChild(scratch);
                            scratch.select();
                            document.execCommand('copy');
                            scratch.remove();
                            return false;
                        }
                    };

                    const codexReportFromCard = ({ message, action, card = null, extra = [] } = {}) => {
                        const lines = [
                            'Creator Publishing Hub error report',
                            'Site: <?php echo esc_js(get_bloginfo('name')); ?>',
                            'Admin page: ' + window.location.href,
                            'User: <?php echo esc_js(wp_get_current_user()->user_login ?: 'unknown'); ?>',
                            'Time: ' + new Date().toLocaleString(),
                            'Action: ' + (action || 'Image Desk'),
                            'Error: ' + (message || 'Unknown error')
                        ];

                        if (Array.isArray(extra)) {
                            extra.filter(Boolean).forEach((line) => {
                                lines.push(String(line));
                            });
                        }

                        const diagnostic = card?.querySelector('.fni-diagnostic-copy')?.dataset?.diagnostic || '';
                        if (diagnostic) {
                            lines.push('', diagnostic);
                        }

                        return lines.join("\n");
                    };

                    const showNotice = (message, type, options = {}) => {
                        const wrap = document.querySelector('.creator-needs-images');
                        if (!wrap) {
                            return;
                        }
                        const normalizedType = type || 'success';
                        if (normalizedType === 'success') {
                            topLevelNotices()
                                .filter((existing) => existing.classList.contains('notice-success'))
                                .forEach((existing) => existing.remove());
                        }
                        const notice = document.createElement('div');
                        notice.className = 'notice notice-' + normalizedType + ' is-dismissible fni-status-notice';
                        const paragraph = document.createElement('p');
                        paragraph.textContent = message;
                        notice.appendChild(paragraph);
                        if (normalizedType === 'error' && options.report) {
                            const actions = document.createElement('p');
                            actions.className = 'fni-status-actions';

                            const copyButton = document.createElement('button');
                            copyButton.type = 'button';
                            copyButton.className = 'button button-secondary button-small';
                            copyButton.textContent = 'Copy Codex report';
                            copyButton.addEventListener('click', async () => {
                                await copyText(options.report);
                                copyButton.textContent = 'Copied';
                                window.setTimeout(() => {
                                    copyButton.textContent = 'Copy Codex report';
                                }, 1200);
                            });
                            actions.appendChild(copyButton);

                            const details = document.createElement('details');
                            details.className = 'fni-status-report';
                            const summary = document.createElement('summary');
                            summary.textContent = 'Show report';
                            const pre = document.createElement('pre');
                            pre.textContent = options.report;
                            details.append(summary, pre);
                            notice.append(actions, details);
                        }
                        const heading = wrap.querySelector('h1');
                        if (heading && heading.nextSibling) {
                            wrap.insertBefore(notice, heading.nextSibling);
                        } else {
                            wrap.prepend(notice);
                        }
                        scheduleNoticeDismiss(notice);
                    };

                    compactNotices();

                    function recordSessionDone() {
                        const done = Number.parseInt(sessionStorage.getItem('cphImagesDoneThisLease') || '0', 10) + 1;
                        sessionStorage.setItem('cphImagesDoneThisLease', String(done));
                        if (done >= sessionGoal && sessionStorage.getItem('cphSessionGoalShown') !== String(sessionGoal)) {
                            sessionStorage.setItem('cphSessionGoalShown', String(sessionGoal));
                            alert('Great work. You finished ' + done + ' cards this session. That is a strong batch.');
                        }

                        return done;
                    }

                    const updateCountdown = () => {
                        if (!countdown) {
                            return;
                        }

                        const expires = Number.parseInt(countdown.dataset.expires || '0', 10) * 1000;
                        const remaining = Math.max(0, expires - Date.now());
                        const minutes = Math.floor(remaining / 60000);
                        const seconds = Math.floor((remaining % 60000) / 1000);
                        countdown.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

                        if (remaining <= 0 && sessionStorage.getItem('cphLeaseExpiredShown') !== String(expires)) {
                            sessionStorage.setItem('cphLeaseExpiredShown', String(expires));
                            const done = Number.parseInt(sessionStorage.getItem('cphImagesDoneThisLease') || '0', 10);
                            alert('This image batch lease expired. You saved ' + done + ' image' + (done === 1 ? '' : 's') + ' in this session. Refresh the queue to get a new batch.');
                            sessionStorage.setItem('cphImagesDoneThisLease', '0');
                        }
                    };

                    if (countdown) {
                        updateCountdown();
                        window.setInterval(updateCountdown, 1000);
                    }

                    const setSmartSearchOpen = (open) => {
                        if (!smartSearchModal) {
                            return;
                        }

                        smartSearchModal.classList.toggle('is-open', open);
                        smartSearchModal.setAttribute('aria-hidden', open ? 'false' : 'true');
                        if (open) {
                            const existingSearch = document.getElementById('fni-search-filter');
                            if (smartSearchQuery && existingSearch && existingSearch.value.trim() !== '') {
                                smartSearchQuery.value = existingSearch.value.trim();
                            }
                            setTimeout(() => smartSearchQuery?.focus(), 20);
                        }
                    };

                    const resultMeta = (item) => {
                        return [
                            'Post #' + item.post_id,
                            item.status,
                            item.category,
                            item.state
                        ].filter(Boolean).join(' · ');
                    };

                    const setExternalLink = (link) => {
                        link.target = '_blank';
                        link.rel = 'noopener';
                    };

                    const renderSearchResults = (container, items, compact = false) => {
                        if (!container) {
                            return;
                        }

                        container.replaceChildren();
                        if (!items || !items.length) {
                            const empty = document.createElement('p');
                            empty.textContent = 'No matching posts found.';
                            container.appendChild(empty);
                            return;
                        }

                        items.forEach((item) => {
                            const result = document.createElement('article');
                            result.className = 'fni-search-result';

                            const title = document.createElement('h3');
                            const titleLink = document.createElement('a');
                            titleLink.href = item.edit_url || item.action_url || '#';
                            titleLink.textContent = item.title || ('Post #' + item.post_id);
                            if (compact) {
                                setExternalLink(titleLink);
                            }
                            title.appendChild(titleLink);

                            const meta = document.createElement('p');
                            meta.className = 'fni-meta';
                            meta.textContent = resultMeta(item);

                            const summary = document.createElement('p');
                            summary.textContent = item.summary || '';

                            const actions = document.createElement('div');
                            actions.className = 'fni-search-result-actions';

                            const actionLink = document.createElement('a');
                            actionLink.className = 'button button-primary';
                            actionLink.href = item.action_url || item.edit_url || '#';
                            actionLink.textContent = item.action_label || 'Open';
                            if (compact) {
                                setExternalLink(actionLink);
                            }
                            actions.appendChild(actionLink);

                            if (item.edit_url) {
                                const editLink = document.createElement('a');
                                editLink.href = item.edit_url;
                                editLink.textContent = 'Edit post';
                                if (compact) {
                                    setExternalLink(editLink);
                                }
                                actions.appendChild(editLink);
                            }

                            if (item.permalink) {
                                const viewLink = document.createElement('a');
                                viewLink.href = item.permalink;
                                viewLink.textContent = 'View article';
                                setExternalLink(viewLink);
                                actions.appendChild(viewLink);
                            }

                            result.append(title, meta);
                            if (item.summary && !compact) {
                                result.appendChild(summary);
                            } else if (item.summary) {
                                const smallSummary = document.createElement('p');
                                smallSummary.textContent = item.summary;
                                result.appendChild(smallSummary);
                            }
                            result.appendChild(actions);
                            container.appendChild(result);
                        });
                    };

                    const renderSmartSearchResults = (items) => renderSearchResults(smartSearchResults, items, false);

                    const openSearchSuggestions = () => {
                        searchSuggestions?.classList.add('is-open');
                    };

                    const closeSearchSuggestions = () => {
                        searchSuggestions?.classList.remove('is-open');
                    };

                    const runSearchSuggestion = async (query) => {
                        if (!searchSuggestions) {
                            return;
                        }
                        if (searchSuggestAbort) {
                            searchSuggestAbort.abort();
                        }
                        searchSuggestAbort = new AbortController();
                        const formData = new FormData();
                        formData.set('action', 'cph_image_desk_search');
                        formData.set('nonce', smartSearchNonce);
                        formData.set('mode', /^\d+$/.test(query) ? 'post_id' : 'everything');
                        formData.set('query', query);
                        searchSuggestions.textContent = 'Searching...';
                        openSearchSuggestions();

                        try {
                            const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin',
                                signal: searchSuggestAbort.signal
                            });
                            const payload = await readJsonResponse(response, 'Search failed.');
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Search failed.');
                            }
                            renderSearchResults(searchSuggestions, payload.data.items || [], true);
                        } catch (error) {
                            if (error.name === 'AbortError') {
                                return;
                            }
                            searchSuggestions.textContent = error.message || 'Search failed.';
                            openSearchSuggestions();
                        }
                    };

                    smartSearchOpen?.addEventListener('click', () => setSmartSearchOpen(true));
                    smartSearchClose?.addEventListener('click', () => setSmartSearchOpen(false));
                    smartSearchModal?.addEventListener('click', (event) => {
                        if (event.target === smartSearchModal) {
                            setSmartSearchOpen(false);
                        }
                    });
                    document.addEventListener('keydown', (event) => {
                        if (event.key === 'Escape' && smartSearchModal?.classList.contains('is-open')) {
                            setSmartSearchOpen(false);
                        }
                    });
                    smartSearchForm?.addEventListener('submit', async (event) => {
                        event.preventDefault();
                        if (!smartSearchQuery || !smartSearchResults) {
                            return;
                        }

                        const query = smartSearchQuery.value.trim();
                        const mode = smartSearchForm.querySelector('input[name="mode"]:checked')?.value || 'everything';
                        smartSearchResults.textContent = 'Searching...';

                        const formData = new FormData();
                        formData.set('action', 'cph_image_desk_search');
                        formData.set('nonce', smartSearchNonce);
                        formData.set('mode', mode);
                        formData.set('query', query);

                        try {
                            const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            });
                            const payload = await readJsonResponse(response, 'Search failed.');
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Search failed.');
                            }
                            renderSmartSearchResults(payload.data.items || []);
                        } catch (error) {
                            smartSearchResults.textContent = error.message || 'Search failed.';
                        }
                    });

                    mainSearchInput?.addEventListener('input', () => {
                        const query = mainSearchInput.value.trim();
                        window.clearTimeout(searchSuggestTimer);
                        if (query.length < 2) {
                            closeSearchSuggestions();
                            return;
                        }
                        searchSuggestTimer = window.setTimeout(() => runSearchSuggestion(query), 250);
                    });
                    mainSearchInput?.addEventListener('focus', () => {
                        if (searchSuggestions?.children.length && mainSearchInput.value.trim().length >= 2) {
                            openSearchSuggestions();
                        }
                    });
                    document.addEventListener('click', (event) => {
                        if (!(event.target instanceof HTMLElement)) {
                            return;
                        }
                        if (!event.target.closest('.fni-filter')) {
                            closeSearchSuggestions();
                        }
                    });

                    const setComposeOpen = (open) => {
                        composeModal?.classList.toggle('is-open', open);
                        composeModal?.setAttribute('aria-hidden', open ? 'false' : 'true');
                        if (open) {
                            window.setTimeout(() => composeTitle?.focus(), 0);
                        }
                    };

                    composeOpen?.addEventListener('click', () => setComposeOpen(true));
                    composeClose?.addEventListener('click', () => setComposeOpen(false));
                    composeCancel?.addEventListener('click', () => setComposeOpen(false));
                    composeModal?.addEventListener('click', (event) => {
                        if (event.target === composeModal) {
                            setComposeOpen(false);
                        }
                    });
                    document.addEventListener('keydown', (event) => {
                        if (event.key === 'Escape' && composeModal?.classList.contains('is-open')) {
                            setComposeOpen(false);
                        }
                    });
                    composeForm?.addEventListener('submit', async (event) => {
                        event.preventDefault();
                        if (!composeSubmit || !composeStatus) {
                            return;
                        }

                        composeSubmit.disabled = true;
                        composeSubmit.textContent = 'Creating...';
                        composeStatus.textContent = 'Checking for duplicates...';
                        const formData = new FormData(composeForm);
                        formData.set('action', 'cph_create_image_draft');
                        formData.set('nonce', composeNonce);

                        try {
                            const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            });
                            const payload = await readJsonResponse(response, 'The draft could not be created.');
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Could not create the draft.');
                            }
                            composeStatus.textContent = 'Draft created. Opening its image card...';
                            window.location.assign(payload.data.desk_url);
                        } catch (error) {
                            composeStatus.textContent = error.message || 'Could not create the draft.';
                            showNotice(error.message || 'Could not create the draft.', 'error', {
                                report: codexReportFromCard({
                                    message: error.message || 'Could not create the draft.',
                                    action: 'Create new image-ready story',
                                    extra: [
                                        'Draft title: ' + (composeTitle?.value || ''),
                                        'Category: ' + (composeForm?.querySelector('[name=\"category_id\"]')?.value || '')
                                    ]
                                })
                            });
                            composeSubmit.disabled = false;
                            composeSubmit.textContent = 'Create image draft';
                        }
                    });

                    const copyPromptTarget = async (target) => {
                        if (!target) {
                            return false;
                        }

                        target.select();
                        try {
                            await navigator.clipboard.writeText(target.value);
                            return true;
                        } catch (error) {
                            document.execCommand('copy');
                            return false;
                        }
                    };

                    const markCopiedButton = (button) => {
                        if (!button) {
                            return;
                        }
                        const originalLabel = button.getAttribute('aria-label') || '';
                        const originalTitle = button.getAttribute('title') || originalLabel;
                        button.classList.add('is-copied');
                        button.setAttribute('aria-label', 'Copied');
                        button.setAttribute('title', 'Copied');
                        setTimeout(() => {
                            button.classList.remove('is-copied');
                            button.setAttribute('aria-label', originalLabel);
                            button.setAttribute('title', originalTitle);
                        }, 1200);
                    };

                    document.querySelectorAll('.fni-copy').forEach((button) => {
                        button.addEventListener('click', async () => {
                            const target = document.getElementById(button.dataset.copyTarget);
                            if (!target) {
                                return;
                            }

                            await copyPromptTarget(target);
                            markCopiedButton(button);
                        });
                    });

                    document.querySelectorAll('.fni-diagnostic-copy').forEach((button) => {
                        button.addEventListener('click', async () => {
                            const diagnostic = button.dataset.diagnostic || '';
                            if (!diagnostic) {
                                return;
                            }

                            await copyText(diagnostic);
                            markCopiedButton(button);
                            showNotice('Post diagnosis copied.', 'success');
                        });
                    });

                    const closeImageViewer = () => {
                        if (!imageViewer) {
                            return;
                        }
                        imageViewer.classList.remove('is-open');
                        imageViewer.setAttribute('aria-hidden', 'true');
                        imageViewer.querySelector('img')?.removeAttribute('src');
                    };
                    const openImageViewer = (url, alt = '') => {
                        if (!imageViewer || !url) {
                            return;
                        }
                        const image = imageViewer.querySelector('img');
                        if (image) {
                            image.src = url;
                            image.alt = alt;
                        }
                        imageViewer.classList.add('is-open');
                        imageViewer.setAttribute('aria-hidden', 'false');
                        imageViewer.querySelector('.fni-image-viewer-close')?.focus();
                    };
                    imageViewer?.addEventListener('click', (event) => {
                        if (event.target === imageViewer || event.target.closest('.fni-image-viewer-close')) {
                            closeImageViewer();
                        }
                    });
                    document.addEventListener('keydown', (event) => {
                        if (event.key === 'Escape' && imageViewer?.classList.contains('is-open')) {
                            closeImageViewer();
                        }
                    });

                    const buildManagedImage = (item) => {
                        const media = document.createElement('article');
                        media.className = 'fni-media-item';
                        media.dataset.attachmentId = String(item.attachment_id || '');
                        media.dataset.kind = item.kind || 'main';

                        const kind = document.createElement('span');
                        kind.className = 'fni-media-kind';
                        kind.textContent = item.label || (item.kind === 'story' ? 'Story' : 'Main');

                        const thumb = document.createElement('div');
                        thumb.className = 'fni-media-thumb';
                        const image = document.createElement('img');
                        image.src = item.thumbnail_url || item.full_url || '';
                        image.alt = item.alt || '';
                        image.loading = 'lazy';
                        image.decoding = 'async';
                        thumb.appendChild(image);

                        const meta = document.createElement('div');
                        meta.className = 'fni-media-meta';
                        const name = document.createElement('span');
                        name.className = 'fni-media-name';
                        name.textContent = item.filename || ('Image #' + String(item.attachment_id || ''));
                        name.title = name.textContent;

                        const view = document.createElement('button');
                        view.type = 'button';
                        view.className = 'fni-media-action fni-media-view';
                        view.dataset.fullUrl = item.full_url || '';
                        view.title = 'View full size';
                        view.setAttribute('aria-label', 'View ' + name.textContent + ' full size');
                        view.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i>';

                        const remove = document.createElement('button');
                        remove.type = 'button';
                        remove.className = 'fni-media-action fni-media-delete';
                        remove.title = 'Delete from post and Media Library';
                        remove.setAttribute('aria-label', 'Delete ' + name.textContent);
                        remove.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';

                        meta.append(name, view, remove);
                        media.append(kind, thumb, meta);
                        return media;
                    };
                    const syncManagedImageState = (form, items) => {
                        if (!form || !Array.isArray(items)) {
                            return;
                        }
                        const card = form.closest('.fni-card');
                        const mainTotal = items.filter((item) => item.kind === 'main').length;
                        const storyTotal = items.filter((item) => item.kind === 'story').length;
                        const hasMain = mainTotal > 0;
                        form.dataset.fniFeaturedSaved = hasMain ? '1' : '0';
                        form.classList.toggle('is-featured-saved', hasMain);
                        card?.classList.toggle('is-image-collector-ready', hasMain);
                        const mainCount = form.querySelector('.fni-main-count');
                        const storyCount = form.querySelector('.fni-story-count');
                        if (mainCount) {
                            mainCount.textContent = mainTotal ? '1 of ' + String(mainTotal) : '0 saved';
                        }
                        if (storyCount) {
                            storyCount.textContent = storyTotal === 1 ? '1 saved' : String(storyTotal) + ' saved';
                        }
                        const progress = form.querySelector('.fni-story-progress');
                        const primaryDrop = form.querySelector('.fni-featured-slot .fni-drop span');
                        const storyDrop = form.querySelector('.fni-secondary-drop span');
                        if (hasMain) {
                            if (progress) {
                                progress.textContent = 'Saved images are shown below. Keep pasting, inspect with the eye, delete mistakes with the trash can, or close this card when done.';
                            }
                            if (primaryDrop) {
                                primaryDrop.textContent = 'Paste another image here. Landscape saves as main; portrait saves for Stories/Reels/Shorts.';
                            }
                            if (storyDrop) {
                                storyDrop.textContent = 'Paste another Story image here.';
                            }
                        } else {
                            if (progress) {
                                progress.textContent = items.length ? 'Story images are saved, but a featured landscape image is still needed.' : 'All images deleted. Paste the landscape featured/OG image first.';
                            }
                            if (primaryDrop) {
                                primaryDrop.textContent = 'Paste, drop, or choose an image. First landscape image saves the featured/OG image.';
                            }
                            if (storyDrop) {
                                storyDrop.textContent = storyTotal ? 'Story image saved. Add the featured landscape image next.' : 'Story image preview appears here.';
                            }
                        }
                    };
                    const renderManagedImages = (form, items) => {
                        const shelf = form?.querySelector('.fni-media-shelf');
                        if (!shelf || !Array.isArray(items)) {
                            return;
                        }
                        shelf.replaceChildren(...items.filter((item) => item?.attachment_id && item?.full_url).map(buildManagedImage));
                        syncManagedImageState(form, items);
                    };

                    document.addEventListener('click', async (event) => {
                        const view = event.target.closest('.fni-media-view');
                        if (view) {
                            const item = view.closest('.fni-media-item');
                            openImageViewer(view.dataset.fullUrl || '', item?.querySelector('img')?.alt || '');
                            return;
                        }

                        const deleteAll = event.target.closest('.fni-delete-all-images');
                        if (deleteAll) {
                            const card = deleteAll.closest('.fni-card');
                            const form = deleteAll.closest('.fni-upload');
                            const postId = card?.dataset.postId || form?.querySelector('[name="post_id"]')?.value || '';
                            if (!postId || !window.confirm('Delete every managed image from this post and the Media Library?')) {
                                return;
                            }
                            deleteAll.disabled = true;
                            const data = new FormData();
                            data.set('action', 'cph_delete_all_managed_images_ajax');
                            data.set('nonce', managedImageNonce);
                            data.set('post_id', postId);
                            try {
                                const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                    method: 'POST',
                                    body: data,
                                    credentials: 'same-origin'
                                });
                                const payload = await readJsonResponse(response, 'Image reset failed.');
                                if (!payload?.success) {
                                    throw new Error(payload?.data?.message || 'Image reset failed.');
                                }
                                renderManagedImages(form, payload.data.managed_images || []);
                                showNotice(payload.data.message || 'All images deleted. Paste the featured image again.', 'success');
                            } catch (error) {
                                deleteAll.disabled = false;
                                showNotice(error.message || 'Image reset failed.', 'error', {
                                    report: codexReportFromCard({
                                        message: error.message || 'Image reset failed.',
                                        action: 'Delete all images from card',
                                        card: form.closest('.fni-card')
                                    })
                                });
                            }
                            return;
                        }

                        const remove = event.target.closest('.fni-media-delete');
                        if (!remove) {
                            return;
                        }
                        const item = remove.closest('.fni-media-item');
                        const card = remove.closest('.fni-card');
                        const form = remove.closest('.fni-upload');
                        const attachmentId = item?.dataset.attachmentId || '';
                        const postId = card?.dataset.postId || form?.querySelector('[name="post_id"]')?.value || '';
                        if (!attachmentId || !postId || !window.confirm('Delete this image from the post and Media Library?')) {
                            return;
                        }

                        remove.disabled = true;
                        const data = new FormData();
                        data.set('action', 'cph_delete_managed_image_ajax');
                        data.set('nonce', managedImageNonce);
                        data.set('post_id', postId);
                        data.set('attachment_id', attachmentId);
                        try {
                            const response = await fetch(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: data,
                                credentials: 'same-origin'
                            });
                            const payload = await readJsonResponse(response, 'Image deletion failed.');
                            if (!payload?.success) {
                                throw new Error(payload?.data?.message || 'Image deletion failed.');
                            }
                            renderManagedImages(form, payload.data.managed_images || []);
                            showNotice(payload.data.message || 'Image deleted.', 'success');
                        } catch (error) {
                            remove.disabled = false;
                            showNotice(error.message || 'Image deletion failed.', 'error', {
                                report: codexReportFromCard({
                                    message: error.message || 'Image deletion failed.',
                                    action: 'Delete one saved image',
                                    card,
                                    extra: ['Attachment ID: ' + String(attachmentId || '')]
                                })
                            });
                        }
                    });
                    let imageViewerHoverTimer = 0;
                    document.addEventListener('pointerover', (event) => {
                        const view = event.target.closest('.fni-media-view');
                        if (!view || event.pointerType === 'touch') {
                            return;
                        }
                        window.clearTimeout(imageViewerHoverTimer);
                        imageViewerHoverTimer = window.setTimeout(() => {
                            const item = view.closest('.fni-media-item');
                            openImageViewer(view.dataset.fullUrl || '', item?.querySelector('img')?.alt || '');
                        }, 600);
                    });
                    document.addEventListener('pointerout', (event) => {
                        if (event.target.closest('.fni-media-view')) {
                            window.clearTimeout(imageViewerHoverTimer);
                        }
                    });

                    document.querySelectorAll('.fni-upload').forEach((form) => {
                        const drop = form.querySelector('.fni-drop');
                        const input = form.querySelector('input[type="file"]');
                        const preview = form.querySelector('.fni-preview');
                        const pastedData = form.querySelector('[name="pasted_image_data"]');
                        const pastedName = form.querySelector('input[name="pasted_image_name"]');
                        const pastedDebug = form.querySelector('input[name="pasted_image_debug"]');
                        const secondaryDrop = form.querySelector('.fni-secondary-drop');
                        const secondaryInput = form.querySelector('input[name="cph_secondary_image"]');
                        const secondaryPreview = form.querySelector('.fni-secondary-preview');
                        const secondaryPastedData = form.querySelector('[name="secondary_pasted_image_data"]');
                        const secondaryPastedName = form.querySelector('input[name="secondary_pasted_image_name"]');
                        const secondaryPastedDebug = form.querySelector('input[name="secondary_pasted_image_debug"]');
                        const submitButtons = Array.from(form.querySelectorAll('button[type="submit"]'));
                        const clipboardButton = form.querySelector('.fni-use-clipboard');
                        const secondaryClipboardButton = form.querySelector('.fni-use-secondary-clipboard');
                        const card = form.closest('.fni-card');
                        const storyProgress = form.querySelector('.fni-story-progress');
                        const closeStoryButton = card?.querySelector('.fni-close-story');
                        const mainCount = form.querySelector('.fni-main-count');
                        const storyCount = form.querySelector('.fni-story-count');
                        const mainFiles = form.querySelector('.fni-main-files');
                        const storyFiles = form.querySelector('.fni-story-files');
                        let pendingRead = Promise.resolve(false);
                        let secondaryPendingRead = Promise.resolve(false);
                        const existingManagedImages = Array.from(form.querySelectorAll('.fni-media-item'));
                        let extraMainImagesSaved = Math.max(0, existingManagedImages.filter((item) => item.dataset.kind === 'main').length - 1);
                        let storyImagesSaved = existingManagedImages.filter((item) => item.dataset.kind === 'story').length;

                        const setStoryProgress = (message) => {
                            if (storyProgress) {
                                storyProgress.textContent = message;
                            }
                        };

                        if (form.dataset.fniFeaturedSaved === '1') {
                            drop.querySelector('span').textContent = 'Paste another image here. Landscape saves as main; portrait saves for Stories/Reels/Shorts.';
                            secondaryDrop?.querySelector('span')?.replaceChildren(document.createTextNode('Paste another Story image here.'));
                            setStoryProgress('Saved images are shown below. Keep pasting, inspect with the eye, delete mistakes with the trash can, or close this card when done.');
                        }

                        const updateImageCounts = () => {
                            if (mainCount) {
                                mainCount.textContent = '1 of ' + String(1 + extraMainImagesSaved);
                            }
                            if (storyCount) {
                                storyCount.textContent = storyImagesSaved === 1 ? '1 saved' : String(storyImagesSaved) + ' saved';
                            }
                        };

                        const appendSavedFile = (list, text) => {
                            if (!list || !text) {
                                return;
                            }
                            if (list.querySelector('span')?.textContent?.startsWith('No saved')) {
                                list.querySelector('span')?.remove();
                            }
                            const item = document.createElement('span');
                            item.textContent = text;
                            list.appendChild(item);
                        };

                        const clearPrimaryImageInput = () => {
                            if (pastedData) {
                                pastedData.value = '';
                            }
                            if (pastedName) {
                                pastedName.value = '';
                            }
                            if (pastedDebug) {
                                pastedDebug.value = '';
                            }
                            try {
                                input.value = '';
                            } catch (error) {}
                            preview.removeAttribute('src');
                        };

                        const clearSecondaryImageInput = () => {
                            if (secondaryPastedData) {
                                secondaryPastedData.value = '';
                            }
                            if (secondaryPastedName) {
                                secondaryPastedName.value = '';
                            }
                            if (secondaryPastedDebug) {
                                secondaryPastedDebug.value = '';
                            }
                            try {
                                if (secondaryInput) {
                                    secondaryInput.value = '';
                                }
                            } catch (error) {}
                            secondaryPreview?.removeAttribute('src');
                        };

                        const enterImageCollector = (featuredName = '') => {
                            form.dataset.fniFeaturedSaved = '1';
                            form.classList.add('is-secondary-enabled', 'is-featured-saved');
                            card?.classList.add('is-image-collector-ready');
                            const toggle = form.querySelector('.fni-secondary-toggle');
                            if (toggle) {
                                toggle.checked = true;
                            }
                            appendSavedFile(mainFiles, featuredName || 'Featured image saved');
                            clearPrimaryImageInput();
                            updateImageCounts();
                            setStoryProgress('Featured saved. Keep pasting images here, or use the X when this card is done.');
                            drop.querySelector('span').textContent = 'Paste another image here. Landscape saves as main; portrait saves for Stories/Reels/Shorts.';
                            secondaryDrop?.querySelector('span')?.replaceChildren(document.createTextNode('Paste a Story image here.'));
                        };

                        form.addEventListener('cph:featured-saved', (event) => {
                            const detail = event.detail || {};
                            renderManagedImages(form, detail.managed_images || []);
                            enterImageCollector(detail.filename || detail.title || 'Featured image saved');
                            if (Number.parseInt(detail.secondary_saved || '0', 10) > 0) {
                                storyImagesSaved = Math.max(storyImagesSaved + 1, Number.parseInt(detail.secondary_count || '0', 10));
                                appendSavedFile(storyFiles, detail.secondary_filename || 'Story image saved');
                                clearSecondaryImageInput();
                                updateImageCounts();
                            }
                        });

                        form.addEventListener('cph:auxiliary-saved', (event) => {
                            const detail = event.detail || {};
                            renderManagedImages(form, detail.managed_images || []);
                            if (detail.kind === 'main') {
                                extraMainImagesSaved = Math.max(extraMainImagesSaved + 1, Number.parseInt(detail.count || '0', 10) - 1);
                                appendSavedFile(mainFiles, detail.filename || detail.title || 'Extra main image saved');
                                clearPrimaryImageInput();
                                drop.querySelector('span').textContent = 'Saved as main. Paste another image, or close this card.';
                            } else {
                                storyImagesSaved = Math.max(storyImagesSaved + 1, Number.parseInt(detail.count || '0', 10));
                                appendSavedFile(storyFiles, detail.filename || detail.title || 'Story image saved');
                                clearPrimaryImageInput();
                                clearSecondaryImageInput();
                                drop.querySelector('span').textContent = 'Saved for Stories/Reels/Shorts. Paste another image, or close this card.';
                                secondaryDrop?.querySelector('span')?.replaceChildren(document.createTextNode('Paste another Story image here.'));
                            }
                            updateImageCounts();
                            const mainImageCount = form.dataset.fniFeaturedSaved === '1' ? 1 + extraMainImagesSaved : 0;
                            setStoryProgress('Saved. Main images: ' + String(mainImageCount) + '. Story images: ' + String(storyImagesSaved) + '. ' + (mainImageCount > 0 ? 'Use the X when done.' : 'A featured landscape image is still needed.'));
                        });

                        const setSubmitBusy = (busy) => {
                            if (!submitButtons.length) {
                                return;
                            }
                            submitButtons.forEach((submitButton) => {
                                submitButton.disabled = busy;
                                const isSaveBoth = submitButton.classList.contains('fni-save-both');
                                submitButton.setAttribute('aria-label', busy ? 'Saving image' : (isSaveBoth ? 'Save staged image' : 'Save image and queue for publishing'));
                                submitButton.setAttribute('title', busy ? 'Saving image' : (isSaveBoth ? 'Save staged image' : 'Save image and queue for publishing'));
                            });
                        };

                        const setDebug = (value) => {
                            if (pastedDebug) {
                                pastedDebug.value = String(value || '').slice(0, 400);
                            }
                        };

                        const setSecondaryDebug = (value) => {
                            if (secondaryPastedDebug) {
                                secondaryPastedDebug.value = String(value || '').slice(0, 400);
                            }
                        };

                        const imageFileFromTransfer = (transfer) => {
                            const files = Array.from(transfer?.files || []);
                            const itemTypes = Array.from(transfer?.items || []).map((item) => item.type).filter(Boolean);
                            setDebug(['files:' + files.map((item) => item.type || 'unknown').join(','), 'items:' + itemTypes.join(',')].join(' '));
                            const file = files.find((item) => item.type && item.type.startsWith('image/'));
                            if (file) {
                                return file;
                            }
                            const items = Array.from(transfer?.items || []);
                            for (const item of items) {
                                if (item.type && item.type.startsWith('image/') && typeof item.getAsFile === 'function') {
                                    const itemFile = item.getAsFile();
                                    if (itemFile) {
                                        return itemFile;
                                    }
                                }
                            }
                            return null;
                        };

                        const imageDataFromClipboard = (clipboardData) => {
                            const html = clipboardData?.getData?.('text/html') || '';
                            const text = clipboardData?.getData?.('text/plain') || clipboardData?.getData?.('text/uri-list') || '';
                            const haystack = html + '\n' + text;
                            const match = haystack.match(/data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=\r\n]+/i);
                            if (!match) {
                                return '';
                            }
                            return match[0].replace(/^data:image\/jpg;/i, 'data:image/jpeg;');
                        };

                        const setDataUrl = (dataUrl, name) => {
                            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                                return false;
                            }
                            if (pastedData) {
                                pastedData.value = dataUrl;
                            }
                            if (pastedName) {
                                pastedName.value = name || 'clipboard-image.png';
                            }
                            preview.src = dataUrl;
                            drop.querySelector('span').textContent = name || 'Clipboard image ready';
                            return true;
                        };

                        const readImageData = (file) => new Promise((resolve, reject) => {
                            if (!file || !file.type || !file.type.startsWith('image/')) {
                                resolve(false);
                                return;
                            }
                            try {
                                const reader = new FileReader();
                                reader.addEventListener('load', () => {
                                    if (pastedData) {
                                        pastedData.value = String(reader.result || '');
                                    }
                                    resolve(Boolean(reader.result));
                                });
                                reader.addEventListener('error', () => reject(reader.error || new Error('Could not read pasted image.')));
                                reader.readAsDataURL(file);
                            } catch (error) {
                                reject(error);
                            }
                        });

                        const setFile = (file) => {
                            if (!file || !file.type.startsWith('image/')) {
                                return false;
                            }
                            if (pastedData) {
                                pastedData.value = '';
                            }
                            if (pastedName) {
                                pastedName.value = file.name || 'pasted-image.png';
                            }
                            pendingRead = readImageData(file).then((ok) => {
                                if (ok) {
                                    drop.querySelector('span').textContent = 'Featured ready';
                                }
                                return ok;
                            }).catch(() => false);
                            try {
                                const transfer = new DataTransfer();
                                transfer.items.add(file);
                                input.files = transfer.files;
                            } catch (error) {
                                // Safari and some browser contexts may refuse programmatic file input changes.
                            }
                            preview.src = URL.createObjectURL(file);
                            drop.querySelector('span').textContent = 'Reading featured...';
                            return true;
                        };

                        const readSecondaryImageData = (file) => new Promise((resolve, reject) => {
                            if (!file || !file.type || !file.type.startsWith('image/')) {
                                resolve(false);
                                return;
                            }
                            try {
                                const reader = new FileReader();
                                reader.addEventListener('load', () => {
                                    if (secondaryPastedData) {
                                        secondaryPastedData.value = String(reader.result || '');
                                    }
                                    resolve(Boolean(reader.result));
                                });
                                reader.addEventListener('error', () => reject(reader.error || new Error('Could not read Story image.')));
                                reader.readAsDataURL(file);
                            } catch (error) {
                                reject(error);
                            }
                        });

                        const setSecondaryDataUrl = (dataUrl, name) => {
                            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                                return false;
                            }
                            if (secondaryPastedData) {
                                secondaryPastedData.value = dataUrl;
                            }
                            if (secondaryPastedName) {
                                secondaryPastedName.value = name || 'story-image.png';
                            }
                            if (secondaryPreview) {
                                secondaryPreview.src = dataUrl;
                            }
                            secondaryDrop?.querySelector('span')?.replaceChildren(document.createTextNode('Story ready'));
                            return true;
                        };

                        const setSecondaryFile = (file) => {
                            if (!file || !file.type.startsWith('image/')) {
                                return false;
                            }
                            if (secondaryPastedData) {
                                secondaryPastedData.value = '';
                            }
                            if (secondaryPastedName) {
                                secondaryPastedName.value = file.name || 'story-image.png';
                            }
                            secondaryPendingRead = readSecondaryImageData(file).then((ok) => {
                                if (ok && secondaryDrop) {
                                    secondaryDrop.querySelector('span').textContent = 'Story ready';
                                }
                                return ok;
                            }).catch(() => false);
                            try {
                                const transfer = new DataTransfer();
                                transfer.items.add(file);
                                if (secondaryInput) {
                                    secondaryInput.files = transfer.files;
                                }
                            } catch (error) {
                                // Safari and some browser contexts may refuse programmatic file input changes.
                            }
                            if (secondaryPreview) {
                                secondaryPreview.src = URL.createObjectURL(file);
                            }
                            if (secondaryDrop) {
                                secondaryDrop.querySelector('span').textContent = 'Reading Story image...';
                            }
                            return true;
                        };

                        const classifyDataUrl = (dataUrl) => new Promise((resolve) => {
                            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                                resolve('main');
                                return;
                            }
                            const image = new Image();
                            image.addEventListener('load', () => {
                                const width = Number(image.naturalWidth || image.width || 0);
                                const height = Number(image.naturalHeight || image.height || 0);
                                if (width > 0 && height > 0 && height > width) {
                                    resolve('story');
                                    return;
                                }
                                resolve('main');
                            }, { once: true });
                            image.addEventListener('error', () => resolve('main'), { once: true });
                            image.src = dataUrl;
                        });

                        const preparedPrimaryKind = async () => {
                            await pendingRead;
                            const staged = (pastedData?.value || preview?.src || '').trim();
                            return classifyDataUrl(staged);
                        };

                        const copyPrimaryStageToStory = () => {
                            const staged = (pastedData?.value || preview?.src || '').trim();
                            if (!staged || !staged.startsWith('data:image/')) {
                                return false;
                            }
                            if (secondaryPastedData) {
                                secondaryPastedData.value = staged;
                            }
                            if (secondaryPastedName) {
                                secondaryPastedName.value = pastedName?.value || 'story-image.png';
                            }
                            if (secondaryPreview) {
                                secondaryPreview.src = staged;
                            }
                            return true;
                        };

                        const savePreparedCollectorImage = async () => {
                            const kind = await preparedPrimaryKind();
                            if (form.dataset.fniFeaturedSaved !== '1') {
                                if (kind === 'story') {
                                    if (!copyPrimaryStageToStory()) {
                                        drop.querySelector('span').textContent = 'Could not stage the Story image. Try Choose File.';
                                        return false;
                                    }
                                    drop.querySelector('span').textContent = 'Portrait detected. Saving as Story image...';
                                    return saveAuxiliaryImageForm(form, 'story');
                                }
                                if (secondaryEnabled(form)) {
                                    drop.querySelector('span').textContent = 'Featured ready. Uploading...';
                                    return saveImageForm(form, { keepCard: true, primaryOnly: true });
                                }
                                drop.querySelector('span').textContent = 'Image ready. Saving...';
                                return saveImageForm(form);
                            }

                            if (kind === 'story') {
                                if (!copyPrimaryStageToStory()) {
                                    drop.querySelector('span').textContent = 'Could not stage the Story image. Try Choose File.';
                                    return false;
                                }
                                drop.querySelector('span').textContent = 'Story/Reel image ready. Uploading...';
                                return saveAuxiliaryImageForm(form, 'story');
                            }

                            drop.querySelector('span').textContent = 'Main image ready. Uploading...';
                            return saveAuxiliaryImageForm(form, 'main');
                        };

                        const handlePaste = (event) => {
                            if (event.defaultPrevented) {
                                return;
                            }

                            const file = imageFileFromTransfer(event.clipboardData);
                            if (file) {
                                event.preventDefault();
                                if (setFile(file)) {
                                    window.setTimeout(async () => {
                                        await savePreparedCollectorImage();
                                    }, 150);
                                }
                                return;
                            }

                            const dataUrl = imageDataFromClipboard(event.clipboardData);
                            if (dataUrl) {
                                event.preventDefault();
                                if (setDataUrl(dataUrl, 'pasted-image.png')) {
                                    window.setTimeout(async () => {
                                        await savePreparedCollectorImage();
                                    }, 150);
                                }
                            }
                        };

                        const handleSecondaryPaste = (event) => {
                            if (event.defaultPrevented) {
                                return;
                            }

                            const file = imageFileFromTransfer(event.clipboardData);
                            if (file) {
                                event.preventDefault();
                                if (setSecondaryFile(file)) {
                                    window.setTimeout(async () => {
                                        await secondaryPendingRead;
                                        if (form.dataset.fniFeaturedSaved === '1') {
                                            await saveAuxiliaryImageForm(form, 'story');
                                        }
                                    }, 150);
                                }
                                return;
                            }

                            const dataUrl = imageDataFromClipboard(event.clipboardData);
                            if (dataUrl) {
                                event.preventDefault();
                                if (setSecondaryDataUrl(dataUrl, 'story-image.png') && form.dataset.fniFeaturedSaved === '1') {
                                    window.setTimeout(async () => {
                                        await saveAuxiliaryImageForm(form, 'story');
                                    }, 150);
                                }
                            }
                        };

                        drop.addEventListener('paste', handlePaste);
                        form.addEventListener('paste', handlePaste);
                        secondaryDrop?.addEventListener('paste', handleSecondaryPaste);
                        const focusCollectorForPaste = (targetDrop, message) => {
                            if (!targetDrop) {
                                return false;
                            }
                            targetDrop.setAttribute('tabindex', '-1');
                            targetDrop.focus({ preventScroll: false });
                            const label = targetDrop.querySelector('span');
                            if (label) {
                                label.textContent = message;
                            }
                            return true;
                        };

                        if (clipboardButton) {
                            clipboardButton.addEventListener('click', async () => {
                                focusCollectorForPaste(drop, 'Ready for paste. Press Command+V or paste here.');
                            });
                        }
                        if (secondaryClipboardButton) {
                            secondaryClipboardButton.addEventListener('click', async () => {
                                focusCollectorForPaste(secondaryDrop, 'Ready for Story paste. Press Command+V or paste here.');
                            });
                        }
                        drop.addEventListener('dragover', (event) => {
                            event.preventDefault();
                            drop.classList.add('is-active');
                        });
                        drop.addEventListener('dragleave', () => drop.classList.remove('is-active'));
                        drop.addEventListener('drop', (event) => {
                            event.preventDefault();
                            drop.classList.remove('is-active');
                            if (setFile(imageFileFromTransfer(event.dataTransfer))) {
                                drop.querySelector('span').textContent = form.dataset.fniFeaturedSaved === '1' ? 'Main image ready. Uploading...' : 'Featured ready';
                                window.setTimeout(async () => {
                                    await savePreparedCollectorImage();
                                }, 150);
                            }
                        });
                        input.addEventListener('change', () => {
                            if (pastedData) {
                                pastedData.value = '';
                            }
                            if (pastedName) {
                                pastedName.value = '';
                            }
                            if (setFile(input.files[0])) {
                                window.setTimeout(async () => {
                                    await savePreparedCollectorImage();
                                }, 150);
                            }
                        });
                        secondaryDrop?.addEventListener('dragover', (event) => {
                            event.preventDefault();
                            secondaryDrop.classList.add('is-active');
                        });
                        secondaryDrop?.addEventListener('dragleave', () => secondaryDrop.classList.remove('is-active'));
                        secondaryDrop?.addEventListener('drop', (event) => {
                            event.preventDefault();
                            secondaryDrop.classList.remove('is-active');
                            if (setSecondaryFile(imageFileFromTransfer(event.dataTransfer))) {
                                secondaryDrop.querySelector('span').textContent = 'Story ready';
                                window.setTimeout(async () => {
                                    await secondaryPendingRead;
                                    if (form.dataset.fniFeaturedSaved === '1') {
                                        await saveAuxiliaryImageForm(form, 'story');
                                    }
                                }, 150);
                            }
                        });
                        secondaryInput?.addEventListener('change', () => {
                            if (secondaryPastedData) {
                                secondaryPastedData.value = '';
                            }
                            if (secondaryPastedName) {
                                secondaryPastedName.value = '';
                            }
                            if (setSecondaryFile(secondaryInput.files[0])) {
                                window.setTimeout(async () => {
                                    await secondaryPendingRead;
                                    if (form.dataset.fniFeaturedSaved === '1') {
                                        await saveAuxiliaryImageForm(form, 'story');
                                    }
                                }, 150);
                            }
                        });
                        closeStoryButton?.addEventListener('click', async () => {
                            card?.remove();
                            cards = Array.from(document.querySelectorAll('.fni-card'));
                            await refreshNextCard();
                        });
                        submitButtons.forEach((submitButton) => {
                            submitButton.addEventListener('click', () => setSubmitBusy(false));
                        });
                        form.addEventListener('submit', async (event) => {
                            if (form.dataset.fniSubmitting === '1') {
                                return;
                            }
                            if (input.files && input.files.length > 0) {
                                return;
                            }
                            if (pastedData && pastedData.value.startsWith('data:image/')) {
                                return;
                            }

                            event.preventDefault();
                            setSubmitBusy(true);

                            const ready = await pendingRead;
                            if (ready && pastedData && pastedData.value.startsWith('data:image/')) {
                                drop.querySelector('span').textContent = 'Image ready';
                                setSubmitBusy(false);
                                return;
                            }

                            drop.querySelector('span').textContent = 'Paste or choose an image before saving.';
                            setSubmitBusy(false);
                        });
                    });

                    const list = document.querySelector('.fni-list');
                    const visibleCardIds = () => new Set(Array.from(document.querySelectorAll('.fni-card[data-post-id]')).map((card) => card.dataset.postId));
                    const hasPrimaryImage = (form) => {
                        const input = form.querySelector('input[name="cph_image"]');
                        const pastedData = form.querySelector('[name="pasted_image_data"]');
                        return Boolean((input?.files && input.files.length > 0) || (pastedData && pastedData.value.startsWith('data:image/')));
                    };
                    const hasSecondaryImage = (form) => {
                        const input = form.querySelector('input[name="cph_secondary_image"]');
                        const pastedData = form.querySelector('[name="secondary_pasted_image_data"]');
                        return Boolean((input?.files && input.files.length > 0) || (pastedData && pastedData.value.startsWith('data:image/')));
                    };
                    const classifyPrimaryForForm = (form) => new Promise((resolve) => {
                        const dataUrl = form.querySelector('[name="pasted_image_data"]')?.value || form.querySelector('.fni-featured-slot .fni-preview')?.src || '';
                        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                            resolve('main');
                            return;
                        }
                        const image = new Image();
                        image.addEventListener('load', () => {
                            const width = Number(image.naturalWidth || image.width || 0);
                            const height = Number(image.naturalHeight || image.height || 0);
                            resolve(width > 0 && height > width ? 'story' : 'main');
                        }, { once: true });
                        image.addEventListener('error', () => resolve('main'), { once: true });
                        image.src = dataUrl;
                    });
                    const movePrimaryToStoryForForm = (form) => {
                        const dataUrl = form.querySelector('[name="pasted_image_data"]')?.value || '';
                        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                            return false;
                        }
                        const secondaryData = form.querySelector('[name="secondary_pasted_image_data"]');
                        const secondaryName = form.querySelector('input[name="secondary_pasted_image_name"]');
                        const secondaryPreview = form.querySelector('.fni-secondary-preview');
                        if (secondaryData) {
                            secondaryData.value = dataUrl;
                        }
                        if (secondaryName) {
                            secondaryName.value = form.querySelector('input[name="pasted_image_name"]')?.value || 'story-image.png';
                        }
                        if (secondaryPreview) {
                            secondaryPreview.src = dataUrl;
                        }
                        return true;
                    };
                    const secondaryEnabled = (form) => Boolean(form.querySelector('.fni-secondary-toggle')?.checked);
                    const scheduleAjaxSave = (form) => {
                        if (!form || secondaryEnabled(form) || form.dataset.fniSubmitting === '1') {
                            return;
                        }
                        window.setTimeout(() => {
                            if (hasPrimaryImage(form) && form.dataset.fniSubmitting !== '1') {
                                saveImageForm(form);
                            }
                        }, 500);
                    };
                    const setPastedData = async (form, file, dataUrl, name) => {
                        const pastedData = form.querySelector('[name="pasted_image_data"]');
                        const pastedName = form.querySelector('input[name="pasted_image_name"]');
                        const preview = form.querySelector('.fni-preview');
                        const drop = form.querySelector('.fni-drop span');
                        if (file && file.type && file.type.startsWith('image/') && !dataUrl) {
                            dataUrl = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.addEventListener('load', () => resolve(String(reader.result || '')));
                                reader.addEventListener('error', () => resolve(''));
                                reader.readAsDataURL(file);
                            });
                            name = name || file.name || 'pasted-image.png';
                        }
                        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                            return false;
                        }
                        if (pastedData) {
                            pastedData.value = dataUrl;
                        }
                        if (pastedName) {
                            pastedName.value = name || 'pasted-image.png';
                        }
                        if (preview) {
                            preview.src = dataUrl;
                        }
                        if (drop) {
                            drop.textContent = (name || 'Pasted image') + ' ready. Saving...';
                        }
                        return true;
                    };
                    const refreshNextCard = async () => {
                        if (!list) {
                            return;
                        }
                        const known = visibleCardIds();
                        const response = await fetch(window.location.href, {
                            credentials: 'same-origin',
                            headers: { 'X-Requested-With': 'XMLHttpRequest' }
                        });
                        const html = await response.text();
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        const next = Array.from(doc.querySelectorAll('.fni-card[data-post-id]')).find((card) => !known.has(card.dataset.postId));
                        if (!next) {
                            return;
                        }
                        list.appendChild(document.importNode(next, true));
                        cards = Array.from(document.querySelectorAll('.fni-card'));
                    };
                    const saveImageForm = async (form, options = {}) => {
                        if (!form || form.dataset.fniSubmitting === '1') {
                            return false;
                        }

                        const keepCard = Boolean(options.keepCard);
                        const primaryOnly = Boolean(options.primaryOnly);
                        const card = form.closest('.fni-card');
                        const submitButtons = Array.from(form.querySelectorAll('button[type="submit"]'));
                        const drop = form.querySelector('.fni-drop span');
                        if (!hasPrimaryImage(form)) {
                            if (drop) {
                                drop.textContent = 'Paste or choose an image before saving.';
                            }
                            return false;
                        }
                        if (secondaryEnabled(form) && !primaryOnly && !hasSecondaryImage(form)) {
                            const secondaryDrop = form.querySelector('.fni-secondary-drop span');
                            if (secondaryDrop) {
                                secondaryDrop.textContent = 'Add the Story image before saving both.';
                            }
                            return false;
                        }

                        form.dataset.fniSubmitting = '1';
                        card?.classList.add('is-saving');
                        submitButtons.forEach((submitButton) => {
                            submitButton.disabled = true;
                        });

                        const formData = new FormData(form);
                        formData.set('action', 'cph_upload_image_ajax');
                        if (!secondaryEnabled(form) || primaryOnly) {
                            formData.delete('save_secondary_image');
                            formData.delete('cph_secondary_image');
                            formData.delete('secondary_pasted_image_data');
                            formData.delete('secondary_pasted_image_name');
                            formData.delete('secondary_pasted_image_debug');
                        }
                        try {
                            await preparePastedFiles(formData, form);
                            const payload = await fetchJsonWithRetry(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            }, 'Image save failed.', 3);
                            if (!payload || !payload.success) {
                                const message = payload?.data?.message || 'Image save failed.';
                                if (message.includes('already has an image') || message.includes('left this queue')) {
                                    showNotice('That card was already finished, so it was removed from your Image Desk.', 'success');
                                    card?.remove();
                                    cards = Array.from(document.querySelectorAll('.fni-card'));
                                    await refreshNextCard();
                                    return true;
                                }
                                throw new Error(message);
                            }
                            recordSessionDone();
                            showNotice(payload.data.message || 'Image saved and queued.', 'success');
                            if (keepCard) {
                                form.dataset.fniSubmitting = '0';
                                card?.classList.remove('is-saving');
                                submitButtons.forEach((submitButton) => {
                                    submitButton.disabled = false;
                                });
                                form.dispatchEvent(new CustomEvent('cph:featured-saved', { detail: payload.data || {} }));
                                return true;
                            }
                            card?.remove();
                            cards = Array.from(document.querySelectorAll('.fni-card'));
                            await refreshNextCard();
                            return true;
                        } catch (error) {
                            showNotice(error.message || 'Image save failed.', 'error', {
                                report: codexReportFromCard({
                                    message: error.message || 'Image save failed.',
                                    action: primaryOnly ? 'Save featured image only' : 'Save featured and Story images',
                                    card
                                })
                            });
                            if (drop) {
                                drop.textContent = error.message || 'Image save failed.';
                            }
                            card?.classList.remove('is-saving');
                            form.dataset.fniSubmitting = '0';
                            submitButtons.forEach((submitButton) => {
                                submitButton.disabled = false;
                            });
                            return false;
                        }
                    };
                    const saveAuxiliaryImageForm = async (form, kind) => {
                        if (!form || form.dataset.fniSubmitting === '1') {
                            return false;
                        }

                        const isMain = kind === 'main';
                        const card = form.closest('.fni-card');
                        const submitButtons = Array.from(form.querySelectorAll('button[type="submit"]'));
                        const targetDrop = form.querySelector(isMain ? '.fni-featured-slot .fni-drop span' : '.fni-secondary-drop span');
                        if (isMain && form.dataset.fniFeaturedSaved !== '1') {
                            if (targetDrop) {
                                targetDrop.textContent = 'Save the featured image first.';
                            }
                            return false;
                        }
                        if (isMain && !hasPrimaryImage(form)) {
                            if (targetDrop) {
                                targetDrop.textContent = 'Paste or choose another main image.';
                            }
                            return false;
                        }
                        if (!isMain && !hasSecondaryImage(form)) {
                            if (targetDrop) {
                                targetDrop.textContent = 'Paste or choose a Story image.';
                            }
                            return false;
                        }

                        form.dataset.fniSubmitting = '1';
                        card?.classList.add('is-saving');
                        submitButtons.forEach((submitButton) => {
                            submitButton.disabled = true;
                        });

                        const formData = new FormData(form);
                        formData.set('action', isMain ? 'cph_upload_main_image_ajax' : 'cph_upload_story_image_ajax');
                        formData.set('image_kind', isMain ? 'main' : 'story');
                        if (isMain) {
                            formData.delete('save_secondary_image');
                            formData.delete('cph_secondary_image');
                            formData.delete('secondary_pasted_image_data');
                            formData.delete('secondary_pasted_image_name');
                            formData.delete('secondary_pasted_image_debug');
                        } else {
                            formData.delete('cph_image');
                            formData.delete('pasted_image_data');
                            formData.delete('pasted_image_name');
                            formData.delete('pasted_image_debug');
                        }
                        try {
                            await preparePastedFiles(formData, form);
                            const payload = await fetchJsonWithRetry(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            }, 'Image save failed.', 3);
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Image save failed.');
                            }
                            showNotice(payload.data.message || 'Image saved.', 'success');
                            form.dispatchEvent(new CustomEvent('cph:auxiliary-saved', { detail: payload.data || {} }));
                            form.dataset.fniSubmitting = '0';
                            card?.classList.remove('is-saving');
                            submitButtons.forEach((submitButton) => {
                                submitButton.disabled = false;
                            });
                            return true;
                        } catch (error) {
                            showNotice(error.message || 'Image save failed.', 'error', {
                                report: codexReportFromCard({
                                    message: error.message || 'Image save failed.',
                                    action: isMain ? 'Save extra main image' : 'Save Story image',
                                    card
                                })
                            });
                            if (targetDrop) {
                                targetDrop.textContent = error.message || 'Image save failed.';
                            }
                            card?.classList.remove('is-saving');
                            form.dataset.fniSubmitting = '0';
                            submitButtons.forEach((submitButton) => {
                                submitButton.disabled = false;
                            });
                            return false;
                        }
                    };
                    const runPaidApiForCard = async (button) => {
                        const card = button?.closest('.fni-card');
                        if (!card || button.disabled) {
                            return;
                        }
                        const postId = card.dataset.postId || button.dataset.postId || '';
                        if (!postId) {
                            showNotice('This card is missing its post ID.', 'error');
                            return;
                        }

                        button.disabled = true;
                        card.classList.add('is-saving');
                        const formData = new FormData();
                        formData.set('action', 'cph_run_paid_image_api');
                        formData.set('nonce', runPaidApiNonce);
                        formData.set('post_id', postId);

                        try {
                            const payload = await fetchJsonWithRetry(window.ajaxurl || '<?php echo esc_js(admin_url('admin-ajax.php')); ?>', {
                                method: 'POST',
                                body: formData,
                                credentials: 'same-origin'
                            }, 'Paid image generation failed.', 2);
                            if (!payload || !payload.success) {
                                throw new Error(payload?.data?.message || 'Paid image generation failed.');
                            }
                            showNotice(payload.data.message || 'Both images were generated and queued.', 'success');
                            card.remove();
                            cards = Array.from(document.querySelectorAll('.fni-card'));
                            await refreshNextCard();
                        } catch (error) {
                            showNotice(error.message || 'Paid image generation failed.', 'error', {
                                report: codexReportFromCard({
                                    message: error.message || 'Paid image generation failed.',
                                    action: 'Run owner-only paid OpenAI image lane',
                                    card
                                })
                            });
                            card.classList.remove('is-saving');
                            button.disabled = false;
                        }
                    };
                    document.addEventListener('change', (event) => {
                        const target = event.target;
                        if (!(target instanceof HTMLElement)) {
                            return;
                        }
                        if (target.classList.contains('fni-secondary-toggle')) {
                            const form = target.closest('.fni-upload');
                            form?.classList.toggle('is-secondary-enabled', target.checked);
                            return;
                        }
                        if (target.matches('input[name="cph_image"]')) {
                            scheduleAjaxSave(target.closest('.fni-upload'));
                        }
                    });
                    document.addEventListener('paste', (event) => {
                        if (event.defaultPrevented) {
                            return;
                        }
                        const form = event.target instanceof HTMLElement ? event.target.closest('.fni-upload') : null;
                        if (!form) {
                            return;
                        }
                        if (event.target instanceof HTMLElement && event.target.closest('.fni-secondary-drop')) {
                            return;
                        }
                        const files = Array.from(event.clipboardData?.files || []);
                        const file = files.find((item) => item.type && item.type.startsWith('image/')) || null;
                        const html = event.clipboardData?.getData?.('text/html') || '';
                        const text = event.clipboardData?.getData?.('text/plain') || event.clipboardData?.getData?.('text/uri-list') || '';
                        const match = (html + '\n' + text).match(/data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=\r\n]+/i);
                        window.setTimeout(async () => {
                            if (!hasPrimaryImage(form)) {
                                await setPastedData(form, file, match ? match[0].replace(/^data:image\/jpg;/i, 'data:image/jpeg;') : '', 'pasted-image.png');
                            }
                            scheduleAjaxSave(form);
                        }, 150);
                    });
                    document.addEventListener('drop', (event) => {
                        const form = event.target instanceof HTMLElement ? event.target.closest('.fni-upload') : null;
                        if (!form) {
                            return;
                        }
                        if (event.target instanceof HTMLElement && event.target.closest('.fni-secondary-drop')) {
                            return;
                        }
                        const file = Array.from(event.dataTransfer?.files || []).find((item) => item.type && item.type.startsWith('image/')) || null;
                        window.setTimeout(async () => {
                            if (!hasPrimaryImage(form)) {
                                await setPastedData(form, file, '', file?.name || 'dropped-image.png');
                            }
                            scheduleAjaxSave(form);
                        }, 150);
                    });
                    document.addEventListener('click', async (event) => {
                        const target = event.target instanceof HTMLElement ? event.target.closest('.fni-copy, .fni-diagnostic-copy') : null;
                        if (!target || target.dataset.fniDelegated === '1') {
                            return;
                        }
                        target.dataset.fniDelegated = '1';
                        window.setTimeout(() => {
                            target.dataset.fniDelegated = '0';
                        }, 150);
                        if (target.classList.contains('fni-copy')) {
                            const copyTarget = document.getElementById(target.dataset.copyTarget);
                            await copyPromptTarget(copyTarget);
                            markCopiedButton(target);
                        }
                        if (target.classList.contains('fni-diagnostic-copy')) {
                            await copyText(target.dataset.diagnostic || '');
                            markCopiedButton(target);
                            showNotice('Post diagnosis copied.', 'success');
                        }
                        if (target.classList.contains('fni-run-paid-api')) {
                            await runPaidApiForCard(target);
                        }
                    });
                    document.addEventListener('submit', async (event) => {
                        const form = event.target instanceof HTMLElement ? event.target.closest('.fni-upload') : null;
                        if (!form) {
                            return;
                        }
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        if (form.dataset.fniFeaturedSaved === '1') {
                            if (hasPrimaryImage(form) && (await classifyPrimaryForForm(form)) === 'story') {
                                if (movePrimaryToStoryForForm(form)) {
                                    await saveAuxiliaryImageForm(form, 'story');
                                    return;
                                }
                            }
                            if (hasSecondaryImage(form)) {
                                await saveAuxiliaryImageForm(form, 'story');
                                return;
                            }
                            if (hasPrimaryImage(form)) {
                                await saveAuxiliaryImageForm(form, 'main');
                                return;
                            }
                        }
                        await saveImageForm(form, secondaryEnabled(form) ? { keepCard: true, primaryOnly: true } : {});
                    }, true);

                    if (search) {
                        search.addEventListener('input', () => {
                            const query = search.value.trim().toLowerCase();
                            cards.forEach((card) => {
                                card.hidden = query !== '' && !card.dataset.search.includes(query);
                            });
                        });
                    }
                })();
            </script>
        </div>
        <?php
    }

    public function handle_image_upload(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !current_user_can('edit_post', $post_id)) {
            $this->redirect_needs_images('Post not found or not editable.');
        }

        check_admin_referer('cph_upload_image_' . $post_id);

        if (!$this->image_claim_allows_user($post_id, get_current_user_id())) {
            $this->redirect_needs_images('Another helper has this draft reserved right now. Refresh the queue to get a fresh card.');
        }

        if (
            (int) get_post_thumbnail_id($post_id) > 0
            && (string) get_post_meta($post_id, self::META_IMAGE_REQUIRED, true) !== '1'
            && (string) get_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED, true) !== '1'
        ) {
            $this->redirect_needs_images('That draft already has an image and left this queue. Refresh to get another card.');
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $file = $this->image_file_from_request($post_id);
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $error_code = is_array($file) ? (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
            if (in_array($error_code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                $this->redirect_needs_images('That image is larger than this WordPress upload limit. Save it from ChatGPT and use Choose File, or make/export a smaller PNG/JPG.');
            }

            $debug = sanitize_text_field((string) ($_POST['pasted_image_debug'] ?? ''));
            if ($debug !== '') {
                error_log('Creator Publishing Hub image upload missing image data for post ' . $post_id . ': ' . $debug);
            }
            $this->redirect_needs_images('Choose a file, paste an image into the box, or click Use clipboard image before saving.');
        }

        $primary_orientation = $this->uploaded_image_orientation($file);
        if ($primary_orientation === 'portrait') {
            wp_send_json_error(['message' => 'Portrait image detected. Use it as a Story image; the featured image must be landscape.'], 422);
        }

        $secondary_file = null;
        if (!empty($_POST['save_secondary_image'])) {
            $secondary_file = $this->image_file_from_request($post_id, 'cph_secondary_image', 'secondary_pasted_image_data', 'secondary_pasted_image_name');
            if (!is_array($secondary_file) || (int) ($secondary_file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $error_code = is_array($secondary_file) ? (int) ($secondary_file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
                if (in_array($error_code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                    $this->redirect_needs_images('That Story image is larger than this WordPress upload limit.');
                }
                $this->redirect_needs_images('Choose or paste the Story image before saving both images.');
            }
        }

        $origin = sanitize_key((string) ($_POST['image_origin'] ?? 'human'));
        $origin = $origin === 'api' ? 'api' : 'human';
        $provider = $origin === 'api' ? 'api' : 'manual';
        $primary = $this->attach_cleaned_image_file($post_id, $post, $file, $provider, $origin, 'featured');
        if (is_wp_error($primary)) {
            $this->redirect_needs_images($primary->get_error_message());
        }

        $attachment_id = (int) $primary['attachment_id'];
        $metadata_stripped = !empty($primary['metadata_stripped']);

        set_post_thumbnail($post_id, $attachment_id);
        update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta($post_id, self::META_IMAGE_ORIGIN, $origin);
        update_post_meta($post_id, self::META_IMAGE_ATTACHED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
        update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
        delete_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED);
        if ($origin === 'human') {
            update_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE, current_time('mysql', true));
        } else {
            delete_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE);
        }
        update_post_meta($post_id, self::META_IMAGE_CREDIT, (string) $primary['credit']);
        update_post_meta($post_id, '_cph_metadata_stripped', $metadata_stripped ? '1' : '0');
        $this->record_image_claim_completion($post_id, get_current_user_id());
        $this->clear_image_claim($post_id);

        $secondary_saved = 0;
        if (!empty($_POST['save_secondary_image'])) {
            if (is_array($secondary_file)) {
                $secondary = $this->attach_cleaned_image_file($post_id, $post, $secondary_file, $provider, $origin, 'social-alt');
                if (is_wp_error($secondary)) {
                    $this->redirect_needs_images($secondary->get_error_message());
                }
                $this->append_secondary_social_image($post_id, (int) $secondary['attachment_id']);
                $secondary_saved = 1;
            }
        }
        update_post_meta(
            $post_id,
            self::META_STORY_REQUIRED,
            $this->secondary_social_image_ids($post_id) ? '0' : '1'
        );

        $redirect_args = [
            'fni_uploaded' => '1',
            'fni_saved_id' => (string) $post_id,
            'fni_saved_title' => get_the_title($post_id),
        ];
        if ($secondary_saved > 0) {
            $redirect_args['fni_secondary_saved'] = (string) $secondary_saved;
        }

        $redirect = $this->safe_needs_images_redirect((string) ($_POST['redirect_to'] ?? ''));
        wp_safe_redirect(add_query_arg($redirect_args, $redirect));
        exit;
    }

    public function handle_image_upload_ajax(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !current_user_can('edit_post', $post_id)) {
            wp_send_json_error(['message' => 'Post not found or not editable.'], 403);
        }

        if (!check_ajax_referer('cph_upload_image_' . $post_id, '_wpnonce', false)) {
            wp_send_json_error(['message' => 'Security check failed. Refresh the queue and try again.'], 403);
        }

        if (!$this->image_claim_allows_user($post_id, get_current_user_id())) {
            wp_send_json_error(['message' => 'Another helper has this draft reserved right now. Refresh the queue to get a fresh card.'], 409);
        }

        if (
            (int) get_post_thumbnail_id($post_id) > 0
            && (string) get_post_meta($post_id, self::META_IMAGE_REQUIRED, true) !== '1'
            && (string) get_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED, true) !== '1'
        ) {
            wp_send_json_error(['message' => 'That draft already has an image and left this queue.'], 409);
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $file = $this->image_file_from_request($post_id);
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $error_code = is_array($file) ? (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
            if (in_array($error_code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                wp_send_json_error(['message' => 'That image is larger than this WordPress upload limit. Save it from ChatGPT and use Choose File, or make/export a smaller PNG/JPG.'], 413);
            }

            $debug = sanitize_text_field((string) ($_POST['pasted_image_debug'] ?? ''));
            if ($debug !== '') {
                error_log('Creator Publishing Hub AJAX image upload missing image data for post ' . $post_id . ': ' . $debug);
            }
            wp_send_json_error(['message' => 'Choose a file, paste an image into the box, or click Use clipboard image before saving.'], 400);
        }

        $secondary_file = null;
        if (!empty($_POST['save_secondary_image'])) {
            $secondary_file = $this->image_file_from_request($post_id, 'cph_secondary_image', 'secondary_pasted_image_data', 'secondary_pasted_image_name');
            if (!is_array($secondary_file) || (int) ($secondary_file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $error_code = is_array($secondary_file) ? (int) ($secondary_file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
                if (in_array($error_code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                    wp_send_json_error(['message' => 'That Story image is larger than this WordPress upload limit.'], 413);
                }
                wp_send_json_error(['message' => 'Choose or paste the Story image before saving both images.'], 400);
            }
            if ($this->uploaded_image_orientation($secondary_file) !== 'portrait') {
                wp_send_json_error(['message' => 'Landscape image detected in the Story slot. Story images must be portrait.'], 422);
            }
        }

        $origin = sanitize_key((string) ($_POST['image_origin'] ?? 'human'));
        $origin = $origin === 'api' ? 'api' : 'human';
        $provider = $origin === 'api' ? 'api' : 'manual';
        $primary = $this->attach_cleaned_image_file($post_id, $post, $file, $provider, $origin, 'featured');
        if (is_wp_error($primary)) {
            wp_send_json_error(['message' => $primary->get_error_message()], 500);
        }

        $attachment_id = (int) $primary['attachment_id'];
        $metadata_stripped = !empty($primary['metadata_stripped']);

        set_post_thumbnail($post_id, $attachment_id);
        update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta($post_id, self::META_IMAGE_ORIGIN, $origin);
        update_post_meta($post_id, self::META_IMAGE_ATTACHED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
        update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
        delete_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED);
        if ($origin === 'human') {
            update_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE, current_time('mysql', true));
        } else {
            delete_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE);
        }
        update_post_meta($post_id, self::META_IMAGE_CREDIT, (string) $primary['credit']);
        update_post_meta($post_id, '_cph_metadata_stripped', $metadata_stripped ? '1' : '0');
        $this->record_image_claim_completion($post_id, get_current_user_id());
        $this->clear_image_claim($post_id);

        $secondary_saved = 0;
        $secondary_attachment_id = 0;
        if (!empty($_POST['save_secondary_image'])) {
            if (is_array($secondary_file)) {
                $secondary = $this->attach_cleaned_image_file($post_id, $post, $secondary_file, $provider, $origin, 'social-alt');
                if (is_wp_error($secondary)) {
                    wp_send_json_error(['message' => $secondary->get_error_message()], 500);
                }
                $secondary_attachment_id = (int) $secondary['attachment_id'];
                $this->append_secondary_social_image($post_id, $secondary_attachment_id);
                $secondary_saved = 1;
            }
        }
        update_post_meta(
            $post_id,
            self::META_STORY_REQUIRED,
            $this->secondary_social_image_ids($post_id) ? '0' : '1'
        );

        $is_published = get_post_status($post_id) === 'publish';
        wp_send_json_success([
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'attachment_id' => $attachment_id,
            'filename' => basename((string) get_attached_file($attachment_id)),
            'secondary_saved' => $secondary_saved,
            'secondary_attachment_id' => $secondary_attachment_id,
            'secondary_filename' => $secondary_attachment_id > 0 ? basename((string) get_attached_file($secondary_attachment_id)) : '',
            'secondary_count' => count($this->secondary_social_image_ids($post_id)),
            'managed_images' => $this->managed_image_items($post_id),
            'message' => sprintf(
                $is_published
                    ? 'Image replaced for "%s" (#%d). The article remains public.'
                    : 'Image saved for "%s" (#%d). It is queued for Ryzen to publish on schedule.',
                get_the_title($post_id),
                $post_id
            ),
        ]);
    }

    public function handle_auxiliary_image_upload_ajax(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !current_user_can('edit_post', $post_id)) {
            wp_send_json_error(['message' => 'Post not found or not editable.'], 403);
        }

        if (!check_ajax_referer('cph_upload_image_' . $post_id, '_wpnonce', false)) {
            wp_send_json_error(['message' => 'Security check failed. Refresh the queue and try again.'], 403);
        }

        $kind = sanitize_key((string) ($_POST['image_kind'] ?? 'story'));
        $is_main = $kind === 'main';
        $field_name = $is_main ? 'cph_image' : 'cph_secondary_image';
        $data_field = $is_main ? 'pasted_image_data' : 'secondary_pasted_image_data';
        $name_field = $is_main ? 'pasted_image_name' : 'secondary_pasted_image_name';
        $role = $is_main ? 'main-alt' : 'social-alt';
        $label = $is_main ? 'main image' : 'Story image';

        if ($is_main && (int) get_post_thumbnail_id($post_id) <= 0) {
            wp_send_json_error(['message' => 'Save the featured landscape image before adding more images.'], 409);
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $file = $this->image_file_from_request($post_id, $field_name, $data_field, $name_field);
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $error_code = is_array($file) ? (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
            if (in_array($error_code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                wp_send_json_error(['message' => 'That ' . $label . ' is larger than this WordPress upload limit.'], 413);
            }
            wp_send_json_error(['message' => 'Choose or paste a ' . $label . ' before saving.'], 400);
        }

        $orientation = $this->uploaded_image_orientation($file);
        if ($is_main && $orientation === 'portrait') {
            wp_send_json_error(['message' => 'Portrait image detected. Paste it as a Story image instead.'], 422);
        }
        if (!$is_main && $orientation !== 'portrait') {
            wp_send_json_error(['message' => 'Landscape image detected. Paste it as a featured or extra main image instead.'], 422);
        }

        $origin = sanitize_key((string) ($_POST['image_origin'] ?? 'human'));
        $origin = $origin === 'api' ? 'api' : 'human';
        $provider = $origin === 'api' ? 'api' : 'manual';
        $attached = $this->attach_cleaned_image_file($post_id, $post, $file, $provider, $origin, $role);
        if (is_wp_error($attached)) {
            wp_send_json_error(['message' => $attached->get_error_message()], 500);
        }

        $attachment_id = (int) $attached['attachment_id'];
        if ($is_main) {
            $this->append_alternate_main_image($post_id, $attachment_id);
            $count = count($this->alternate_main_image_ids($post_id)) + 1;
            $this->record_auxiliary_image_completion($post_id, get_current_user_id(), $attachment_id, 'main');
        } else {
            $this->append_secondary_social_image($post_id, $attachment_id);
            update_post_meta($post_id, self::META_STORY_REQUIRED, '0');
            $count = count($this->secondary_social_image_ids($post_id));
            $this->record_auxiliary_image_completion($post_id, get_current_user_id(), $attachment_id, 'story');
        }

        wp_send_json_success([
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'kind' => $is_main ? 'main' : 'story',
            'attachment_id' => $attachment_id,
            'filename' => basename((string) get_attached_file($attachment_id)),
            'count' => $count,
            'managed_image' => $this->managed_image_item($attachment_id, $is_main ? 'main' : 'story'),
            'managed_images' => $this->managed_image_items($post_id),
            'message' => sprintf(
                '%s saved for "%s" (#%d).',
                $is_main ? 'Extra main image' : 'Story image',
                get_the_title($post_id),
                $post_id
            ),
        ]);
    }

    public function handle_delete_managed_image_ajax(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $attachment_id = absint($_POST['attachment_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || $attachment_id <= 0 || !current_user_can('edit_post', $post_id)) {
            wp_send_json_error(['message' => 'Image not found or not editable.'], 403);
        }
        if (!check_ajax_referer('cph_manage_image', 'nonce', false)) {
            wp_send_json_error(['message' => 'Your image session expired. Refresh the page and try again.'], 403);
        }
        if (!current_user_can('delete_post', $attachment_id)) {
            wp_send_json_error(['message' => 'You do not have permission to delete that Media Library file.'], 403);
        }

        $featured_id = (int) get_post_thumbnail_id($post_id);
        $alternate_ids = $this->alternate_main_image_ids($post_id);
        $story_ids = $this->secondary_social_image_ids($post_id);
        $is_featured = $featured_id === $attachment_id;
        $is_alternate = in_array($attachment_id, $alternate_ids, true);
        $is_story = in_array($attachment_id, $story_ids, true);
        if (!$is_featured && !$is_alternate && !$is_story) {
            wp_send_json_error(['message' => 'That image is no longer attached to this post.'], 409);
        }

        if ($is_featured) {
            delete_post_thumbnail($post_id);
        } elseif ($is_alternate) {
            $this->remove_attachment_id_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES, $attachment_id);
        } else {
            $this->remove_secondary_social_image($post_id, $attachment_id);
        }

        $this->record_image_activity(
            $post_id,
            get_current_user_id(),
            $attachment_id,
            $is_featured ? 'featured' : ($is_story ? 'story' : 'main'),
            0,
            'deleted',
            'managed_image_delete'
        );
        if (!wp_delete_attachment($attachment_id, true)) {
            if ($is_featured) {
                set_post_thumbnail($post_id, $attachment_id);
            } elseif ($is_alternate) {
                $this->append_alternate_main_image($post_id, $attachment_id);
            } else {
                $this->append_secondary_social_image($post_id, $attachment_id);
            }
            wp_send_json_error(['message' => 'WordPress could not delete that image file.'], 500);
        }

        if ($is_featured) {
            $remaining_main = $this->alternate_main_image_ids($post_id);
            if ($remaining_main) {
                $new_featured = array_shift($remaining_main);
                set_post_thumbnail($post_id, $new_featured);
                if ($remaining_main) {
                    update_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES, wp_json_encode(array_values($remaining_main)));
                } else {
                    delete_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES);
                }
            } else {
                update_post_meta($post_id, self::META_IMAGE_REQUIRED, '1');
                delete_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH);
                delete_post_meta($post_id, self::META_IMAGE_READY_AT);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
            }
        } elseif ($is_story && !$this->secondary_social_image_ids($post_id)) {
            update_post_meta($post_id, self::META_STORY_REQUIRED, '1');
        }

        wp_send_json_success([
            'message' => 'Image deleted from the post and Media Library.',
            'deleted_attachment_id' => $attachment_id,
            'featured_media' => (int) get_post_thumbnail_id($post_id),
            'managed_images' => $this->managed_image_items($post_id),
        ]);
    }

    public function handle_delete_all_managed_images_ajax(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || !current_user_can('edit_post', $post_id)) {
            wp_send_json_error(['message' => 'Content not found or not editable.'], 403);
        }
        if (!check_ajax_referer('cph_manage_image', 'nonce', false)) {
            wp_send_json_error(['message' => 'Your image session expired. Refresh the page and try again.'], 403);
        }

        $featured_id = (int) get_post_thumbnail_id($post_id);
        $alternate_ids = $this->alternate_main_image_ids($post_id);
        $story_ids = $this->secondary_social_image_ids($post_id);
        $attachment_ids = array_values(array_unique(array_filter(array_merge([$featured_id], $alternate_ids, $story_ids))));
        if (!$attachment_ids) {
            wp_send_json_error(['message' => 'This post has no managed images to delete.'], 409);
        }

        foreach ($attachment_ids as $attachment_id) {
            if (!current_user_can('delete_post', $attachment_id)) {
                wp_send_json_error(['message' => 'You do not have permission to delete every media file on this post.'], 403);
            }
        }

        delete_post_thumbnail($post_id);
        delete_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES);
        delete_post_meta($post_id, self::META_SECONDARY_SOCIAL_IMAGES);

        $deleted_count = 0;
        $failed_ids = [];
        foreach ($attachment_ids as $attachment_id) {
            $type = $attachment_id === $featured_id
                ? 'featured'
                : (in_array($attachment_id, $story_ids, true) ? 'story' : 'main');
            $this->record_image_activity($post_id, get_current_user_id(), $attachment_id, $type, 0, 'deleted', 'managed_images_delete_all');
            if (wp_delete_attachment($attachment_id, true)) {
                $deleted_count++;
            } else {
                $failed_ids[] = $attachment_id;
            }
        }

        update_post_meta($post_id, self::META_IMAGE_REQUIRED, '1');
        update_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED, '1');
        update_post_meta($post_id, self::META_STORY_REQUIRED, '1');
        delete_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH);
        delete_post_meta($post_id, self::META_IMAGE_READY_AT);
        delete_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER);
        delete_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE);
        delete_post_meta($post_id, self::META_IMAGE_ORIGIN);
        delete_post_meta($post_id, self::META_IMAGE_CREDIT);
        delete_post_meta($post_id, self::META_IMAGE_ATTACHED_AT);
        if ((string) get_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS, true) === 'queued') {
            delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
            delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
        }

        if ($failed_ids) {
            wp_send_json_error([
                'message' => 'Some image files could not be deleted: ' . implode(', ', array_map('strval', $failed_ids)),
                'deleted_count' => $deleted_count,
                'managed_images' => $this->managed_image_items($post_id),
            ], 500);
        }

        wp_send_json_success([
            'message' => 'Deleted all managed images. Paste the featured landscape image again.',
            'deleted_count' => $deleted_count,
            'featured_media' => 0,
            'managed_images' => [],
        ]);
    }

    private function delete_managed_images_for_post(int $post_id, int $user_id = 0): void {
        $featured_id = (int) get_post_thumbnail_id($post_id);
        $alternate_ids = $this->alternate_main_image_ids($post_id);
        $story_ids = $this->secondary_social_image_ids($post_id);
        $attachment_ids = array_values(array_unique(array_filter(array_merge([$featured_id], $alternate_ids, $story_ids))));

        delete_post_thumbnail($post_id);
        delete_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES);
        delete_post_meta($post_id, self::META_SECONDARY_SOCIAL_IMAGES);

        foreach ($attachment_ids as $attachment_id) {
            $type = $attachment_id === $featured_id
                ? 'featured'
                : (in_array($attachment_id, $story_ids, true) ? 'story' : 'main');
            if ($user_id > 0) {
                $this->record_image_activity($post_id, $user_id, $attachment_id, $type, 0, 'deleted', 'paid_api_replace');
            }
            wp_delete_attachment($attachment_id, true);
        }

        delete_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH);
        delete_post_meta($post_id, self::META_IMAGE_READY_AT);
        delete_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER);
        delete_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE);
        delete_post_meta($post_id, self::META_IMAGE_ORIGIN);
        delete_post_meta($post_id, self::META_IMAGE_CREDIT);
        delete_post_meta($post_id, self::META_IMAGE_ATTACHED_AT);
    }

    public function handle_grab_image_batch_ajax(): void {
        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'You do not have permission to reserve image jobs.'], 403);
        }

        if (!check_ajax_referer('cph_grab_image_batch', 'nonce', false)) {
            wp_send_json_error(['message' => 'Security check failed. Refresh Image Desk and try again.'], 403);
        }

        $user_id = get_current_user_id();
        $now = current_time('timestamp', true);
        $this->ensure_image_claim_batch($user_id);
        $active_count = $this->active_image_claim_count($user_id, $now);
        $needed = max(0, self::IMAGE_CLAIM_BATCH_SIZE - $active_count);

        if ($needed <= 0) {
            wp_send_json_success([
                'count' => 0,
                'message' => 'Your current image batch is already full.',
            ]);
        }

        $candidates = get_posts([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future'],
            'posts_per_page' => min(100, max(30, $needed * 5)),
            'orderby' => 'date',
            'order' => 'DESC',
            'meta_query' => [
                'relation' => 'AND',
                [
                    'relation' => 'OR',
                    [
                        'key' => self::META_IMAGE_REQUIRED,
                        'compare' => 'NOT EXISTS',
                    ],
                    [
                        'key' => self::META_IMAGE_REQUIRED,
                        'value' => '1',
                        'compare' => '!=',
                    ],
                ],
            ],
        ]);

        $candidates = array_values(array_filter($candidates, function ($post) use ($user_id, $now): bool {
            if (!$post instanceof WP_Post || !$this->image_claim_allows_user((int) $post->ID, $user_id, $now)) {
                return false;
            }

            $post_id = (int) $post->ID;
            $thumbnail_id = (int) get_post_thumbnail_id($post_id);
            if ($thumbnail_id <= 0) {
                return true;
            }

            $origin = sanitize_key((string) get_post_meta($post_id, self::META_IMAGE_ORIGIN, true));
            $provider = sanitize_key((string) get_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, true));
            $completed_by = (int) get_post_meta($post_id, self::META_IMAGE_COMPLETED_BY, true);

            if ($origin !== 'human' || $provider !== 'manual') {
                return true;
            }

            return $completed_by > 0 && $completed_by !== $user_id;
        }));
        usort($candidates, fn(WP_Post $a, WP_Post $b): int => $this->image_trend_score($b)['score'] <=> $this->image_trend_score($a)['score']);
        $candidates = array_slice($candidates, 0, $needed);

        foreach ($candidates as $candidate) {
            $candidate_id = (int) $candidate->ID;
            update_post_meta($candidate_id, self::META_IMAGE_REQUIRED, '1');
            if ((int) get_post_thumbnail_id($candidate_id) > 0) {
                update_post_meta($candidate_id, self::META_IMAGE_REDO_REQUIRED, '1');
            }
        }
        $this->claim_needs_image_posts($candidates, $user_id);
        update_user_meta($user_id, self::USER_META_IMAGE_BATCH_EXPIRES, (string) ($now + self::IMAGE_CLAIM_TTL_SECONDS));

        $count = count($candidates);
        wp_send_json_success([
            'count' => $count,
            'message' => $count > 0
                ? sprintf('Reserved %d more image job%s for this session.', $count, $count === 1 ? '' : 's')
                : 'No additional unprocessed posts are available right now.',
        ]);
    }

    public function handle_start_image_processing_ajax(): void {
        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'You do not have permission to start image processing.'], 403);
        }

        if (!check_ajax_referer('cph_start_image_processing', 'nonce', false)) {
            wp_send_json_error(['message' => 'Your processing session expired. Refresh Image Desk and try again.'], 403);
        }

        $user_id = get_current_user_id();
        $category = sanitize_key((string) ($_POST['category'] ?? ''));
        $search = sanitize_text_field((string) wp_unslash($_POST['search'] ?? ''));
        $this->ensure_image_claim_batch($user_id);
        $items = $this->needs_image_items(
            self::IMAGE_PROCESSING_BATCH_SIZE,
            0,
            $category,
            $search,
            $user_id,
            true
        );
        $jobs = array_values(array_filter(
            array_map([$this, 'image_production_item'], $items),
            static fn(array $job): bool => !empty($job['required_roles']) || !empty($job['review_roles'])
        ));

        if (!$jobs) {
            wp_send_json_success([
                'count' => 0,
                'message' => 'No missing or flagged image roles are waiting in this batch.',
                'codex_request' => '',
            ]);
        }

        $started_at = current_time('mysql', true);
        foreach ($jobs as $job) {
            $post_id = (int) ($job['post_id'] ?? 0);
            update_post_meta($post_id, self::META_IMAGE_PROCESSING_STARTED_BY, (string) $user_id);
            update_post_meta($post_id, self::META_IMAGE_PROCESSING_STARTED_AT, $started_at);
        }

        $site_name = get_bloginfo('name') ?: 'this WordPress site';
        $request = sprintf(
            "Work the %s WordPress Image Desk processing batch below. Generate and attach only each job's required_roles. For review_roles, inspect the existing image first: approve it if it is visibly good, or reject it and regenerate only that role if it is poor. Keep every preserve_roles companion unchanged. Use the role-specific prompt and the exact site_logo_url supplied for this site; do not substitute a personal portrait or another site's logo. Verify every approval or completed Landscape/Story in the rendered WordPress Image Desk card before moving to the next job. Process these jobs in order because redo, known bad providers, and missing work are prioritized first. If an authenticated worker token is already available locally, the completion endpoint is %s; never paste that token into chat. Otherwise use the existing paste/upload controls on %s.\n\n%s",
            $site_name,
            rest_url(self::REST_NAMESPACE . '/image-production/complete'),
            admin_url('admin.php?page=creator-needs-images'),
            wp_json_encode($jobs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        wp_send_json_success([
            'count' => count($jobs),
            'post_ids' => array_map(static fn(array $job): int => (int) $job['post_id'], $jobs),
            'started_at' => $started_at,
            'feed_url' => rest_url(self::REST_NAMESPACE . '/image-production/jobs?per_page=' . self::IMAGE_PROCESSING_BATCH_SIZE),
            'complete_url' => rest_url(self::REST_NAMESPACE . '/image-production/complete'),
            'codex_request' => $request,
            'message' => sprintf(
                'Started %d image job%s and copied the Codex request.',
                count($jobs),
                count($jobs) === 1 ? '' : 's'
            ),
        ]);
    }

    public function handle_create_image_draft_ajax(): void {
        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'You do not have permission to create drafts.'], 403);
        }

        if (!check_ajax_referer('cph_create_image_draft', 'nonce', false)) {
            wp_send_json_error(['message' => 'Security check failed. Refresh Image Desk and try again.'], 403);
        }

        $title = trim(sanitize_text_field((string) wp_unslash($_POST['title'] ?? '')));
        $raw_content = trim((string) wp_unslash($_POST['content'] ?? ''));
        $content = wp_kses_post(wpautop($raw_content));
        $category_id = absint($_POST['category_id'] ?? 0);
        $source_url = esc_url_raw(trim((string) wp_unslash($_POST['source_url'] ?? '')));
        $tag_text = sanitize_text_field((string) wp_unslash($_POST['tags'] ?? ''));
        $tags = array_values(array_unique(array_filter(array_map('trim', explode(',', $tag_text)))));

        if ($title === '' || wp_strip_all_tags($content) === '') {
            wp_send_json_error(['message' => 'Add both a title and story text.'], 400);
        }

        if ($source_url !== '' && !wp_http_validate_url($source_url)) {
            wp_send_json_error(['message' => 'Enter a complete http or https source URL.'], 400);
        }

        $category = $category_id > 0 ? get_term($category_id, 'category') : null;
        if (!$category instanceof WP_Term) {
            wp_send_json_error(['message' => 'Choose a valid category.'], 400);
        }

        $sources = $source_url !== '' ? [$source_url] : [];
        $existing_id = $this->find_existing_post_for_ingest($title, $sources);
        if ($existing_id > 0) {
            wp_send_json_error([
                'message' => sprintf('A matching post already exists: #%d, %s.', $existing_id, get_the_title($existing_id)),
                'post_id' => $existing_id,
                'review_url' => admin_url('admin.php?page=creator-image-review&fir_search=' . $existing_id),
            ], 409);
        }

        $post_id = wp_insert_post([
            'post_title' => $title,
            'post_content' => $content,
            'post_excerpt' => wp_trim_words(wp_strip_all_tags($content), 40),
            'post_status' => 'draft',
            'post_type' => 'post',
            'post_category' => [$category_id],
            'meta_input' => [
                self::META_SOURCES => wp_json_encode($sources),
                self::META_CONFIDENCE => '0',
                self::META_WORKER => 'image-desk-human',
                self::META_STORY_REQUIRED => '1',
                self::META_IMAGE_REQUIRED => '1',
                self::META_IMAGE_WATERMARK => 'site-logo-lower-right',
                self::META_FEATURED_IMAGE_PROVIDER => 'unknown',
                self::META_PAGE_PROFILE => $page_profile,
                self::META_SITE_NAME => $brand_name,
            ],
        ], true);

        if (is_wp_error($post_id)) {
            wp_send_json_error(['message' => $post_id->get_error_message()], 500);
        }

        if ($tags) {
            wp_set_post_tags($post_id, $tags, false);
        }

        $user_id = get_current_user_id();
        $now = current_time('timestamp', true);
        $claim_expires = $now + self::IMAGE_CLAIM_TTL_SECONDS;
        update_post_meta($post_id, self::META_IMAGE_CLAIM_USER, $user_id);
        update_post_meta($post_id, self::META_IMAGE_CLAIMED_AT, $now);
        update_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES, $claim_expires);
        update_user_meta($user_id, self::USER_META_IMAGE_BATCH_EXPIRES, $claim_expires);

        wp_send_json_success([
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'edit_url' => get_edit_post_link($post_id, 'raw'),
            'desk_url' => admin_url('admin.php?page=creator-needs-images&fni_search=' . $post_id),
            'message' => sprintf('Draft #%d created and reserved to you.', $post_id),
        ], 201);
    }

    public function handle_run_paid_image_api_ajax(): void {
        if (!$this->current_user_can_run_paid_image_api()) {
            wp_send_json_error(['message' => 'Only mmurphy may run the paid image API lane.'], 403);
        }

        if (!check_ajax_referer('cph_run_paid_image_api', 'nonce', false)) {
            wp_send_json_error(['message' => 'Your paid image session expired. Refresh Image Desk and try again.'], 403);
        }

        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !current_user_can('edit_post', $post_id)) {
            wp_send_json_error(['message' => 'Post not found or not editable.'], 404);
        }

        $api_key = $this->openai_image_api_key();
        if ($api_key === '') {
            wp_send_json_error(['message' => 'Add the OpenAI image API key in Creator Publishing Hub settings before using the paid image lane.'], 409);
        }

        $category_names = wp_get_post_categories($post_id, ['fields' => 'names']);
        $category_label = $category_names ? implode(', ', $category_names) : 'Uncategorized';
        $summary = get_the_excerpt($post_id);
        if ($summary === '') {
            $summary = wp_trim_words(wp_strip_all_tags((string) $post->post_content), 34);
        }

        $featured_prompt = (string) get_post_meta($post_id, self::META_FEATURED_IMAGE_PROMPT, true);
        $social_prompt = (string) get_post_meta($post_id, self::META_SOCIAL_IMAGE_PROMPT, true);
        $story_prompt = (string) get_post_meta($post_id, self::META_STORY_IMAGE_PROMPT, true);
        $source_prompt = $social_prompt ?: $featured_prompt;

        $landscape_prompt = $this->human_image_prompt([
            'title' => get_the_title($post_id),
            'category' => $category_label,
            'summary' => $summary,
            'source_prompt' => $source_prompt,
            'content' => wp_strip_all_tags((string) $post->post_content),
        ]);
        $story_prompt = $this->story_image_prompt_for_post($post, $summary, $story_prompt);

        $generated_featured = $this->generate_openai_image_payload($api_key, $landscape_prompt, '1536x1024');
        if (is_wp_error($generated_featured)) {
            wp_send_json_error(['message' => $generated_featured->get_error_message()], 502);
        }

        $generated_story = $this->generate_openai_image_payload($api_key, $story_prompt, '1080x1920');
        if (is_wp_error($generated_story)) {
            wp_send_json_error(['message' => $generated_story->get_error_message()], 502);
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $current_user = wp_get_current_user();
        $current_user_id = $current_user instanceof WP_User ? (int) $current_user->ID : 0;
        $this->delete_managed_images_for_post($post_id, $current_user_id);

        $featured_file = $this->image_file_from_base64_payload(
            $post_id,
            (string) $generated_featured['b64_json'],
            'featured-image-' . $post_id . '.png'
        );
        if (is_wp_error($featured_file)) {
            wp_send_json_error(['message' => $featured_file->get_error_message()], 500);
        }

        $story_file = $this->image_file_from_base64_payload(
            $post_id,
            (string) $generated_story['b64_json'],
            'story-image-' . $post_id . '.png'
        );
        if (is_wp_error($story_file)) {
            wp_send_json_error(['message' => $story_file->get_error_message()], 500);
        }

        $provider = 'openai';
        $origin = 'api';
        $featured = $this->attach_cleaned_image_file($post_id, $post, $featured_file, $provider, $origin, 'featured');
        if (is_wp_error($featured)) {
            wp_send_json_error(['message' => $featured->get_error_message()], 500);
        }

        $featured_attachment_id = (int) ($featured['attachment_id'] ?? 0);
        if ($featured_attachment_id <= 0) {
            wp_send_json_error(['message' => 'The featured API image could not be attached.'], 500);
        }

        set_post_thumbnail($post_id, $featured_attachment_id);
        if ($current_user_id > 0) {
            $this->record_api_image_activity($post_id, $current_user_id, $featured_attachment_id, 'featured', $provider);
        }

        $story = $this->attach_cleaned_image_file($post_id, $post, $story_file, $provider, $origin, 'social-alt');
        if (is_wp_error($story)) {
            wp_send_json_error(['message' => $story->get_error_message()], 500);
        }

        $story_attachment_id = (int) ($story['attachment_id'] ?? 0);
        if ($story_attachment_id > 0) {
            $this->append_secondary_social_image($post_id, $story_attachment_id);
            if ($current_user_id > 0) {
                $this->record_api_image_activity($post_id, $current_user_id, $story_attachment_id, 'story', $provider);
            }
        }

        update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta($post_id, self::META_IMAGE_ORIGIN, $origin);
        update_post_meta($post_id, self::META_IMAGE_CREDIT, 'OpenAI');
        update_post_meta($post_id, self::META_IMAGE_ATTACHED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
        update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
        delete_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED);
        delete_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE);
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGER_USER_ID, (string) $current_user_id);
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGER_USER_LOGIN, $current_user instanceof WP_User ? (string) $current_user->user_login : '');
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGER_USER_NAME, $current_user instanceof WP_User ? (string) $current_user->display_name : '');
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGERED_AT, current_time('mysql', true));
        if ($current_user_id > 0) {
            $this->record_image_claim_completion($post_id, $current_user_id);
        }
        $this->clear_image_claim($post_id);

        wp_send_json_success([
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'featured_media' => $featured_attachment_id,
            'story_attachment_id' => $story_attachment_id,
            'managed_images' => $this->managed_image_items($post_id),
            'message' => sprintf('Paid API images generated for "%s" (#%d).', get_the_title($post_id), $post_id),
        ]);
    }

    public function handle_image_desk_search_ajax(): void {
        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'You do not have permission to search posts.'], 403);
        }

        if (!check_ajax_referer('cph_image_desk_search', 'nonce', false)) {
            wp_send_json_error(['message' => 'Search security check failed. Refresh the page and try again.'], 403);
        }

        $mode = sanitize_key((string) ($_POST['mode'] ?? 'everything'));
        if (!in_array($mode, ['everything', 'post_id', 'text'], true)) {
            $mode = 'everything';
        }

        $query = trim(sanitize_text_field((string) wp_unslash($_POST['query'] ?? '')));
        if ($query === '') {
            wp_send_json_error(['message' => 'Type a post number, title, or article text to search.'], 400);
        }

        $posts = [];
        $seen = [];
        $add_post = static function ($post) use (&$posts, &$seen): void {
            if (!$post instanceof WP_Post || $post->post_type !== 'post' || isset($seen[$post->ID])) {
                return;
            }

            $seen[$post->ID] = true;
            $posts[] = $post;
        };

        if (($mode === 'post_id' || $mode === 'everything') && ctype_digit($query)) {
            $add_post(get_post((int) $query));
        }

        if ($mode !== 'post_id') {
            $search_query = new WP_Query([
                'post_type' => 'post',
                'post_status' => ['publish', 'draft', 'pending', 'future', 'private', 'trash'],
                'posts_per_page' => 20,
                's' => $query,
                'orderby' => 'modified',
                'order' => 'DESC',
            ]);
            foreach ($search_query->posts as $post) {
                $add_post($post);
            }
        }

        $items = array_map(fn(WP_Post $post): array => $this->image_search_result_item($post), array_slice($posts, 0, 20));

        wp_send_json_success([
            'mode' => $mode,
            'query' => $query,
            'count' => count($items),
            'items' => $items,
        ]);
    }

    public function handle_replace_post_image(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        $redirect = $this->safe_admin_redirect((string) ($_POST['redirect_to'] ?? admin_url('admin.php?page=creator-image-review')));

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || !current_user_can('edit_post', $post_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('Content not found or not editable.'), $redirect));
            exit;
        }

        check_admin_referer('cph_replace_post_image_' . $post_id);

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $file = $this->image_file_from_request($post_id);
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $message = 'Choose a replacement PNG, JPG, or WebP image.';
            if (is_array($file) && in_array((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                $message = 'That image is larger than this WordPress upload limit.';
            }
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode($message), $redirect));
            exit;
        }

        $origin = !empty($_POST['image_origin']) && (string) $_POST['image_origin'] === 'api' ? 'api' : 'human';
        $provider = $origin === 'api' ? 'api' : 'manual';
        $primary = $this->attach_cleaned_image_file($post_id, $post, $file, $provider, $origin, 'featured');
        if (is_wp_error($primary)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode($primary->get_error_message()), $redirect));
            exit;
        }

        $attachment_id = (int) $primary['attachment_id'];
        $metadata_stripped = !empty($primary['metadata_stripped']);
        set_post_thumbnail($post_id, $attachment_id);
        update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta($post_id, self::META_IMAGE_ORIGIN, $origin);
        update_post_meta($post_id, self::META_IMAGE_ATTACHED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
        update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
        delete_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED);
        update_post_meta($post_id, self::META_IMAGE_CREDIT, (string) $primary['credit']);
        update_post_meta($post_id, '_cph_metadata_stripped', $metadata_stripped ? '1' : '0');

        wp_safe_redirect(add_query_arg([
            'fir_replaced' => '1',
            'fir_post_id' => (string) $post_id,
        ], $redirect));
        exit;
    }

    public function handle_add_story_image(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        $redirect = $this->safe_admin_redirect((string) ($_POST['redirect_to'] ?? admin_url('admin.php?page=creator-image-review')));

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || !current_user_can('edit_post', $post_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('Content not found or not editable.'), $redirect));
            exit;
        }

        check_admin_referer('cph_add_story_image_' . $post_id);

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $file = $this->image_file_from_request($post_id, 'cph_story_image', 'story_pasted_image_data', 'story_pasted_image_name');
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $message = 'Choose a Story PNG, JPG, or WebP image.';
            if (is_array($file) && in_array((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                $message = 'That Story image is larger than this WordPress upload limit.';
            }
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode($message), $redirect));
            exit;
        }

        $origin = !empty($_POST['image_origin']) && (string) $_POST['image_origin'] === 'api' ? 'api' : 'human';
        $provider = $origin === 'api' ? 'api' : 'manual';
        $story = $this->attach_cleaned_image_file($post_id, $post, $file, $provider, $origin, 'social-alt');
        if (is_wp_error($story)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode($story->get_error_message()), $redirect));
            exit;
        }

        $attachment_id = (int) $story['attachment_id'];
        $this->append_secondary_social_image($post_id, $attachment_id);
        $this->record_auxiliary_image_completion($post_id, get_current_user_id(), $attachment_id, 'story');

        wp_safe_redirect(add_query_arg([
            'fir_story_added' => '1',
            'fir_post_id' => (string) $post_id,
        ], $redirect));
        exit;
    }

    public function handle_delete_featured_image(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $attachment_id = absint($_POST['attachment_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        $redirect = $this->safe_admin_redirect((string) ($_POST['redirect_to'] ?? admin_url('admin.php?page=creator-image-review')));

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || $attachment_id <= 0 || !current_user_can('edit_post', $post_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('Featured image not found or not editable.'), $redirect));
            exit;
        }

        check_admin_referer('cph_delete_featured_image_' . $post_id . '_' . $attachment_id);
        if ((int) get_post_thumbnail_id($post_id) !== $attachment_id) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('That media file is no longer the featured image.'), $redirect));
            exit;
        }
        if (!current_user_can('delete_post', $attachment_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('You do not have permission to delete that media file.'), $redirect));
            exit;
        }

        delete_post_thumbnail($post_id);
        $this->record_image_activity($post_id, get_current_user_id(), $attachment_id, 'featured', 0, 'deleted', 'featured_image_delete');
        if (!wp_delete_attachment($attachment_id, true)) {
            set_post_thumbnail($post_id, $attachment_id);
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('WordPress could not delete the featured image file.'), $redirect));
            exit;
        }

        $alternate_ids = array_values(array_filter($this->alternate_main_image_ids($post_id), static fn(int $id): bool => $id !== $attachment_id));
        if ($alternate_ids) {
            $new_featured = array_shift($alternate_ids);
            set_post_thumbnail($post_id, $new_featured);
            update_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES, $alternate_ids);
        } else {
            delete_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES);
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '1');
            delete_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH);
            delete_post_meta($post_id, self::META_IMAGE_READY_AT);
            delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
            delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
        }

        wp_safe_redirect(add_query_arg([
            'fir_featured_deleted' => '1',
            'fir_post_id' => (string) $post_id,
        ], $redirect));
        exit;
    }

    public function handle_delete_story_image(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $attachment_id = absint($_POST['attachment_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        $redirect = $this->safe_admin_redirect((string) ($_POST['redirect_to'] ?? admin_url('admin.php?page=creator-image-review')));

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || $attachment_id <= 0 || !current_user_can('edit_post', $post_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('Story image not found or not editable.'), $redirect));
            exit;
        }

        check_admin_referer('cph_delete_story_image_' . $post_id . '_' . $attachment_id);

        $story_ids = $this->secondary_social_image_ids($post_id);
        if (!in_array($attachment_id, $story_ids, true)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('That Story image is not attached to this post.'), $redirect));
            exit;
        }

        if (!current_user_can('delete_post', $attachment_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('You do not have permission to delete that media file.'), $redirect));
            exit;
        }

        $this->remove_secondary_social_image($post_id, $attachment_id);
        $this->record_image_activity($post_id, get_current_user_id(), $attachment_id, 'story', 0, 'deleted', 'story_image_delete');
        $deleted = wp_delete_attachment($attachment_id, true);
        if (!$deleted) {
            $this->append_secondary_social_image($post_id, $attachment_id);
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('WordPress could not delete that Story image file.'), $redirect));
            exit;
        }
        if (!$this->secondary_social_image_ids($post_id)) {
            update_post_meta($post_id, self::META_STORY_REQUIRED, '1');
        }

        wp_safe_redirect(add_query_arg([
            'fir_story_deleted' => '1',
            'fir_post_id' => (string) $post_id,
        ], $redirect));
        exit;
    }

    public function handle_delete_all_post_images(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        $redirect = $this->safe_admin_redirect((string) ($_POST['redirect_to'] ?? admin_url('admin.php?page=creator-image-review')));

        if (!$post || !in_array($post->post_type, ['post', 'page'], true) || !current_user_can('edit_post', $post_id)) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('Content not found or not editable.'), $redirect));
            exit;
        }

        check_admin_referer('cph_delete_all_post_images_' . $post_id);

        $featured_id = (int) get_post_thumbnail_id($post_id);
        $alternate_ids = $this->alternate_main_image_ids($post_id);
        $story_ids = $this->secondary_social_image_ids($post_id);
        $attachment_ids = array_values(array_unique(array_filter(array_merge([$featured_id], $alternate_ids, $story_ids))));

        if (!$attachment_ids) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode('This post has no managed images to delete.'), $redirect));
            exit;
        }

        foreach ($attachment_ids as $attachment_id) {
            if (!current_user_can('delete_post', $attachment_id)) {
                wp_safe_redirect(add_query_arg('fir_error', rawurlencode('You do not have permission to delete every media file on this post.'), $redirect));
                exit;
            }
        }

        delete_post_thumbnail($post_id);
        delete_post_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES);
        delete_post_meta($post_id, self::META_SECONDARY_SOCIAL_IMAGES);

        $deleted_count = 0;
        $failed_ids = [];
        foreach ($attachment_ids as $attachment_id) {
            $type = $attachment_id === $featured_id
                ? 'featured'
                : (in_array($attachment_id, $story_ids, true) ? 'story' : 'main');
            $this->record_image_activity($post_id, get_current_user_id(), $attachment_id, $type, 0, 'deleted', 'post_images_delete_all');
            if (wp_delete_attachment($attachment_id, true)) {
                $deleted_count++;
            } else {
                $failed_ids[] = $attachment_id;
                if ($attachment_id === $featured_id) {
                    set_post_thumbnail($post_id, $attachment_id);
                } elseif (in_array($attachment_id, $alternate_ids, true)) {
                    $this->append_alternate_main_image($post_id, $attachment_id);
                } elseif (in_array($attachment_id, $story_ids, true)) {
                    $this->append_secondary_social_image($post_id, $attachment_id);
                }
            }
        }

        if ((int) get_post_thumbnail_id($post_id) <= 0) {
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '1');
            delete_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH);
            delete_post_meta($post_id, self::META_IMAGE_READY_AT);
            delete_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER);
            delete_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE);
            delete_post_meta($post_id, self::META_IMAGE_ORIGIN);
            delete_post_meta($post_id, self::META_IMAGE_CREDIT);
            delete_post_meta($post_id, self::META_IMAGE_ATTACHED_AT);
            if ((string) get_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS, true) === 'queued') {
                delete_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS);
                delete_post_meta($post_id, self::META_SOCIAL_QUEUED_AT);
            }
        }

        if ($failed_ids) {
            wp_safe_redirect(add_query_arg('fir_error', rawurlencode(sprintf(
                '%d image%s deleted, but WordPress could not delete media ID%s %s.',
                $deleted_count,
                $deleted_count === 1 ? '' : 's',
                count($failed_ids) === 1 ? '' : 's',
                implode(', ', $failed_ids)
            )), $redirect));
            exit;
        }

        wp_safe_redirect(add_query_arg([
            'fir_images_deleted' => '1',
            'fir_deleted_count' => (string) $deleted_count,
            'fir_post_id' => (string) $post_id,
        ], $redirect));
        exit;
    }

    public function handle_trash_image_draft(): void {
        $post_id = absint($_POST['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post' || !current_user_can('delete_post', $post_id)) {
            $this->redirect_needs_images('Post not found or not trashable.');
        }

        check_admin_referer('cph_trash_image_draft_' . $post_id);

        $status = get_post_status($post_id);
        if (!in_array($status, ['draft', 'pending', 'future', 'publish'], true)) {
            $this->redirect_needs_images('Only active Image Desk articles can be trashed from this page.');
        }

        $trashed = wp_trash_post($post_id);
        if (!$trashed) {
            $this->redirect_needs_images('WordPress could not move that article to Trash.');
        }
        $this->clear_image_claim($post_id);

        $redirect = $this->safe_needs_images_redirect((string) ($_POST['redirect_to'] ?? ''));
        wp_safe_redirect(add_query_arg('fni_trashed', '1', $redirect));
        exit;
    }

    private function suppress_instant_social_share(int $post_id): void {
        update_post_meta($post_id, '_wpas_skip_publicize', 1);
        update_post_meta($post_id, '_publicize_pending', 0);
    }

    public function disable_publicize_for_queued_posts(bool $should_publicize, $post): bool {
        $post_id = is_object($post) && isset($post->ID) ? (int) $post->ID : (int) $post;
        if ($post_id > 0 && (string) get_post_meta($post_id, '_wpas_skip_publicize', true) !== '') {
            return false;
        }

        return $should_publicize;
    }

    private function queue_social_share(int $post_id): void {
        if (get_post_status($post_id) !== 'publish') {
            return;
        }

        update_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS, 'queued');
        update_post_meta($post_id, self::META_SOCIAL_QUEUED_AT, current_time('mysql', true));
        delete_post_meta($post_id, self::META_SOCIAL_SHARED_AT);
        delete_post_meta($post_id, self::META_SOCIAL_SHARE_ID);
    }

    public function rest_social_queue(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(50, max(1, (int) $request->get_param('per_page')));
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'numberposts' => $per_page,
            'orderby' => 'meta_value',
            'order' => 'ASC',
            'meta_key' => self::META_SOCIAL_QUEUED_AT,
            'meta_query' => [
                'relation' => 'AND',
                [
                    'key' => self::META_SOCIAL_QUEUE_STATUS,
                    'value' => 'queued',
                ],
                [
                    'key' => '_thumbnail_id',
                    'compare' => 'EXISTS',
                ],
            ],
        ]);
        $items = [];

        foreach ($posts as $post) {
            $caption = (string) get_post_meta($post->ID, self::META_SOCIAL, true);
            $secondary_images = $this->secondary_social_image_items($post->ID);
            $items[] = [
                'post_id' => (int) $post->ID,
                'title' => get_the_title($post->ID),
                'permalink' => get_permalink($post->ID),
                'featured_media' => (int) get_post_thumbnail_id($post->ID),
                'secondary_social_images' => $secondary_images,
                'secondary_social_image_count' => count($secondary_images),
                'social_caption' => $caption,
                'queued_at' => (string) get_post_meta($post->ID, self::META_SOCIAL_QUEUED_AT, true),
            ];
        }

        return new WP_REST_Response([
            'ok' => true,
            'count' => count($items),
            'items' => $items,
        ]);
    }

    public function rest_mark_social_shared(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $post_id = absint($payload['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found.', ['status' => 404]);
        }

        $share_id = sanitize_text_field((string) ($payload['share_id'] ?? ''));
        update_post_meta($post_id, self::META_SOCIAL_QUEUE_STATUS, 'shared');
        update_post_meta($post_id, self::META_SOCIAL_SHARED_AT, current_time('mysql', true));
        if ($share_id !== '') {
            update_post_meta($post_id, self::META_SOCIAL_SHARE_ID, $share_id);
        }

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'status' => 'shared',
            'share_id' => $share_id,
        ]);
    }

    private function image_work_meta_query(): array {
        return [
            'relation' => 'OR',
            [
                'key' => self::META_IMAGE_REQUIRED,
                'value' => '1',
            ],
            [
                'key' => self::META_IMAGE_REDO_REQUIRED,
                'value' => '1',
            ],
            [
                'key' => self::META_STORY_REQUIRED,
                'value' => '1',
            ],
            [
                'key' => '_thumbnail_id',
                'compare' => 'NOT EXISTS',
            ],
            [
                'key' => '_thumbnail_id',
                'value' => '0',
                'compare' => '=',
                'type' => 'NUMERIC',
            ],
            [
                'relation' => 'AND',
                [
                    'key' => '_thumbnail_id',
                    'compare' => 'EXISTS',
                ],
                [
                    'key' => self::META_SECONDARY_SOCIAL_IMAGES,
                    'compare' => 'NOT EXISTS',
                ],
            ],
            [
                'key' => self::META_FEATURED_IMAGE_PROVIDER,
                'value' => ['pytorch', 'torch', 'stable-diffusion', 'sdxl', 'template', 'legacy', 'local-ai', 'automatic', 'unknown'],
                'compare' => 'IN',
            ],
            [
                'relation' => 'AND',
                [
                    'key' => '_thumbnail_id',
                    'compare' => 'EXISTS',
                ],
                [
                    'key' => self::META_FEATURED_IMAGE_PROVIDER,
                    'compare' => 'NOT EXISTS',
                ],
            ],
        ];
    }

    private function ensure_image_claim_batch(int $user_id): void {
        if ($user_id <= 0) {
            return;
        }

        $now = current_time('timestamp', true);
        $active_count = $this->active_image_claim_count($user_id, $now);
        $batch_expires = (int) get_user_meta($user_id, self::USER_META_IMAGE_BATCH_EXPIRES, true);
        if ($active_count > 0 && $batch_expires > $now) {
            return;
        }

        $claim_needed = max(0, self::IMAGE_CLAIM_BATCH_SIZE - $active_count);
        if ($claim_needed <= 0) {
            update_user_meta($user_id, self::USER_META_IMAGE_BATCH_EXPIRES, (string) ($now + self::IMAGE_CLAIM_TTL_SECONDS));
            return;
        }

        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future'],
            'posts_per_page' => min(250, max($claim_needed, self::IMAGE_CLAIM_BATCH_SIZE * 5)),
            'orderby' => 'modified',
            'order' => 'DESC',
            'meta_query' => [
                'relation' => 'AND',
                $this->image_work_meta_query(),
                [
                    'relation' => 'OR',
                    [
                        'key' => self::META_IMAGE_CLAIM_USER,
                        'compare' => 'NOT EXISTS',
                    ],
                    [
                        'key' => self::META_IMAGE_CLAIM_USER,
                        'value' => '',
                    ],
                    [
                        'key' => self::META_IMAGE_CLAIM_EXPIRES,
                        'value' => (string) $now,
                        'compare' => '<=',
                        'type' => 'NUMERIC',
                    ],
                ],
            ],
        ]);

        usort($posts, fn(WP_Post $a, WP_Post $b): int => $this->image_trend_score($b)['score'] <=> $this->image_trend_score($a)['score']);
        $posts = array_slice($posts, 0, $claim_needed);

        $this->claim_needs_image_posts($posts, $user_id);
        update_user_meta($user_id, self::USER_META_IMAGE_BATCH_EXPIRES, (string) ($now + self::IMAGE_CLAIM_TTL_SECONDS));
    }

    private function active_image_claim_count(int $user_id, ?int $now = null): int {
        if ($user_id <= 0) {
            return 0;
        }

        $query = new WP_Query([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future'],
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'meta_query' => [
                'relation' => 'AND',
                $this->image_work_meta_query(),
                [
                    'key' => self::META_IMAGE_CLAIM_USER,
                    'value' => (string) $user_id,
                ],
                [
                    'key' => self::META_IMAGE_CLAIM_EXPIRES,
                    'value' => (string) ($now ?? current_time('timestamp', true)),
                    'compare' => '>',
                    'type' => 'NUMERIC',
                ],
            ],
        ]);

        return (int) $query->found_posts;
    }

    private function claim_needs_image_posts(array $posts, int $user_id): void {
        if ($user_id <= 0) {
            return;
        }

        $now = current_time('timestamp', true);
        $expires = $now + self::IMAGE_CLAIM_TTL_SECONDS;

        foreach ($posts as $post) {
            if (!$post instanceof WP_Post) {
                continue;
            }

            $post_id = (int) $post->ID;
            if (!$this->image_claim_allows_user($post_id, $user_id, $now)) {
                continue;
            }

            $claimed_user = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_USER, true);
            $claimed_at = (int) get_post_meta($post_id, self::META_IMAGE_CLAIMED_AT, true);
            $claimed_expires = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES, true);

            if ($claimed_user === $user_id && $claimed_at > 0 && $claimed_expires > $now) {
                continue;
            }

            update_post_meta($post_id, self::META_IMAGE_CLAIM_USER, (string) $user_id);
            if ($claimed_user !== $user_id || $claimed_at <= 0 || $claimed_expires <= $now) {
                update_post_meta($post_id, self::META_IMAGE_CLAIMED_AT, (string) $now);
            }
            update_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES, (string) $expires);
        }
    }

    private function image_claim_allows_user(int $post_id, int $user_id, ?int $now = null): bool {
        $claimed_user = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_USER, true);
        if ($claimed_user <= 0 || $claimed_user === $user_id) {
            return true;
        }

        $expires = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES, true);
        return $expires <= ($now ?? current_time('timestamp', true));
    }

    private function image_claim_label(int $post_id, int $current_user_id): string {
        $claimed_user = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_USER, true);
        $expires = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES, true);
        if ($claimed_user <= 0 || $expires <= current_time('timestamp', true)) {
            return '';
        }

        $time = wp_date('g:i A', $expires);
        if ($claimed_user === $current_user_id) {
            return 'Reserved to you until ' . $time;
        }

        $user = get_userdata($claimed_user);
        $name = $user ? $user->display_name : 'another helper';
        return 'Reserved to ' . $name . ' until ' . $time;
    }

    private function clear_image_claim(int $post_id): void {
        delete_post_meta($post_id, self::META_IMAGE_CLAIM_USER);
        delete_post_meta($post_id, self::META_IMAGE_CLAIMED_AT);
        delete_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES);
    }

    private function record_image_claim_completion(int $post_id, int $user_id): void {
        if ($user_id <= 0) {
            return;
        }

        $claimed_user = (int) get_post_meta($post_id, self::META_IMAGE_CLAIM_USER, true);
        $claimed_at = (int) get_post_meta($post_id, self::META_IMAGE_CLAIMED_AT, true);
        if ($claimed_user !== $user_id || $claimed_at <= 0) {
            return;
        }

        $seconds = max(1, current_time('timestamp', true) - $claimed_at);
        update_post_meta($post_id, self::META_IMAGE_COMPLETED_BY, (string) $user_id);
        update_post_meta($post_id, self::META_IMAGE_COMPLETED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_COMPLETION_SECONDS, (string) $seconds);

        $count = (int) get_user_meta($user_id, self::USER_META_IMAGE_COMPLETION_COUNT, true);
        $total = (int) get_user_meta($user_id, self::USER_META_IMAGE_COMPLETION_TOTAL_SECONDS, true);
        update_user_meta($user_id, self::USER_META_IMAGE_COMPLETION_COUNT, (string) ($count + 1));
        update_user_meta($user_id, self::USER_META_IMAGE_COMPLETION_TOTAL_SECONDS, (string) ($total + $seconds));

        $attachment_id = (int) get_post_thumbnail_id($post_id);
        if ($attachment_id > 0) {
            $this->record_image_activity($post_id, $user_id, $attachment_id, 'featured', $seconds);
        }
    }

    private function record_auxiliary_image_completion(int $post_id, int $user_id, int $attachment_id, string $type): void {
        if ($user_id <= 0 || $attachment_id <= 0) {
            return;
        }

        $type = $type === 'story' ? 'story' : 'main';
        $user_meta_key = $type === 'story' ? self::USER_META_STORY_IMAGE_COUNT : self::USER_META_EXTRA_MAIN_IMAGE_COUNT;
        $count = (int) get_user_meta($user_id, $user_meta_key, true);
        update_user_meta($user_id, $user_meta_key, (string) ($count + 1));

        update_post_meta($attachment_id, self::META_IMAGE_COMPLETED_BY, (string) $user_id);
        update_post_meta($attachment_id, self::META_IMAGE_COMPLETED_AT, current_time('mysql', true));
        update_post_meta($attachment_id, '_cph_image_activity_type', $type);

        $this->record_image_activity($post_id, $user_id, $attachment_id, $type, 0);
    }

    private function record_image_activity(int $post_id, int $user_id, int $attachment_id, string $type, int $seconds, string $action = 'saved', string $context = ''): void {
        if ($post_id <= 0 || $user_id <= 0 || $attachment_id <= 0) {
            return;
        }

        $type = in_array($type, ['featured', 'main', 'story'], true) ? $type : 'featured';
        $action = $action === 'deleted' ? 'deleted' : 'saved';
        $timestamp = current_time('timestamp', true);
        $metadata = wp_get_attachment_metadata($attachment_id);
        $request_path = sanitize_text_field((string) wp_parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH));
        $channel = defined('REST_REQUEST') && REST_REQUEST
            ? 'rest'
            : (wp_doing_ajax() ? 'admin_ajax' : (is_admin() ? 'admin' : 'wordpress'));
        $event = [
            'id' => wp_generate_uuid4(),
            'at' => gmdate('c', $timestamp),
            'local_at' => current_time('mysql'),
            'hour' => (int) wp_date('G', $timestamp),
            'weekday' => (int) wp_date('w', $timestamp),
            'type' => $type,
            'action' => $action,
            'post_id' => $post_id,
            'post_title' => get_the_title($post_id),
            'attachment_id' => $attachment_id,
            'filename' => basename((string) get_attached_file($attachment_id)),
            'thumbnail_url' => (string) (wp_get_attachment_image_url($attachment_id, 'thumbnail') ?: ''),
            'full_url' => (string) (wp_get_attachment_url($attachment_id) ?: ''),
            'provider' => sanitize_key((string) get_post_meta($attachment_id, self::META_FEATURED_IMAGE_PROVIDER, true)),
            'origin' => sanitize_key((string) get_post_meta($attachment_id, self::META_IMAGE_ORIGIN, true)),
            'width' => is_array($metadata) ? absint($metadata['width'] ?? 0) : 0,
            'height' => is_array($metadata) ? absint($metadata['height'] ?? 0) : 0,
            'user_id' => $user_id,
            'user_login' => (string) get_the_author_meta('user_login', $user_id),
            'user_name' => (string) get_the_author_meta('display_name', $user_id),
            'seconds' => max(0, $seconds),
            'context' => sanitize_key($context),
            'request_channel' => $channel,
            'request_method' => sanitize_key(strtolower((string) ($_SERVER['REQUEST_METHOD'] ?? ''))),
            'request_path' => $request_path,
        ];

        $log = $this->image_activity_log();
        array_unshift($log, $event);
        $log = array_slice($log, 0, 2000);
        if (get_option(self::OPTION_IMAGE_ACTIVITY_LOG, null) === null) {
            add_option(self::OPTION_IMAGE_ACTIVITY_LOG, $log, '', false);
        } else {
            update_option(self::OPTION_IMAGE_ACTIVITY_LOG, $log, false);
        }
    }

    private function record_api_image_activity(int $post_id, int $user_id, int $attachment_id, string $type, string $provider = 'openai'): void {
        if ($post_id <= 0 || $user_id <= 0 || $attachment_id <= 0) {
            return;
        }

        update_post_meta($attachment_id, self::META_IMAGE_COMPLETED_BY, (string) $user_id);
        update_post_meta($attachment_id, self::META_IMAGE_COMPLETED_AT, current_time('mysql', true));
        update_post_meta($attachment_id, self::META_IMAGE_ORIGIN, 'api');
        update_post_meta($attachment_id, self::META_FEATURED_IMAGE_PROVIDER, sanitize_key($provider ?: 'openai'));
        $this->record_image_activity($post_id, $user_id, $attachment_id, $type, 0);
    }

    private function resolve_api_trigger_user(array $payload): ?WP_User {
        $requested_login = sanitize_user((string) ($payload['requested_by_user_login'] ?? ''));
        if ($requested_login !== '') {
            $requested = get_user_by('login', $requested_login);
            if ($requested instanceof WP_User && $requested->exists()) {
                return $requested;
            }
        }

        $requested_id = absint($payload['requested_by_user_id'] ?? 0);
        if ($requested_id > 0) {
            $requested = get_user_by('id', $requested_id);
            if ($requested instanceof WP_User && $requested->exists()) {
                return $requested;
            }
        }

        $current = wp_get_current_user();
        if ($current instanceof WP_User && $current->exists()) {
            return $current;
        }

        return null;
    }

    private function image_activity_log(): array {
        $log = get_option(self::OPTION_IMAGE_ACTIVITY_LOG, []);
        if (!is_array($log)) {
            return [];
        }

        return array_values(array_filter($log, static fn($event): bool => is_array($event)));
    }

    private function image_activity_stats(array $log): array {
        $hours = array_fill(0, 24, 0);
        $weekdays = array_fill(0, 7, 0);
        $types = [
            'featured' => 0,
            'main' => 0,
            'story' => 0,
        ];

        $saved_count = 0;
        $deleted_count = 0;
        foreach ($log as $event) {
            $action = (string) ($event['action'] ?? 'saved');
            if ($action === 'deleted') {
                $deleted_count++;
                continue;
            }
            $saved_count++;
            $hour = isset($event['hour']) ? (int) $event['hour'] : -1;
            if ($hour >= 0 && $hour <= 23) {
                $hours[$hour]++;
            }

            $weekday = isset($event['weekday']) ? (int) $event['weekday'] : -1;
            if ($weekday >= 0 && $weekday <= 6) {
                $weekdays[$weekday]++;
            }

            $type = (string) ($event['type'] ?? 'featured');
            if (!isset($types[$type])) {
                $type = 'featured';
            }
            $types[$type]++;
        }

        return [
            'event_count' => count($log),
            'saved_count' => $saved_count,
            'deleted_count' => $deleted_count,
            'hours' => $hours,
            'weekdays' => $weekdays,
            'types' => $types,
            'recent' => array_slice($log, 0, 50),
        ];
    }

    private function image_automation_stats(array $events, array $reviews): array {
        $stats = [
            'total_saves' => 0,
            'automated_saves' => 0,
            'manual_or_unknown_saves' => 0,
            'automated_last_24h' => 0,
            'passed_automatic_checks' => 0,
            'exceptions_waiting' => 0,
            'human_reviewed_automated' => 0,
            'automated_landscapes' => 0,
            'automated_stories' => 0,
            'automation_share' => 0.0,
        ];
        $day_ago = current_time('timestamp', true) - DAY_IN_SECONDS;

        foreach ($events as $event) {
            if (!is_array($event) || (string) ($event['action'] ?? 'saved') === 'deleted') {
                continue;
            }

            $stats['total_saves']++;
            $origin = sanitize_key((string) ($event['origin'] ?? ''));
            if ($origin !== 'api') {
                $stats['manual_or_unknown_saves']++;
                continue;
            }

            $stats['automated_saves']++;
            if ((string) ($event['type'] ?? 'featured') === 'story') {
                $stats['automated_stories']++;
            } else {
                $stats['automated_landscapes']++;
            }

            $event_at = strtotime((string) ($event['at'] ?? ''));
            if ($event_at !== false && $event_at >= $day_ago) {
                $stats['automated_last_24h']++;
            }

            $warnings = $this->image_audit_warnings($event);
            if (!$warnings) {
                $stats['passed_automatic_checks']++;
            }

            $event_key = $this->image_audit_event_key($event);
            $review = is_array($reviews[$event_key] ?? null) ? $reviews[$event_key] : [];
            $decision = sanitize_key((string) ($review['decision'] ?? ''));
            if (in_array($decision, ['approved', 'flagged'], true)) {
                $stats['human_reviewed_automated']++;
            } elseif ($warnings) {
                $stats['exceptions_waiting']++;
            }
        }

        if ($stats['total_saves'] > 0) {
            $stats['automation_share'] = round(($stats['automated_saves'] / $stats['total_saves']) * 100, 1);
        }

        return $stats;
    }

    private function audio_automation_runs(): array {
        $runs = get_option(self::OPTION_AUDIO_AUTOMATION_RUNS, []);
        $runs = is_array($runs) ? array_values(array_filter($runs, 'is_array')) : [];
        foreach (['creatornewsdesk', 'creditrepairchoices', 'dailysmirk', 'factology'] as $site_key) {
            $site_runs = get_option(self::OPTION_AUDIO_AUTOMATION_RUNS . '_' . $site_key, []);
            if (is_array($site_runs)) {
                $runs = array_merge($runs, array_values(array_filter($site_runs, 'is_array')));
            }
        }
        usort($runs, static function (array $left, array $right): int {
            $left_time = strtotime((string) ($left['recorded_at'] ?? $left['started_at'] ?? '')) ?: 0;
            $right_time = strtotime((string) ($right['recorded_at'] ?? $right['started_at'] ?? '')) ?: 0;
            return $right_time <=> $left_time;
        });
        return array_slice($runs, 0, 200);
    }

    private function audio_automation_stats(): array {
        $runs = $this->audio_automation_runs();
        $day_ago = current_time('timestamp', true) - DAY_IN_SECONDS;
        $terminal = [];
        $stats = [
            'runs_last_24h' => 0,
            'processed_last_24h' => 0,
            'empty_last_24h' => 0,
            'failed_last_24h' => 0,
            'sites' => [],
        ];
        $expected_sites = [
            'creatornewsdesk' => 'Creator Newsdesk',
            'creditrepairchoices' => 'Credit Repair Choices',
            'dailysmirk' => 'The Daily Smirk',
            'factology' => 'The Factology Daily',
        ];

        foreach ($runs as $run) {
            $site_key = sanitize_key((string) ($run['site_key'] ?? ''));
            $outcome = sanitize_key((string) ($run['outcome'] ?? ''));
            if ($site_key === '' || !in_array($outcome, ['running', 'success', 'empty', 'failed'], true)) {
                continue;
            }

            $recorded_at = strtotime((string) ($run['completed_at'] ?? $run['recorded_at'] ?? $run['started_at'] ?? ''));
            if ($outcome !== 'running' && $recorded_at !== false && $recorded_at >= $day_ago) {
                $stats['runs_last_24h']++;
                $stats['processed_last_24h'] += max(0, (int) ($run['processed'] ?? 0));
                if ($outcome === 'empty') {
                    $stats['empty_last_24h']++;
                } elseif ($outcome === 'failed') {
                    $stats['failed_last_24h']++;
                }
            }

            if (!isset($terminal[$site_key])) {
                $terminal[$site_key] = $run;
                continue;
            }

            $existing_time = strtotime((string) ($terminal[$site_key]['recorded_at'] ?? $terminal[$site_key]['started_at'] ?? '')) ?: 0;
            $candidate_time = strtotime((string) ($run['recorded_at'] ?? $run['started_at'] ?? '')) ?: 0;
            if ($candidate_time > $existing_time) {
                $terminal[$site_key] = $run;
            }
        }

        foreach ($expected_sites as $site_key => $site_name) {
            $run = is_array($terminal[$site_key] ?? null) ? $terminal[$site_key] : [];
            $outcome = sanitize_key((string) ($run['outcome'] ?? ''));
            if (!in_array($outcome, ['running', 'success', 'empty', 'failed'], true)) {
                $outcome = 'failed';
                $run['error'] = 'No Ryzen audio automation report has been received yet.';
            }
            $stats['sites'][] = [
                'site_key' => $site_key,
                'site_name' => sanitize_text_field((string) ($run['site_name'] ?? $site_name)) ?: $site_name,
                'outcome' => $outcome,
                'last_attempt' => sanitize_text_field((string) ($run['completed_at'] ?? $run['started_at'] ?? '')),
                'next_expected_at' => sanitize_text_field((string) ($run['next_expected_at'] ?? '')),
                'checked' => max(0, (int) ($run['checked'] ?? 0)),
                'processed' => max(0, (int) ($run['processed'] ?? 0)),
                'error' => sanitize_text_field((string) ($run['error'] ?? '')),
            ];
        }

        return $stats;
    }

    private function image_activity_type_label(string $type): string {
        return match ($type) {
            'main' => 'Extra main',
            'story' => 'Story',
            default => 'Featured',
        };
    }

    private function image_audit_reviews(): array {
        $reviews = get_option(self::OPTION_IMAGE_AUDIT_REVIEWS, []);
        return is_array($reviews) ? $reviews : [];
    }

    private function image_audit_event_key(array $event): string {
        $id = sanitize_key((string) ($event['id'] ?? ''));
        if ($id !== '') {
            return $id;
        }

        return md5(wp_json_encode([
            (string) ($event['at'] ?? ''),
            (int) ($event['user_id'] ?? 0),
            (int) ($event['post_id'] ?? 0),
            (int) ($event['attachment_id'] ?? 0),
            (string) ($event['type'] ?? ''),
            (string) ($event['action'] ?? 'saved'),
            (string) ($event['filename'] ?? ''),
        ]));
    }

    private function resolve_image_audit_event(array $event): array {
        $attachment_id = (int) ($event['attachment_id'] ?? 0);
        $action = (string) ($event['action'] ?? 'saved');
        $attachment = $attachment_id > 0 ? get_post($attachment_id) : null;
        $attachment_exists = $attachment instanceof WP_Post && $attachment->post_type === 'attachment';
        $attached_file = $attachment_exists ? (string) get_attached_file($attachment_id) : '';
        $physical_file_exists = $attached_file !== '' && is_file($attached_file);
        $metadata = $attachment_exists ? wp_get_attachment_metadata($attachment_id) : [];
        $current_thumbnail_url = $attachment_exists ? (string) (wp_get_attachment_image_url($attachment_id, 'thumbnail') ?: '') : '';
        $current_full_url = $attachment_exists ? (string) (wp_get_attachment_url($attachment_id) ?: '') : '';

        $thumbnail_file_exists = false;
        if ($physical_file_exists && is_array($metadata)) {
            $thumbnail_name = (string) ($metadata['sizes']['thumbnail']['file'] ?? '');
            if ($thumbnail_name !== '') {
                $thumbnail_file_exists = is_file(trailingslashit(dirname($attached_file)) . $thumbnail_name);
            } else {
                $thumbnail_file_exists = true;
            }
        }

        if ($action === 'deleted') {
            $state = 'deleted';
            $label = 'Attachment deleted';
        } elseif (!$attachment_exists) {
            $state = 'missing_attachment';
            $label = 'Attachment no longer exists';
        } elseif (!$physical_file_exists) {
            $state = 'missing_file';
            $label = 'File missing';
        } elseif ($current_thumbnail_url === '' || !$thumbnail_file_exists) {
            $state = 'missing_thumbnail';
            $label = 'Thumbnail missing';
        } else {
            $state = 'current';
            $label = 'Current media';
        }

        $event['attachment_exists'] = $attachment_exists;
        $event['physical_file_exists'] = $physical_file_exists;
        $event['thumbnail_file_exists'] = $thumbnail_file_exists;
        $event['current_thumbnail_url'] = $state === 'current' ? $current_thumbnail_url : '';
        $event['current_full_url'] = $state === 'current' ? $current_full_url : '';
        $event['current_width'] = is_array($metadata) ? absint($metadata['width'] ?? 0) : 0;
        $event['current_height'] = is_array($metadata) ? absint($metadata['height'] ?? 0) : 0;
        $event['current_media_state'] = $state;
        $event['current_media_state_label'] = $label;
        return $event;
    }

    private function image_audit_warnings(array $event): array {
        $warnings = [];
        $action = (string) ($event['action'] ?? 'saved');
        $type = (string) ($event['type'] ?? 'featured');
        $width = (int) ($event['width'] ?? 0);
        $height = (int) ($event['height'] ?? 0);
        $attachment_id = (int) ($event['attachment_id'] ?? 0);

        if ($action === 'deleted') {
            $warnings[] = 'Deleted image';
        }

        if ($attachment_id <= 0 || ($action !== 'deleted' && empty($event['attachment_exists']))) {
            $warnings[] = 'Media file missing';
        } elseif ($action !== 'deleted' && empty($event['physical_file_exists'])) {
            $warnings[] = 'Physical file missing';
        } elseif ($action !== 'deleted' && empty($event['thumbnail_file_exists'])) {
            $warnings[] = 'Thumbnail file missing';
        }

        if ($width <= 0 || $height <= 0) {
            $warnings[] = 'Missing dimensions';
        } elseif ($type === 'story') {
            if ($width >= $height) {
                $warnings[] = 'Story is not portrait';
            }
            if ($width < 800 || $height < 1400) {
                $warnings[] = 'Story may be too small';
            }
        } else {
            if ($height > $width) {
                $warnings[] = 'Main image is portrait';
            }
            if ($width < 1000 || $height < 560) {
                $warnings[] = 'Main image may be too small';
            }
        }

        $provider = sanitize_key((string) ($event['provider'] ?? ''));
        $origin = sanitize_key((string) ($event['origin'] ?? ''));
        if ($provider === '' && $origin === '') {
            $warnings[] = 'Source not recorded';
        }

        return array_values(array_unique($warnings));
    }

    private function image_audit_action_url(string $event_key, string $decision, string $redirect_mode): string {
        return wp_nonce_url(add_query_arg([
            'action' => 'cph_audit_image_event',
            'event_key' => $event_key,
            'decision' => $decision,
            'audit_view' => $redirect_mode,
        ], admin_url('admin-post.php')), 'cph_audit_image_event_' . $event_key);
    }

    public function handle_audit_image_event(): void {
        if (!current_user_can('edit_posts')) {
            wp_die('You do not have permission to review image audit events.');
        }

        $event_key = sanitize_key((string) ($_GET['event_key'] ?? ''));
        $decision = sanitize_key((string) ($_GET['decision'] ?? ''));
        $audit_view = sanitize_key((string) ($_GET['audit_view'] ?? 'needs_review'));
        if ($event_key === '' || !in_array($decision, ['approved', 'flagged', 'unreviewed'], true)) {
            wp_die('Invalid audit request.');
        }

        check_admin_referer('cph_audit_image_event_' . $event_key);

        $reviewable = false;
        foreach ($this->image_activity_log() as $event) {
            if (!is_array($event) || $this->image_audit_event_key($event) !== $event_key) {
                continue;
            }
            $event = $this->resolve_image_audit_event($event);
            $reviewable = (string) ($event['current_media_state'] ?? '') === 'current';
            break;
        }
        if (!$reviewable) {
            wp_die('Historical, deleted, or missing media cannot be approved or flagged.', 'Image audit item is not reviewable', ['response' => 409]);
        }

        $reviews = $this->image_audit_reviews();
        if ($decision === 'unreviewed') {
            unset($reviews[$event_key]);
        } else {
            $reviews[$event_key] = [
                'decision' => $decision,
                'reviewed_by' => get_current_user_id(),
                'reviewer' => (string) get_the_author_meta('display_name', get_current_user_id()),
                'reviewed_at' => current_time('mysql'),
            ];
        }
        update_option(self::OPTION_IMAGE_AUDIT_REVIEWS, $reviews, false);

        wp_safe_redirect(add_query_arg([
            'page' => 'creator-image-audit',
            'audit_view' => in_array($audit_view, ['current', 'history', 'approved', 'flagged', 'needs_review'], true) ? $audit_view : 'needs_review',
            'audit_updated' => '1',
        ], admin_url('admin.php')));
        exit;
    }

    private function image_inventory_audit_snapshot(): array {
        $snapshot = get_option(self::OPTION_IMAGE_AUDIT_SNAPSHOT, []);
        return is_array($snapshot) ? $snapshot : [];
    }

    private function audit_managed_image(int $post_id, int $attachment_id, string $role, string $post_title): array {
        $failures = [];
        $attachment = $attachment_id > 0 ? get_post($attachment_id) : null;
        if (!$attachment instanceof WP_Post || $attachment->post_type !== 'attachment') {
            $failures[] = 'Attachment record is missing';
        }

        $file = $attachment instanceof WP_Post ? (string) get_attached_file($attachment_id) : '';
        if ($file === '' || !is_file($file)) {
            $failures[] = 'Physical media file is missing';
        }

        $metadata = $attachment instanceof WP_Post ? wp_get_attachment_metadata($attachment_id) : [];
        $width = is_array($metadata) ? absint($metadata['width'] ?? 0) : 0;
        $height = is_array($metadata) ? absint($metadata['height'] ?? 0) : 0;
        if ($width <= 0 || $height <= 0) {
            $failures[] = 'Image dimensions are missing';
        } elseif ($role === 'Story') {
            if ($width >= $height) {
                $failures[] = 'Story image is not portrait';
            }
            if ($width < 800 || $height < 1400) {
                $failures[] = 'Story image is smaller than 800 x 1400';
            }
        } else {
            if ($height > $width) {
                $failures[] = 'Landscape image is portrait';
            }
            if ($width < 1000 || $height < 560) {
                $failures[] = 'Landscape image is smaller than 1000 x 560';
            }
        }

        if ($file !== '' && is_file($file) && is_array($metadata)) {
            $thumbnail_name = (string) ($metadata['sizes']['thumbnail']['file'] ?? '');
            if ($thumbnail_name !== '' && !is_file(trailingslashit(dirname($file)) . $thumbnail_name)) {
                $failures[] = 'Generated thumbnail file is missing';
            }
        }

        return [
            'post_id' => $post_id,
            'post_title' => $post_title,
            'role' => $role,
            'attachment_id' => $attachment_id,
            'width' => $width,
            'height' => $height,
            'passed' => !$failures,
            'failures' => array_values(array_unique($failures)),
        ];
    }

    private function run_image_inventory_audit(): array {
        $post_ids = get_posts([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
            'fields' => 'ids',
            'posts_per_page' => -1,
            'no_found_rows' => true,
            'orderby' => 'ID',
            'order' => 'DESC',
        ]);
        $items = [];
        $issues = [];
        $visual_reviews = [];
        $posts_missing_landscape = 0;
        $posts_missing_story = 0;
        $roles_expected = 0;

        foreach ($post_ids as $post_id_value) {
            $post_id = (int) $post_id_value;
            $post_title = get_the_title($post_id);
            $featured_id = (int) get_post_thumbnail_id($post_id);
            $landscape_ids = array_values(array_unique(array_filter(array_merge(
                $featured_id > 0 ? [$featured_id] : [],
                $this->alternate_main_image_ids($post_id)
            ))));
            $story_ids = $this->secondary_social_image_ids($post_id);
            $landscape_required = true;
            $story_required = true;
            $roles_expected += 2;

            if (!$landscape_ids && $landscape_required) {
                $posts_missing_landscape++;
                $issues[] = [
                    'post_id' => $post_id,
                    'post_title' => $post_title,
                    'role' => 'Landscape',
                    'attachment_id' => 0,
                    'passed' => false,
                    'failures' => ['Required Landscape image is not attached'],
                ];
            }
            if (!$story_ids && $story_required) {
                $posts_missing_story++;
                $issues[] = [
                    'post_id' => $post_id,
                    'post_title' => $post_title,
                    'role' => 'Story',
                    'attachment_id' => 0,
                    'passed' => false,
                    'failures' => ['Required Story image is not attached'],
                ];
            }

            foreach ($landscape_ids as $attachment_id) {
                $item = $this->audit_managed_image($post_id, (int) $attachment_id, 'Landscape', $post_title);
                $items[] = $item;
                if (!$item['passed']) {
                    $issues[] = $item;
                }
                $provider = $this->image_provider($post_id, (int) $attachment_id);
                if ($this->image_provider_review_state($provider) === 'review') {
                    $visual_reviews[] = [
                        'post_id' => $post_id,
                        'post_title' => $post_title,
                        'role' => 'Landscape',
                        'attachment_id' => (int) $attachment_id,
                        'provider' => $provider ?: 'unknown',
                    ];
                }
            }
            foreach ($story_ids as $attachment_id) {
                $item = $this->audit_managed_image($post_id, (int) $attachment_id, 'Story', $post_title);
                $items[] = $item;
                if (!$item['passed']) {
                    $issues[] = $item;
                }
                $provider = $this->image_provider($post_id, (int) $attachment_id);
                if ($this->image_provider_review_state($provider) === 'review') {
                    $visual_reviews[] = [
                        'post_id' => $post_id,
                        'post_title' => $post_title,
                        'role' => 'Story',
                        'attachment_id' => (int) $attachment_id,
                        'provider' => $provider ?: 'unknown',
                    ];
                }
            }
        }

        $failed_images = count(array_filter($items, static fn(array $item): bool => empty($item['passed'])));
        $snapshot = [
            'version' => 1,
            'completed_at' => current_time('mysql'),
            'completed_at_gmt' => current_time('mysql', true),
            'completed_by' => (string) (wp_get_current_user()->display_name ?: wp_get_current_user()->user_login),
            'completed_by_user_id' => get_current_user_id(),
            'posts_checked' => count($post_ids),
            'images_checked' => count($items),
            'roles_expected' => $roles_expected,
            'passed' => max(0, count($items) - $failed_images),
            'failed' => $failed_images + $posts_missing_landscape + $posts_missing_story,
            'posts_missing_landscape' => $posts_missing_landscape,
            'posts_missing_story' => $posts_missing_story,
            'visual_reviews_required' => count($visual_reviews),
            'visual_reviews' => array_slice($visual_reviews, 0, 500),
            'issues' => array_slice($issues, 0, 500),
        ];
        update_option(self::OPTION_IMAGE_AUDIT_SNAPSHOT, $snapshot, false);
        return $snapshot;
    }

    public function handle_run_image_inventory_audit(): void {
        if (!current_user_can('edit_posts')) {
            wp_die('You do not have permission to run the image audit.');
        }
        check_admin_referer('cph_run_image_inventory_audit');
        $this->run_image_inventory_audit();
        wp_safe_redirect(add_query_arg([
            'page' => 'creator-image-audit',
            'audit_completed' => '1',
        ], admin_url('admin.php')));
        exit;
    }

    private function image_inventory_stats(): array {
        $post_ids = get_posts([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
            'fields' => 'ids',
            'posts_per_page' => -1,
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        ]);

        $featured_images = 0;
        $extra_main_images = 0;
        $story_images = 0;
        $posts_with_extra_main = 0;
        $posts_with_story = 0;
        $largest_main_stack = 0;
        $largest_story_stack = 0;
        $ready_drafts = 0;

        foreach ($post_ids as $post_id) {
            $post_id = (int) $post_id;
            if ((int) get_post_thumbnail_id($post_id) > 0) {
                $featured_images++;
            }

            if ((string) get_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, true) === '1' && get_post_status($post_id) !== 'publish') {
                $ready_drafts++;
            }

            $main_count = count($this->alternate_main_image_ids($post_id));
            $story_count = count($this->secondary_social_image_ids($post_id));
            $extra_main_images += $main_count;
            $story_images += $story_count;
            if ($main_count > 0) {
                $posts_with_extra_main++;
            }
            if ($story_count > 0) {
                $posts_with_story++;
            }
            $largest_main_stack = max($largest_main_stack, 1 + $main_count);
            $largest_story_stack = max($largest_story_stack, $story_count);
        }

        $waiting_query = new WP_Query([
            'post_type' => 'post',
            'post_status' => ['draft', 'pending', 'future'],
            'posts_per_page' => 1,
            'fields' => 'ids',
            'no_found_rows' => false,
            'meta_query' => [
                'relation' => 'AND',
                [
                    'key' => self::META_IMAGE_REQUIRED,
                    'value' => '1',
                ],
            ],
        ]);

        return [
            'posts_checked' => count($post_ids),
            'waiting_for_images' => (int) $waiting_query->found_posts,
            'ready_drafts' => $ready_drafts,
            'featured_images' => $featured_images,
            'extra_main_images' => $extra_main_images,
            'story_images' => $story_images,
            'total_images' => $featured_images + $extra_main_images + $story_images,
            'posts_with_extra_main' => $posts_with_extra_main,
            'posts_with_story' => $posts_with_story,
            'largest_main_stack' => $largest_main_stack,
            'largest_story_stack' => $largest_story_stack,
        ];
    }

    private function image_helper_stats(): array {
        $users = get_users([
            'fields' => ['ID', 'display_name', 'user_login'],
            'orderby' => 'display_name',
            'order' => 'ASC',
        ]);

        $activity_by_user = [];
        foreach ($this->image_activity_log() as $event) {
            $user_id = (int) ($event['user_id'] ?? 0);
            if ($user_id <= 0 || isset($activity_by_user[$user_id])) {
                continue;
            }
            $activity_by_user[$user_id] = (string) ($event['local_at'] ?? $event['at'] ?? '');
        }

        $tracked_logins = ['jroberts', 'smurphy', 'mcraftgrl', 'zcraftman', 'mmurphy'];
        $rows = [];
        foreach ($users as $user) {
            $count = (int) get_user_meta($user->ID, self::USER_META_IMAGE_COMPLETION_COUNT, true);
            $extra_main = (int) get_user_meta($user->ID, self::USER_META_EXTRA_MAIN_IMAGE_COUNT, true);
            $stories = (int) get_user_meta($user->ID, self::USER_META_STORY_IMAGE_COUNT, true);
            $total_images = $count + $extra_main + $stories;
            if ($total_images <= 0 && !in_array($user->user_login, $tracked_logins, true)) {
                continue;
            }

            $total = (int) get_user_meta($user->ID, self::USER_META_IMAGE_COMPLETION_TOTAL_SECONDS, true);
            $rows[] = [
                'user_id' => (int) $user->ID,
                'name' => $user->display_name ?: $user->user_login,
                'login' => $user->user_login,
                'completed' => $count,
                'extra_main' => $extra_main,
                'stories' => $stories,
                'total_images' => $total_images,
                'average_minutes' => $count > 0 ? max(1, (int) round(($total / $count) / 60)) : 0,
                'last_event' => $activity_by_user[(int) $user->ID] ?? '',
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            if ($a['total_images'] !== $b['total_images']) {
                return $b['total_images'] <=> $a['total_images'];
            }
            if ($a['average_minutes'] !== $b['average_minutes']) {
                return $a['average_minutes'] <=> $b['average_minutes'];
            }
            return strcmp($a['name'], $b['name']);
        });

        return $rows;
    }

    private function uploaded_image_file(string $field_name) {
        $file = $_FILES[$field_name] ?? null;
        if (!is_array($file)) {
            return null;
        }

        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if ($error !== UPLOAD_ERR_OK) {
            if (in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                return new WP_Error('image_too_large', 'That Story image is larger than this WordPress upload limit.');
            }
            return new WP_Error('image_upload_error', 'WordPress could not read the Story image upload.');
        }

        return $file;
    }

    private function image_file_from_request(int $post_id, string $file_field = 'cph_image', string $data_field = 'pasted_image_data', string $name_field = 'pasted_image_name'): ?array {
        $file = $_FILES[$file_field] ?? null;
        if (is_array($file) && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            return $file;
        }

        $data_url = (string) ($_POST[$data_field] ?? '');
        if ($data_url === '' || !preg_match('/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+\/=\r\n]+)$/', $data_url, $matches)) {
            return $file;
        }

        $mime = strtolower($matches[1]);
        $binary = base64_decode(str_replace(["\r", "\n"], '', $matches[2]), true);
        if ($binary === false || $binary === '') {
            return $file;
        }

        $max_bytes = (int) wp_max_upload_size();
        if ($max_bytes > 0 && strlen($binary) > $max_bytes) {
            return [
                'name' => 'pasted-image.png',
                'type' => $mime,
                'tmp_name' => '',
                'error' => UPLOAD_ERR_INI_SIZE,
                'size' => strlen($binary),
            ];
        }

        $extension = $this->image_extension_from_mime($mime);
        $tmp_name = wp_tempnam('cph-pasted-' . $post_id . '.' . $extension);
        if (!$tmp_name || file_put_contents($tmp_name, $binary) === false) {
            return $file;
        }

        return [
            'name' => sanitize_file_name((string) ($_POST[$name_field] ?? ('pasted-image.' . $extension))),
            'type' => $mime,
            'tmp_name' => $tmp_name,
            'error' => UPLOAD_ERR_OK,
            'size' => strlen($binary),
            '_cph_pasted_upload' => true,
        ];
    }

    private function image_file_from_base64_payload(int $post_id, string $payload, string $filename) {
        $payload = trim($payload);
        $mime = '';
        $base64 = $payload;
        if (preg_match('/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+\/=\r\n]+)$/', $payload, $matches)) {
            $mime = strtolower($matches[1]);
            $base64 = $matches[2];
        }

        $binary = base64_decode(str_replace(["\r", "\n"], '', $base64), true);
        if ($binary === false || $binary === '') {
            return new WP_Error('invalid_image_base64', 'Image payload is not valid base64.', ['status' => 400]);
        }

        $max_bytes = (int) wp_max_upload_size();
        if ($max_bytes > 0 && strlen($binary) > $max_bytes) {
            return new WP_Error('image_payload_too_large', 'Image payload is larger than this WordPress upload limit.', ['status' => 413]);
        }

        $filename = sanitize_file_name($filename ?: 'creator-image.png');
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            $extension = $mime !== '' ? $this->image_extension_from_mime($mime) : 'png';
            $filename = sanitize_file_name(pathinfo($filename, PATHINFO_FILENAME) . '.' . $extension);
        }

        $tmp_name = wp_tempnam('creator-image-' . $post_id . '.' . $extension);
        if (!$tmp_name || file_put_contents($tmp_name, $binary) === false) {
            return new WP_Error('image_temp_failed', 'Could not stage the image payload for upload.', ['status' => 500]);
        }

        $detected = @getimagesize($tmp_name);
        if (!is_array($detected) || empty($detected['mime']) || !str_starts_with((string) $detected['mime'], 'image/')) {
            @unlink($tmp_name);
            return new WP_Error('invalid_image_payload', 'Uploaded payload is not a recognized image.', ['status' => 400]);
        }

        return [
            'name' => $filename,
            'type' => (string) ($detected['mime'] ?? ($mime ?: 'image/png')),
            'tmp_name' => $tmp_name,
            'error' => UPLOAD_ERR_OK,
            'size' => strlen($binary),
            '_cph_pasted_upload' => true,
        ];
    }

    private function generate_openai_image_payload(string $api_key, string $prompt, string $size) {
        $response = wp_remote_post('https://api.openai.com/v1/images/generations', [
            'timeout' => 180,
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode([
                'model' => 'gpt-image-1',
                'size' => $size,
                'quality' => 'high',
                'output_format' => 'png',
                'prompt' => $prompt,
            ]),
        ]);

        if (is_wp_error($response)) {
            return new WP_Error('openai_image_request_failed', 'OpenAI image request failed: ' . $response->get_error_message());
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        $body = json_decode((string) wp_remote_retrieve_body($response), true);

        if ($status < 200 || $status >= 300) {
            $message = is_array($body) ? (string) (($body['error']['message'] ?? '') ?: ($body['message'] ?? '')) : '';
            if ($message === '') {
                $message = 'OpenAI returned HTTP ' . $status . '.';
            }

            return new WP_Error('openai_image_http_error', $message, ['status' => $status]);
        }

        $b64 = is_array($body) ? (string) ($body['data'][0]['b64_json'] ?? '') : '';
        if ($b64 === '') {
            return new WP_Error('openai_image_empty', 'OpenAI returned no image payload.');
        }

        return [
            'b64_json' => $b64,
            'revised_prompt' => is_array($body) ? (string) ($body['data'][0]['revised_prompt'] ?? '') : '',
        ];
    }

    private function uploaded_image_orientation(array $file): string {
        $tmp_name = (string) ($file['tmp_name'] ?? '');
        if ($tmp_name === '' || !is_readable($tmp_name)) {
            return 'unknown';
        }

        $dimensions = @getimagesize($tmp_name);
        if (!is_array($dimensions)) {
            return 'unknown';
        }

        $width = (int) ($dimensions[0] ?? 0);
        $height = (int) ($dimensions[1] ?? 0);
        if ($width <= 0 || $height <= 0) {
            return 'unknown';
        }

        return $height > $width ? 'portrait' : 'landscape';
    }

    private function attach_cleaned_image_file(int $post_id, WP_Post $post, array $file, string $provider, string $origin, string $role) {
        $file['name'] = $this->seo_image_filename($post_id, (string) ($file['name'] ?? 'autopilot-image.png'), $role);
        $is_pasted_upload = !empty($file['_cph_pasted_upload']);
        unset($file['_cph_pasted_upload']);

        $upload_args = [
            'test_form' => false,
            'mimes' => [
                'jpg|jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'webp' => 'image/webp',
            ],
        ];
        $upload = $is_pasted_upload ? wp_handle_sideload($file, $upload_args) : wp_handle_upload($file, $upload_args);

        if (!empty($upload['error'])) {
            return new WP_Error('image_upload_failed', (string) $upload['error']);
        }

        $file_path = (string) ($upload['file'] ?? '');
        $file_type = wp_check_filetype($file_path);
        if ($file_path === '' || empty($file_type['type']) || !str_starts_with($file_type['type'], 'image/')) {
            if ($file_path !== '') {
                @unlink($file_path);
            }
            return new WP_Error('unsupported_image', 'Uploaded file is not a supported image.');
        }

        $original_size = is_file($file_path) ? (int) filesize($file_path) : 0;
        $metadata_stripped = $this->strip_image_metadata($file_path);
        $optimization = $this->optimize_uploaded_image($file_path);
        if (!is_wp_error($optimization)) {
            $file_path = (string) ($optimization['file'] ?? $file_path);
            $file_type = wp_check_filetype($file_path);
        }
        $media_title = $this->clean_media_text(get_the_title($post_id));
        $role_label = match ($role) {
            'social-alt' => 'Story image',
            'main-alt' => 'extra main image',
            default => 'featured image',
        };
        $role_title_suffix = match ($role) {
            'social-alt' => ' Story image',
            'main-alt' => ' Extra main image',
            default => '',
        };
        $media_caption = $media_title . ' ' . $role_label . ' for the site.';
        $media_description = wp_trim_words(wp_strip_all_tags((string) $post->post_content), 42);
        $credit = ($origin === 'api' ? 'API generated' : 'Manual ChatGPT') . ' image for ' . $media_title;

        $attachment_id = wp_insert_attachment([
            'post_mime_type' => $file_type['type'],
            'post_title' => sanitize_text_field($media_title . $role_title_suffix),
            'post_excerpt' => sanitize_text_field($media_caption),
            'post_content' => sanitize_textarea_field($media_description),
            'post_status' => 'inherit',
        ], $file_path, $post_id, true);

        if (is_wp_error($attachment_id)) {
            @unlink($file_path);
            return $attachment_id;
        }

        $attachment_id = (int) $attachment_id;
        $metadata = wp_generate_attachment_metadata($attachment_id, $file_path);
        wp_update_attachment_metadata($attachment_id, $metadata);
        update_post_meta($attachment_id, '_wp_attachment_image_alt', $media_title);
        update_post_meta($attachment_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta($attachment_id, self::META_IMAGE_ORIGIN, $origin);
        update_post_meta($attachment_id, self::META_IMAGE_CREDIT, $credit);
        update_post_meta($attachment_id, '_cph_image_role', $role);
        if (!is_wp_error($optimization)) {
            update_post_meta($attachment_id, '_cph_image_optimized_format', (string) ($optimization['format'] ?? ''));
            update_post_meta($attachment_id, '_cph_image_original_bytes', (string) $original_size);
            update_post_meta($attachment_id, '_cph_image_optimized_bytes', (string) ((int) ($optimization['bytes'] ?? 0)));
        }

        return [
            'attachment_id' => $attachment_id,
            'metadata_stripped' => $metadata_stripped,
            'credit' => $credit,
        ];
    }

    private function optimize_uploaded_image(string $file_path) {
        if ($file_path === '' || !is_file($file_path)) {
            return new WP_Error('image_optimize_missing_file', 'Uploaded image file is missing.');
        }

        $file_type = wp_check_filetype($file_path);
        $mime = (string) ($file_type['type'] ?? '');
        if (!in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            return new WP_Error('image_optimize_unsupported_type', 'Uploaded image type cannot be optimized.');
        }

        $editor = wp_get_image_editor($file_path);
        if (is_wp_error($editor)) {
            return $editor;
        }

        if (method_exists($editor, 'set_quality')) {
            $editor->set_quality(82);
        }

        $target_path = $file_path;
        if ($mime !== 'image/webp') {
            $target_path = preg_replace('/\.(jpe?g|png)$/i', '.webp', $file_path);
            if (!is_string($target_path) || $target_path === $file_path) {
                $target_path = $file_path . '.webp';
            }
        }

        $saved = $editor->save($target_path, 'image/webp');
        if (is_wp_error($saved)) {
            return $saved;
        }

        $optimized_path = (string) ($saved['path'] ?? $target_path);
        if ($optimized_path === '' || !is_file($optimized_path)) {
            return new WP_Error('image_optimize_failed', 'WordPress did not create an optimized image file.');
        }

        if ($optimized_path !== $file_path && is_file($file_path)) {
            @unlink($file_path);
        }

        return [
            'file' => $optimized_path,
            'format' => 'webp',
            'bytes' => (int) filesize($optimized_path),
        ];
    }

    private function seo_image_filename(int $post_id, string $original_name, string $role = ''): string {
        $extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            $extension = 'png';
        }

        $base = sanitize_title($this->clean_media_text(get_the_title($post_id)));
        if ($base === '') {
            $base = 'autopilot-post-' . $post_id;
        }

        $role_slug = $role !== '' && $role !== 'featured' ? '-' . sanitize_title($role) : '';
        $brand_slug = $this->image_file_brand_slug();

        return sprintf('%s%s-%s-%d-%s.%s', $base, $role_slug, $brand_slug, $post_id, gmdate('YmdHis'), $extension);
    }

    private function image_file_brand_slug(): string {
        $settings = $this->settings();
        $brand = sanitize_title($this->canonical_brand_name((string) ($settings['site_brand_name'] ?? '')));
        if ($brand === '') {
            $brand = sanitize_title($this->canonical_brand_name((string) get_bloginfo('name')));
        }

        return $brand !== '' ? $brand : 'autopilot';
    }

    private function image_extension_from_mime(string $mime): string {
        if ($mime === 'image/jpeg') {
            return 'jpg';
        }
        if ($mime === 'image/webp') {
            return 'webp';
        }
        return 'png';
    }

    private function clean_media_text(string $text): string {
        $text = html_entity_decode(wp_strip_all_tags($text), ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        $text = trim((string) preg_replace('/\s+/', ' ', $text));
        return $text;
    }

    private function redirect_needs_images(string $message): void {
        $redirect = $this->safe_needs_images_redirect((string) ($_POST['redirect_to'] ?? ''));
        wp_safe_redirect(add_query_arg('fni_error', rawurlencode($message), $redirect));
        exit;
    }

    private function safe_needs_images_redirect(string $redirect): string {
        $fallback = admin_url('admin.php?page=creator-needs-images');
        if ($redirect === '') {
            return $fallback;
        }

        $redirect = wp_validate_redirect($redirect, $fallback);
        $parts = wp_parse_url($redirect);
        $query = [];
        if (!empty($parts['query'])) {
            parse_str($parts['query'], $query);
        }

        if (($query['page'] ?? '') !== 'creator-needs-images') {
            return $fallback;
        }

        return $redirect;
    }

    private function current_needs_images_url(): string {
        $args = [
            'page' => 'creator-needs-images',
        ];
        foreach (['fni_paged', 'fni_category', 'fni_search'] as $key) {
            if (isset($_GET[$key]) && $_GET[$key] !== '') {
                $args[$key] = sanitize_text_field(wp_unslash($_GET[$key]));
            }
        }

        return add_query_arg($args, admin_url('admin.php'));
    }

    private function safe_admin_redirect(string $redirect): string {
        $fallback = admin_url('admin.php?page=creator-image-review');
        if ($redirect === '') {
            return $fallback;
        }

        $redirect = wp_validate_redirect($redirect, $fallback);
        $parts = wp_parse_url($redirect);
        $query = [];
        if (!empty($parts['query'])) {
            parse_str($parts['query'], $query);
        }

        if (!in_array(($query['page'] ?? ''), ['creator-image-review', 'creator-needs-images'], true)) {
            return $fallback;
        }

        return $redirect;
    }

    private function current_admin_url(): string {
        $args = [
            'page' => sanitize_key((string) ($_GET['page'] ?? 'creator-image-review')),
        ];
        foreach (['fir_paged', 'fir_status', 'fir_category', 'fir_search'] as $key) {
            if (isset($_GET[$key]) && $_GET[$key] !== '') {
                $args[$key] = sanitize_text_field(wp_unslash($_GET[$key]));
            }
        }

        return add_query_arg($args, admin_url('admin.php'));
    }

    private function strip_image_metadata(string $file_path): bool {
        if (class_exists('Imagick')) {
            try {
                $image = new Imagick($file_path);
                $image->stripImage();
                $image->writeImages($file_path, true);
                $image->clear();
                $image->destroy();
                return true;
            } catch (Throwable $error) {
                // Fall through to WordPress' image editor, which may use GD.
            }
        }

        $editor = wp_get_image_editor($file_path);
        if (is_wp_error($editor)) {
            return false;
        }

        $saved = $editor->save($file_path);
        return !is_wp_error($saved);
    }

    public function render_audio_player_styles(): void {
        if (!is_singular('post')) {
            return;
        }
        ?>
        <style>
            .cph-audio-player {
                margin: 1.25rem 0 1.5rem;
                padding: 1rem 0;
                border-top: 1px solid rgba(36, 48, 64, 0.14);
                border-bottom: 1px solid rgba(36, 48, 64, 0.14);
            }
            .cph-audio-player__label {
                margin: 0 0 0.6rem;
                color: #1f2f46;
                font-size: 0.82rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            .cph-audio-player audio {
                display: block;
                width: 100%;
                max-width: 720px;
            }
        </style>
        <?php
    }

    public function prepend_audio_player(string $content): string {
        if (is_admin() || is_feed() || !is_singular('post') || !in_the_loop() || !is_main_query()) {
            return $content;
        }

        $post_id = (int) get_the_ID();
        if ($post_id <= 0) {
            return $content;
        }

        $attachment_id = (int) get_post_meta($post_id, self::META_AUDIO_ATTACHMENT_ID, true);
        if ($attachment_id <= 0) {
            return $content;
        }

        $audio_url = wp_get_attachment_url($attachment_id);
        if (!$audio_url) {
            return $content;
        }

        $mime_type = get_post_mime_type($attachment_id) ?: 'audio/mpeg';
        $player = sprintf(
            '<section class="cph-audio-player" aria-label="%1$s"><div class="cph-audio-player__label">%2$s</div><div class="cph-audio-player__control"><audio controls preload="metadata"><source src="%3$s" type="%4$s"></audio></div></section>',
            esc_attr__('Article audio', 'creator-publishing-hub'),
            esc_html__('Listen to this article', 'creator-publishing-hub'),
            esc_url($audio_url),
            esc_attr($mime_type)
        );

        return $player . $content;
    }

    private function narration_text_for_post(WP_Post $post): string {
        $content = strip_shortcodes((string) $post->post_content);
        $content = preg_replace('/<!--.*?-->/s', ' ', $content);
        $content = wp_strip_all_tags($content, true);
        $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        $content = preg_replace('/\s+/u', ' ', $content);

        return trim((string) $content);
    }

    public function rest_audio_automation_runs(): WP_REST_Response {
        return new WP_REST_Response([
            'ok' => true,
            'stats' => $this->audio_automation_stats(),
            'runs' => array_slice($this->audio_automation_runs(), 0, 100),
            'time' => gmdate('c'),
        ]);
    }

    public function rest_record_audio_automation_run(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_audio_automation_payload', 'Expected a JSON object.', ['status' => 400]);
        }

        $site_key = sanitize_key((string) ($payload['site_key'] ?? ''));
        $allowed_sites = [
            'creatornewsdesk' => 'Creator Newsdesk',
            'creditrepairchoices' => 'Credit Repair Choices',
            'dailysmirk' => 'The Daily Smirk',
            'factology' => 'The Factology Daily',
        ];
        if (!isset($allowed_sites[$site_key])) {
            return new WP_Error('invalid_audio_automation_site', 'Unknown CPH audio site key.', ['status' => 400]);
        }

        $outcome = sanitize_key((string) ($payload['outcome'] ?? ''));
        if (!in_array($outcome, ['running', 'success', 'empty', 'failed'], true)) {
            return new WP_Error('invalid_audio_automation_outcome', 'Unknown CPH audio run outcome.', ['status' => 400]);
        }

        $run_id = sanitize_text_field((string) ($payload['run_id'] ?? ''));
        if ($run_id === '') {
            return new WP_Error('missing_audio_automation_run_id', 'A run ID is required.', ['status' => 400]);
        }

        $run = [
            'event_id' => md5($run_id . '|' . $outcome . '|' . (string) ($payload['recorded_at'] ?? '')),
            'run_id' => substr($run_id, 0, 120),
            'site_key' => $site_key,
            'site_name' => $allowed_sites[$site_key],
            'outcome' => $outcome,
            'started_at' => substr(sanitize_text_field((string) ($payload['started_at'] ?? '')), 0, 80),
            'completed_at' => substr(sanitize_text_field((string) ($payload['completed_at'] ?? '')), 0, 80),
            'next_expected_at' => substr(sanitize_text_field((string) ($payload['next_expected_at'] ?? '')), 0, 80),
            'schedule_minutes' => min(1440, max(1, absint($payload['schedule_minutes'] ?? 15))),
            'checked' => max(0, absint($payload['checked'] ?? 0)),
            'processed' => max(0, absint($payload['processed'] ?? 0)),
            'error' => substr(sanitize_text_field((string) ($payload['error'] ?? '')), 0, 1200),
            'unit' => substr(sanitize_text_field((string) ($payload['unit'] ?? '')), 0, 180),
            'host' => substr(sanitize_text_field((string) ($payload['host'] ?? 'ryzen')), 0, 120),
            'recorded_at' => gmdate('c'),
        ];

        $option_key = self::OPTION_AUDIO_AUTOMATION_RUNS . '_' . $site_key;
        $runs = get_option($option_key, []);
        $runs = is_array($runs) ? array_values(array_filter($runs, 'is_array')) : [];
        $runs = array_values(array_filter($runs, static fn(array $item): bool => (string) ($item['event_id'] ?? '') !== $run['event_id']));
        array_unshift($runs, $run);
        $runs = array_slice($runs, 0, 60);
        update_option($option_key, $runs, false);

        return new WP_REST_Response([
            'ok' => true,
            'run' => $run,
            'retained' => count($runs),
        ], 201);
    }

    public function rest_audio_queue(WP_REST_Request $request): WP_REST_Response {
        $per_page = min(10, max(1, (int) $request->get_param('per_page')));
        $include_existing = rest_sanitize_boolean($request->get_param('include_existing'));
        $existing_engine = sanitize_key((string) $request->get_param('existing_engine'));
        $post_id = max(0, (int) $request->get_param('post_id'));

        if ($existing_engine !== '') {
            $include_existing = true;
        }

        if ($post_id > 0) {
            $target = get_post($post_id);
            $posts = ($target && in_array($target->post_type, ['post', 'page'], true) && $target->post_status !== 'trash')
                ? [$target]
                : [];
        } else {
            $query = [
                'post_type' => 'post',
                'post_status' => 'publish',
                'numberposts' => $per_page,
                'orderby' => 'date',
                'order' => 'DESC',
            ];

            if ($existing_engine !== '') {
                $query['meta_query'] = [
                    'relation' => 'AND',
                    [
                        'key' => self::META_AUDIO_ATTACHMENT_ID,
                        'compare' => 'EXISTS',
                    ],
                    [
                        'key' => self::META_AUDIO_ENGINE,
                        'value' => $existing_engine,
                        'compare' => '=',
                    ],
                ];
            } elseif (!$include_existing) {
                $query['meta_query'] = [
                    [
                        'key' => self::META_AUDIO_ATTACHMENT_ID,
                        'compare' => 'NOT EXISTS',
                    ],
                ];
            }

            $posts = get_posts($query);
        }
        $items = [];

        foreach ($posts as $post) {
            $text = $this->narration_text_for_post($post);
            if ($text === '') {
                continue;
            }

            $attachment_id = (int) get_post_meta($post->ID, self::META_AUDIO_ATTACHMENT_ID, true);
            $audio_engine = (string) get_post_meta($post->ID, self::META_AUDIO_ENGINE, true);
            $category = '';
            if ($post->post_type === 'post') {
                $terms = get_the_terms($post->ID, 'category');
                if (is_array($terms) && !empty($terms[0]->name)) {
                    $category = (string) $terms[0]->name;
                }
            }
            $items[] = [
                'post_id' => (int) $post->ID,
                'title' => get_the_title($post->ID),
                'permalink' => get_permalink($post->ID),
                'date_gmt' => get_post_time('Y-m-d H:i:s', true, $post->ID),
                'content_text' => $text,
                'text_hash' => sha1($text),
                'audio_attachment_id' => $attachment_id,
                'audio_url' => $attachment_id > 0 ? wp_get_attachment_url($attachment_id) : '',
                'audio_engine' => $audio_engine,
                'category' => $category,
            ];
        }

        return new WP_REST_Response([
            'ok' => true,
            'count' => count($items),
            'items' => $items,
        ]);
    }

    public function rest_attach_audio(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $post_id = absint($payload['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found.', ['status' => 404]);
        }

        $filename = sanitize_file_name((string) ($payload['filename'] ?? ('cph-audio-' . $post_id . '.mp3')));
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, ['mp3', 'm4a', 'wav', 'ogg'], true)) {
            return new WP_Error('unsupported_audio', 'Audio must be mp3, m4a, wav, or ogg.', ['status' => 400]);
        }

        $base64 = trim((string) ($payload['audio_base64'] ?? ''));
        $binary = base64_decode($base64, true);
        if ($binary === false || $binary === '') {
            return new WP_Error('invalid_audio', 'Audio payload is not valid base64.', ['status' => 400]);
        }

        if (strlen($binary) > 30 * 1024 * 1024) {
            return new WP_Error('audio_too_large', 'Audio payload is larger than 30MB.', ['status' => 413]);
        }

        $upload = wp_upload_bits($filename, null, $binary);
        if (!empty($upload['error'])) {
            return new WP_Error('audio_upload_failed', $upload['error'], ['status' => 500]);
        }

        return $this->finalize_audio_upload($post_id, $upload['file'], $upload['url'], $payload);
    }

    public function rest_attach_audio_chunk(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $post_id = absint($payload['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found.', ['status' => 404]);
        }

        $upload_id = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($payload['upload_id'] ?? '')));
        $chunk_index = max(0, (int) ($payload['chunk_index'] ?? -1));
        $total_chunks = max(1, (int) ($payload['total_chunks'] ?? 0));
        if (strlen($upload_id) !== 32 || $total_chunks > 100 || $chunk_index >= $total_chunks) {
            return new WP_Error('invalid_audio_chunk', 'Audio chunk metadata is invalid.', ['status' => 400]);
        }

        $filename = sanitize_file_name((string) ($payload['filename'] ?? ('cph-audio-' . $post_id . '.mp3')));
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, ['mp3', 'm4a', 'wav', 'ogg'], true)) {
            return new WP_Error('unsupported_audio', 'Audio must be mp3, m4a, wav, or ogg.', ['status' => 400]);
        }

        $binary = base64_decode(trim((string) ($payload['audio_base64'] ?? '')), true);
        if ($binary === false || $binary === '' || strlen($binary) > 1024 * 1024) {
            return new WP_Error('invalid_audio_chunk', 'Audio chunk must contain at most 1MB of valid base64 audio.', ['status' => 400]);
        }

        $temp_base = trailingslashit(get_temp_dir()) . 'cph-audio-' . $post_id . '-' . $upload_id;
        $part_path = $temp_base . '.part';
        $state_path = $temp_base . '.json';
        $state = is_readable($state_path) ? json_decode((string) file_get_contents($state_path), true) : null;

        if ($chunk_index === 0) {
            @unlink($part_path);
            @unlink($state_path);
            $state = ['next_chunk' => 0, 'total_chunks' => $total_chunks, 'filename' => $filename];
        }
        if (!is_array($state)
            || (int) ($state['next_chunk'] ?? -1) !== $chunk_index
            || (int) ($state['total_chunks'] ?? 0) !== $total_chunks
            || (string) ($state['filename'] ?? '') !== $filename) {
            return new WP_Error('audio_chunk_out_of_order', 'Audio chunks must be uploaded once in order.', ['status' => 409]);
        }

        $write_flags = $chunk_index === 0 ? LOCK_EX : FILE_APPEND | LOCK_EX;
        if (file_put_contents($part_path, $binary, $write_flags) === false) {
            return new WP_Error('audio_chunk_write_failed', 'Could not stage the audio chunk.', ['status' => 500]);
        }
        if ((int) filesize($part_path) > 30 * 1024 * 1024) {
            @unlink($part_path);
            @unlink($state_path);
            return new WP_Error('audio_too_large', 'Audio payload is larger than 30MB.', ['status' => 413]);
        }

        $state['next_chunk'] = $chunk_index + 1;
        file_put_contents($state_path, wp_json_encode($state), LOCK_EX);
        if ($chunk_index + 1 < $total_chunks) {
            return new WP_REST_Response([
                'ok' => true,
                'post_id' => $post_id,
                'upload_id' => $upload_id,
                'received_chunk' => $chunk_index,
                'next_chunk' => $chunk_index + 1,
                'total_chunks' => $total_chunks,
            ], 202);
        }

        $upload_dir = wp_upload_dir();
        if (!empty($upload_dir['error']) || !wp_mkdir_p($upload_dir['path'])) {
            return new WP_Error('audio_upload_failed', (string) ($upload_dir['error'] ?? 'Upload directory is unavailable.'), ['status' => 500]);
        }
        $unique_filename = wp_unique_filename($upload_dir['path'], $filename);
        $destination = trailingslashit($upload_dir['path']) . $unique_filename;
        if (!@rename($part_path, $destination)) {
            if (!@copy($part_path, $destination) || !@unlink($part_path)) {
                return new WP_Error('audio_upload_failed', 'Could not move the completed audio into WordPress uploads.', ['status' => 500]);
            }
        }
        @unlink($state_path);
        $url = trailingslashit($upload_dir['url']) . rawurlencode($unique_filename);

        return $this->finalize_audio_upload($post_id, $destination, $url, $payload);
    }

    private function finalize_audio_upload(int $post_id, string $file_path, string $file_url, array $payload) {
        $previous_attachment_id = (int) get_post_meta($post_id, self::META_AUDIO_ATTACHMENT_ID, true);

        $file_type = wp_check_filetype($file_path);
        $attachment_id = wp_insert_attachment([
            'post_mime_type' => $file_type['type'] ?: 'audio/mpeg',
            'post_title' => sanitize_text_field(get_the_title($post_id) . ' article audio'),
            'post_content' => '',
            'post_status' => 'inherit',
        ], $file_path, $post_id, true);

        if (is_wp_error($attachment_id)) {
            @unlink($file_path);
            return $attachment_id;
        }

        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $metadata = wp_generate_attachment_metadata((int) $attachment_id, $file_path);
        if (is_array($metadata)) {
            wp_update_attachment_metadata((int) $attachment_id, $metadata);
        }

        $engine = sanitize_text_field((string) ($payload['engine'] ?? ''));
        $text_hash = sanitize_text_field((string) ($payload['text_hash'] ?? ''));
        $duration_seconds = max(0, (int) ($payload['duration_seconds'] ?? 0));

        update_post_meta($post_id, self::META_AUDIO_ATTACHMENT_ID, (string) (int) $attachment_id);
        update_post_meta($post_id, self::META_AUDIO_ATTACHED_AT, current_time('mysql', true));
        if ($engine !== '') {
            update_post_meta($post_id, self::META_AUDIO_ENGINE, $engine);
        }
        if ($text_hash !== '') {
            update_post_meta($post_id, self::META_AUDIO_TEXT_HASH, $text_hash);
        }
        if ($duration_seconds > 0) {
            update_post_meta($post_id, self::META_AUDIO_DURATION_SECONDS, (string) $duration_seconds);
        }

        if ($previous_attachment_id > 0 && $previous_attachment_id !== (int) $attachment_id) {
            wp_delete_attachment($previous_attachment_id, true);
        }

        clean_post_cache($post_id);
        do_action('ce_clear_post_cache', $post_id);
        do_action('litespeed_purge_post', $post_id);

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'attachment_id' => (int) $attachment_id,
            'url' => wp_get_attachment_url((int) $attachment_id) ?: $file_url,
            'engine' => $engine,
            'duration_seconds' => $duration_seconds,
        ], 201);
    }

    public function rest_attach_existing_images(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $post_id = absint($payload['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found.', ['status' => 404]);
        }

        $featured_base64 = trim((string) ($payload['featured_image_base64'] ?? ''));
        $featured_filename = sanitize_file_name((string) ($payload['featured_image_filename'] ?? 'featured-image.png'));
        $featured_alt = sanitize_text_field($payload['featured_image_alt'] ?? (get_the_title($post_id) . ' - ' . get_bloginfo('name')));
        $story_base64 = trim((string) ($payload['story_image_base64'] ?? ''));
        $story_filename = sanitize_file_name((string) ($payload['story_image_filename'] ?? 'story-image.png'));
        $story_alt = sanitize_text_field($payload['story_image_alt'] ?? (get_the_title($post_id) . ' Story image - ' . get_bloginfo('name')));
        $provider = sanitize_key($payload['provider'] ?? 'openai') ?: 'openai';
        $replace_secondary = !empty($payload['replace_secondary_images']);
        $trigger_user = $this->resolve_api_trigger_user($payload);
        $trigger_user_id = $trigger_user instanceof WP_User ? (int) $trigger_user->ID : 0;
        $trigger_user_login = $trigger_user instanceof WP_User ? (string) $trigger_user->user_login : '';
        $trigger_user_name = $trigger_user instanceof WP_User ? (string) $trigger_user->display_name : '';

        if (in_array($provider, ['openai', 'api', 'chatgpt-pro'], true) && strtolower($trigger_user_login) !== 'mmurphy') {
            return new WP_Error('api_image_forbidden', 'Only mmurphy may trigger paid API image generation.', ['status' => 403]);
        }

        if ($featured_base64 === '' || $story_base64 === '') {
            return new WP_Error('missing_required', 'featured_image_base64 and story_image_base64 are required.', ['status' => 400]);
        }

        $featured_id = $this->attach_base64_image($post_id, $featured_base64, $featured_filename, $featured_alt, true);
        if (is_wp_error($featured_id)) {
            return $featured_id;
        }

        $story_id = $this->attach_base64_image($post_id, $story_base64, $story_filename, $story_alt, false);
        if (is_wp_error($story_id)) {
            return $story_id;
        }

        update_post_meta((int) $featured_id, '_cph_image_role', 'featured');
        update_post_meta((int) $story_id, '_cph_image_role', 'social-alt');
        update_post_meta((int) $featured_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta((int) $story_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);

        if ($replace_secondary) {
            delete_post_meta($post_id, self::META_SECONDARY_SOCIAL_IMAGES);
        }
        $this->append_secondary_social_image($post_id, (int) $story_id);

        update_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, $provider);
        update_post_meta($post_id, self::META_IMAGE_ORIGIN, 'api');
        update_post_meta($post_id, self::META_IMAGE_CREDIT, 'OpenAI');
        update_post_meta($post_id, self::META_IMAGE_ATTACHED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
        update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
        update_post_meta($post_id, self::META_STORY_REQUIRED, '0');
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGER_USER_ID, (string) $trigger_user_id);
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGER_USER_LOGIN, $trigger_user_login);
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGER_USER_NAME, $trigger_user_name);
        update_post_meta($post_id, self::META_IMAGE_API_TRIGGERED_AT, current_time('mysql', true));
        delete_post_meta($post_id, self::META_IMAGE_CLAIM_USER);
        delete_post_meta($post_id, self::META_IMAGE_CLAIMED_AT);
        delete_post_meta($post_id, self::META_IMAGE_CLAIM_EXPIRES);

        if ($trigger_user_id > 0) {
            $this->record_api_image_activity($post_id, $trigger_user_id, (int) $featured_id, 'featured', $provider);
            $this->record_api_image_activity($post_id, $trigger_user_id, (int) $story_id, 'story', $provider);
        }

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'featured_id' => (int) $featured_id,
            'story_id' => (int) $story_id,
            'secondary_social_image_count' => count($this->secondary_social_image_items($post_id)),
            'trigger_user_login' => $trigger_user_login,
        ], 201);
    }

    public function rest_attach_video(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $post_id = absint($payload['post_id'] ?? 0);
        $post = $post_id > 0 ? get_post($post_id) : null;
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found.', ['status' => 404]);
        }

        $filename = sanitize_file_name((string) ($payload['filename'] ?? ('cph-video-' . $post_id . '.mp4')));
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, ['mp4', 'mov', 'webm'], true)) {
            return new WP_Error('unsupported_video', 'Video must be mp4, mov, or webm.', ['status' => 400]);
        }

        $base64 = trim((string) ($payload['video_base64'] ?? ''));
        $binary = base64_decode($base64, true);
        if ($binary === false || $binary === '') {
            return new WP_Error('invalid_video', 'Video payload is not valid base64.', ['status' => 400]);
        }

        if (strlen($binary) > 80 * 1024 * 1024) {
            return new WP_Error('video_too_large', 'Video payload is larger than 80MB.', ['status' => 413]);
        }

        $upload = wp_upload_bits($filename, null, $binary);
        if (!empty($upload['error'])) {
            return new WP_Error('video_upload_failed', $upload['error'], ['status' => 500]);
        }

        $file_type = wp_check_filetype($upload['file']);
        $attachment_id = wp_insert_attachment([
            'post_mime_type' => $file_type['type'] ?: 'video/mp4',
            'post_title' => sanitize_text_field(get_the_title($post_id) . ' article video'),
            'post_content' => '',
            'post_status' => 'inherit',
        ], $upload['file'], $post_id, true);

        if (is_wp_error($attachment_id)) {
            @unlink($upload['file']);
            return $attachment_id;
        }

        update_post_meta((int) $attachment_id, self::META_VIDEO_ATTACHED_AT, current_time('mysql', true));
        update_post_meta($post_id, self::META_VIDEO_ATTACHMENT_ID, (string) (int) $attachment_id);
        update_post_meta($post_id, self::META_VIDEO_ATTACHED_AT, current_time('mysql', true));

        $facebook_video_id = sanitize_text_field((string) ($payload['facebook_video_id'] ?? ''));
        if ($facebook_video_id !== '') {
            update_post_meta($post_id, self::META_FACEBOOK_VIDEO_ID, $facebook_video_id);
        }

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'attachment_id' => (int) $attachment_id,
            'url' => wp_get_attachment_url((int) $attachment_id),
            'facebook_video_id' => $facebook_video_id,
        ], 201);
    }

    public function rest_ingest(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('invalid_payload', 'Expected JSON object.', ['status' => 400]);
        }

        $title = sanitize_text_field($payload['title'] ?? '');
        $content = wp_kses_post($payload['content_html'] ?? '');
        $excerpt = sanitize_textarea_field($payload['excerpt'] ?? '');
        $default_term = get_term((int) get_option('default_category'), 'category');
        $default_category = $default_term instanceof WP_Term ? $default_term->name : 'Uncategorized';
        $category = sanitize_text_field($payload['category'] ?? $default_category);
        $tags = $this->sanitize_string_list($payload['tags'] ?? []);
        $sources = $this->sanitize_url_list($payload['source_urls'] ?? []);
        $confidence = min(1, max(0, (float) ($payload['confidence'] ?? 0)));
        $social_caption = sanitize_textarea_field($payload['social_caption'] ?? '');
        $image_prompt = sanitize_textarea_field($payload['image_prompt'] ?? '');
        $featured_image_prompt = sanitize_textarea_field($payload['featured_image_prompt'] ?? $image_prompt);
        $social_image_prompt = sanitize_textarea_field($payload['social_image_prompt'] ?? '');
        $story_image_prompt = sanitize_textarea_field($payload['story_image_prompt'] ?? '');
        $story_caption = sanitize_textarea_field($payload['story_caption'] ?? '');
        $story_required = !empty($payload['story_required']) ? '1' : '0';
        $image_required = !empty($payload['image_required']) ? '1' : '0';
        $queue_for_publish = !empty($payload['queue_for_publish']);
        $featured_image_base64 = trim((string) ($payload['featured_image_base64'] ?? ''));
        $featured_image_filename = sanitize_file_name((string) ($payload['featured_image_filename'] ?? 'cph-featured.jpg'));
        $featured_image_alt = sanitize_text_field($payload['featured_image_alt'] ?? $title);
        $story_image_base64 = trim((string) ($payload['story_image_base64'] ?? ''));
        $story_image_filename = sanitize_file_name((string) ($payload['story_image_filename'] ?? 'cph-story.jpg'));
        $story_image_alt = sanitize_text_field($payload['story_image_alt'] ?? ($title . ' Story image'));
        $story_image_provider = sanitize_key($payload['story_image_provider'] ?? 'unknown');
        $image_watermark = sanitize_text_field($payload['image_watermark'] ?? 'site-logo-lower-right');
        $featured_image_provider = sanitize_key($payload['featured_image_provider'] ?? 'unknown');
        $desk_settings = $this->settings();
        $page_profile = sanitize_key($payload['page_profile'] ?? ($desk_settings['page_profile'] ?? 'site'));
        $site_name = sanitize_text_field($payload['site_name'] ?? ($desk_settings['site_brand_name'] ?? get_bloginfo('name')));
        $social_caption = $this->social_safe_language($social_caption, $page_profile);
        $story_caption = $this->social_safe_language($story_caption, $page_profile);
        $engagement_question = sanitize_text_field($payload['engagement_question'] ?? '');
        $trend_query = sanitize_text_field($payload['trend_query'] ?? '');
        $title_hook_id = sanitize_key($payload['title_hook_id'] ?? '');
        $title_hook_template = sanitize_text_field($payload['title_hook_template'] ?? '');
        $worker = sanitize_text_field($payload['worker'] ?? 'unknown-worker');
        $editorial_meta = $this->sanitize_ingest_editorial_meta($payload['editorial_meta'] ?? []);
        $risk_flags = $this->risk_flags($title . "\n" . $excerpt . "\n" . wp_strip_all_tags($content));

        if ($title === '' || $content === '') {
            return new WP_Error('missing_required', 'title and content_html are required.', ['status' => 400]);
        }

        $existing_id = $this->find_existing_post_for_ingest($title, $sources);
        if ($existing_id > 0) {
            $existing_caption = (string) get_post_meta($existing_id, self::META_SOCIAL, true);
            $existing_featured_media = (int) get_post_thumbnail_id($existing_id);
            return new WP_REST_Response([
                'ok' => true,
                'duplicate' => true,
                'post_id' => $existing_id,
                'status' => get_post_status($existing_id),
                'permalink' => get_permalink($existing_id),
                'featured_media' => $existing_featured_media,
                'image_provider' => $this->image_provider($existing_id, $existing_featured_media),
                'social_caption_hashtags' => $this->hashtag_count($existing_caption),
                'facebook_ready' => get_post_status($existing_id) === 'publish' && $existing_featured_media > 0 && $this->hashtag_count($existing_caption) >= 3,
            ], 200);
        }

        $has_featured_image_upload = $featured_image_base64 !== '';
        $status = $this->choose_status($confidence, count($sources), $risk_flags, $image_required === '1', $has_featured_image_upload);
        $insert_status = ($status === 'publish' && $has_featured_image_upload) || $queue_for_publish ? 'draft' : $status;
        $category_id = $this->category_id($category);
        $post_id = wp_insert_post([
            'post_title' => $title,
            'post_content' => $content,
            'post_excerpt' => $excerpt,
            'post_status' => $insert_status,
            'post_type' => 'post',
            'post_author' => $this->default_ingest_author_id(),
            'post_category' => [$category_id],
            'meta_input' => [
                self::META_SOURCES => wp_json_encode($sources),
                self::META_CONFIDENCE => (string) $confidence,
                self::META_WORKER => $worker,
                self::META_SOCIAL => $social_caption,
                '_wpas_mess' => $social_caption,
                '_jetpack_publicize_message' => $social_caption,
                self::META_RISK => wp_json_encode($risk_flags),
                self::META_IMAGE_PROMPT => $image_prompt,
                self::META_FEATURED_IMAGE_PROMPT => $featured_image_prompt,
                self::META_SOCIAL_IMAGE_PROMPT => $social_image_prompt,
                self::META_STORY_IMAGE_PROMPT => $story_image_prompt,
                self::META_STORY_CAPTION => $story_caption,
                self::META_STORY_REQUIRED => $story_required,
                self::META_IMAGE_REQUIRED => $image_required,
                self::META_IMAGE_WATERMARK => $image_watermark,
                self::META_FEATURED_IMAGE_PROVIDER => $featured_image_provider,
                self::META_PAGE_PROFILE => $page_profile,
                self::META_SITE_NAME => $site_name,
                self::META_ENGAGEMENT_QUESTION => $engagement_question,
                self::META_TREND_QUERY => $trend_query,
                self::META_TITLE_HOOK_ID => $title_hook_id,
                self::META_TITLE_HOOK_TEMPLATE => $title_hook_template,
            ],
        ], true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        if ($tags) {
            wp_set_post_tags($post_id, $tags, false);
        }
        foreach ($editorial_meta as $meta_key => $meta_value) {
            update_post_meta($post_id, $meta_key, $meta_value);
        }

        $featured_media_id = 0;
        if ($has_featured_image_upload) {
            $attachment = $this->attach_featured_image($post_id, $featured_image_base64, $featured_image_filename, $featured_image_alt);
            if (is_wp_error($attachment)) {
                if ($image_required === '1') {
                    wp_update_post([
                        'ID' => $post_id,
                        'post_status' => 'draft',
                    ]);
                }

                return $attachment;
            }

            $featured_media_id = $attachment;
            update_post_meta($featured_media_id, self::META_FEATURED_IMAGE_PROVIDER, $featured_image_provider);
        }

        $story_media_id = 0;
        if ($story_image_base64 !== '') {
            $story_attachment = $this->attach_base64_image($post_id, $story_image_base64, $story_image_filename, $story_image_alt, false);
            if (is_wp_error($story_attachment)) {
                return $story_attachment;
            }

            $story_media_id = $story_attachment;
            update_post_meta($story_media_id, self::META_FEATURED_IMAGE_PROVIDER, $story_image_provider ?: $featured_image_provider);
            $this->append_secondary_social_image($post_id, $story_media_id);
        }

        if ($queue_for_publish && $featured_media_id > 0) {
            update_post_meta($post_id, self::META_IMAGE_REQUIRED, '0');
            update_post_meta($post_id, self::META_IMAGE_READY_FOR_PUBLISH, '1');
            update_post_meta($post_id, self::META_IMAGE_READY_AT, current_time('mysql', true));
        }

        if (!$queue_for_publish && $status === 'publish' && get_post_status($post_id) !== 'publish') {
            $published = wp_update_post([
                'ID' => $post_id,
                'post_status' => 'publish',
            ], true);

            if (is_wp_error($published)) {
                return $published;
            }
        }

        return new WP_REST_Response([
            'ok' => true,
            'post_id' => $post_id,
            'status' => get_post_status($post_id),
            'permalink' => get_permalink($post_id),
            'confidence' => $confidence,
            'source_count' => count($sources),
            'risk_flags' => $risk_flags,
            'image_required' => $image_required === '1',
            'featured_media' => (int) get_post_thumbnail_id($post_id),
            'story_media' => $story_media_id,
            'secondary_social_image_count' => count($this->secondary_social_image_items($post_id)),
            'image_provider' => $this->image_provider($post_id, (int) get_post_thumbnail_id($post_id)),
            'image_prompt_configured' => $image_prompt !== '',
            'featured_image_prompt_configured' => $featured_image_prompt !== '',
            'social_image_prompt_configured' => $social_image_prompt !== '',
            'story_image_prompt_configured' => $story_image_prompt !== '',
            'story_required' => $story_required === '1',
            'queued_for_publish' => $queue_for_publish,
            'page_profile' => $page_profile,
            'engagement_question_configured' => $engagement_question !== '',
            'social_caption_hashtags' => $this->hashtag_count($social_caption),
            'facebook_ready' => get_post_status($post_id) === 'publish' && (int) get_post_thumbnail_id($post_id) > 0 && $this->hashtag_count($social_caption) >= 3,
            'trend_query' => $trend_query,
        ], 201);
    }

    private function default_ingest_author_id(): int {
        if ($this->is_creator_newsdesk_site()) {
            $matthew_author_id = $this->matthew_author_id();
            if ($matthew_author_id > 0) {
                return $matthew_author_id;
            }
        }

        $current_user_id = get_current_user_id();
        if ($current_user_id > 0) {
            return $current_user_id;
        }

        $administrators = get_users([
            'role' => 'administrator',
            'number' => 1,
            'orderby' => 'ID',
            'order' => 'ASC',
            'fields' => 'ids',
        ]);
        return isset($administrators[0]) ? (int) $administrators[0] : 0;
    }

    private function find_existing_post_for_ingest(string $title, array $sources): int {
        $existing_ids = get_posts([
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
            'title' => $title,
            'numberposts' => 1,
            'fields' => 'ids',
        ]);

        if ($existing_ids) {
            return (int) $existing_ids[0];
        }
        // A source is reusable evidence, not a unique article identifier. One court
        // record or broadcast can support a timeline, explainer, and follow-up.
        // Exact-title matching above remains the ingest idempotency boundary.
        return 0;
    }

    private function sanitize_ingest_editorial_meta($value): array {
        if (!is_array($value)) {
            return [];
        }

        $allowed = [
            '_lla_dek',
            '_lla_locations',
            '_lla_people',
            '_lla_verification_status',
            '_lla_case_status',
            '_lla_evidence_level',
            '_lla_legal_review_status',
            '_lla_sources',
            '_lla_claims',
            '_lla_exclude_social',
            '_lla_exclude_discovery',
            '_lla_feed_id',
        ];
        $clean = [];
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $value)) {
                continue;
            }
            $raw = $value[$key];
            if (in_array($key, ['_lla_exclude_social', '_lla_exclude_discovery'], true)) {
                $clean[$key] = rest_sanitize_boolean($raw);
            } elseif (is_array($raw)) {
                $clean[$key] = $this->sanitize_ingest_editorial_meta_array($raw);
            } else {
                $clean[$key] = sanitize_textarea_field((string) $raw);
            }
        }

        return $clean;
    }

    private function sanitize_ingest_editorial_meta_array(array $value): array {
        $clean = [];
        foreach ($value as $key => $item) {
            $clean_key = is_int($key) ? $key : sanitize_key((string) $key);
            if (is_array($item)) {
                $clean[$clean_key] = $this->sanitize_ingest_editorial_meta_array($item);
            } elseif (in_array((string) $clean_key, ['url', 'source_urls'], true)) {
                $clean[$clean_key] = esc_url_raw((string) $item);
            } else {
                $clean[$clean_key] = sanitize_textarea_field((string) $item);
            }
        }
        return $clean;
    }

    private function render_needs_images_pagination(int $current_page, int $total_pages, string $category_filter, string $search_filter = ''): void {
        if ($total_pages <= 1) {
            return;
        }

        $args = [
            'page' => 'creator-needs-images',
            'fni_paged' => '%#%',
        ];
        if ($category_filter !== '') {
            $args['fni_category'] = $category_filter;
        }
        if ($search_filter !== '') {
            $args['fni_search'] = $search_filter;
        }

        $links = paginate_links([
            'base' => add_query_arg($args, admin_url('admin.php')),
            'format' => '',
            'current' => $current_page,
            'total' => $total_pages,
            'mid_size' => 2,
            'end_size' => 1,
            'prev_text' => 'Previous',
            'next_text' => 'Next',
            'type' => 'array',
        ]);

        if (!is_array($links)) {
            return;
        }

        echo '<nav class="fni-pagination" aria-label="Image Desk pages">';
        foreach ($links as $link) {
            echo wp_kses_post($link);
        }
        echo '</nav>';
    }

    private function image_search_result_item(WP_Post $post): array {
        $post_id = (int) $post->ID;
        $thumbnail_id = (int) get_post_thumbnail_id($post_id);
        $image_required = (string) get_post_meta($post_id, self::META_IMAGE_REQUIRED, true);
        $redo_required = (string) get_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED, true) === '1';
        $needs_image_queue = $image_required === '1' || $redo_required || $thumbnail_id <= 0;
        $status = (string) get_post_status($post_id);
        $status_object = get_post_status_object($status);
        $category_names = wp_get_post_categories($post_id, ['fields' => 'names']);
        $summary = get_the_excerpt($post_id);
        if ($summary === '') {
            $summary = wp_trim_words(wp_strip_all_tags((string) $post->post_content), 28);
        }

        if ($thumbnail_id > 0 && !$needs_image_queue) {
            $state = 'Has featured image #' . $thumbnail_id;
            $action_label = 'Replace image';
            $action_url = admin_url('admin.php?page=creator-image-review&fir_search=' . $post_id);
        } elseif ($needs_image_queue) {
            $state = $redo_required ? 'Needs human redo' : 'Waiting for image';
            $action_label = 'Open in Image Desk';
            $action_url = admin_url('admin.php?page=creator-needs-images&fni_search=' . $post_id);
        } else {
            $state = 'No featured image, not in Image Desk';
            $action_label = 'Open editor';
            $action_url = (string) get_edit_post_link($post_id, 'raw');
        }

        return [
            'post_id' => $post_id,
            'title' => get_the_title($post_id),
            'status' => $status_object ? $status_object->label : $status,
            'category' => $category_names ? implode(', ', $category_names) : 'Uncategorized',
            'state' => $state,
            'summary' => $summary,
            'thumbnail_id' => $thumbnail_id,
            'image_required' => $image_required,
            'redo_required' => $redo_required ? '1' : '0',
            'edit_url' => (string) get_edit_post_link($post_id, 'raw'),
            'permalink' => get_permalink($post_id),
            'action_label' => $action_label,
            'action_url' => $action_url,
        ];
    }

    private function needs_image_query_args(int $per_page, int $offset, string $category_filter, string $search_filter = '', int $claim_user_id = 0, bool $respect_claims = false): array {
        $exact_post_search = $search_filter !== '' && ctype_digit($search_filter);
        $args = [
            'post_type' => 'post',
            'post_status' => ['publish', 'draft', 'pending', 'future'],
            'posts_per_page' => $per_page,
            'offset' => $offset,
            'orderby' => 'modified',
            'order' => 'DESC',
            'no_found_rows' => true,
            'meta_query' => [
                'relation' => 'AND',
                $this->image_work_meta_query(),
            ],
        ];

        if ($category_filter !== '') {
            $args['tax_query'] = [
                [
                    'taxonomy' => 'category',
                    'field' => 'slug',
                    'terms' => [$category_filter],
                ],
            ];
        }

        if ($search_filter !== '') {
            if (ctype_digit($search_filter)) {
                $args['p'] = (int) $search_filter;
                // A direct Image Desk launch must show the requested post even
                // when it already has an image and is outside the normal queue.
                unset($args['meta_query']);
            } else {
                $args['s'] = $search_filter;
            }
        }

        if ($respect_claims && $claim_user_id > 0 && !$exact_post_search) {
            $args['meta_query'][] = [
                'relation' => 'AND',
                [
                    'key' => self::META_IMAGE_CLAIM_USER,
                    'value' => (string) $claim_user_id,
                ],
                [
                    'key' => self::META_IMAGE_CLAIM_EXPIRES,
                    'value' => (string) current_time('timestamp', true),
                    'compare' => '>',
                    'type' => 'NUMERIC',
                ],
            ];
        }

        return $args;
    }

    private function needs_image_items(int $per_page, int $offset = 0, string $category_filter = '', string $search_filter = '', int $claim_user_id = 0, bool $respect_claims = false): array {
        if ($category_filter === '' && $search_filter === '') {
            $posts = $this->fast_needs_image_posts($per_page, $offset, $claim_user_id, $respect_claims);
        } else {
            $query = new WP_Query($this->needs_image_query_args($per_page, $offset, $category_filter, $search_filter, $claim_user_id, $respect_claims));
            $posts = $query->posts;
        }
        $items = [];
        $brand = $this->canonical_prompt_brand(trim((string) ($this->settings()['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: ''));
        $is_creator_newsdesk = stripos($brand, 'Creator Newsdesk') !== false;

        if ($respect_claims && $claim_user_id > 0) {
            $this->claim_needs_image_posts($posts, $claim_user_id);
        }

        foreach ($posts as $post) {
            $featured_prompt = (string) get_post_meta($post->ID, self::META_FEATURED_IMAGE_PROMPT, true);
            $social_prompt = (string) get_post_meta($post->ID, self::META_SOCIAL_IMAGE_PROMPT, true);
            $story_prompt = (string) get_post_meta($post->ID, self::META_STORY_IMAGE_PROMPT, true);
            $redo_required = (string) get_post_meta($post->ID, self::META_IMAGE_REDO_REQUIRED, true) === '1';
            $story_required = (string) get_post_meta($post->ID, self::META_STORY_REQUIRED, true) === '1';
            $thumbnail_id = (int) get_post_thumbnail_id($post->ID);
            $image_provider = $this->image_provider((int) $post->ID, $thumbnail_id);
            $provider_review_state = $this->image_provider_review_state($image_provider);
            $managed_images = $this->managed_image_items((int) $post->ID);
            $prompt = $social_prompt ?: $featured_prompt;
            $category_names = wp_get_post_categories($post->ID, ['fields' => 'names']);
            $category_label = $category_names ? implode(', ', $category_names) : 'Uncategorized';
            $summary = get_the_excerpt($post->ID);
            if ($summary === '') {
                $summary = wp_trim_words(wp_strip_all_tags((string) $post->post_content), 34);
            }
            $story_prompt = $this->story_image_prompt_for_post($post, $summary, $story_prompt);
            $human_prompt = $this->human_image_prompt([
                'title' => get_the_title($post->ID),
                'category' => $category_label,
                'summary' => $summary,
                'source_prompt' => $prompt,
                'content' => wp_strip_all_tags((string) $post->post_content),
            ]);
            $trend = $this->image_trend_score($post);
            $logo_url = $this->site_logo_payload_url();
            $api_allowed = $this->current_user_can_run_paid_image_api();
            $requested_by = $this->current_user_login_name();

            $items[] = [
                'post_id' => (int) $post->ID,
                'title' => get_the_title($post->ID),
                'status' => get_post_status($post->ID),
                'category' => $category_label,
                'post_date_gmt' => (string) $post->post_date_gmt,
                'post_modified_gmt' => (string) $post->post_modified_gmt,
                'news_priority' => $is_creator_newsdesk,
                'headline_led_prompt' => $is_creator_newsdesk,
                'trend_score' => (int) $trend['score'],
                'trend_label' => (string) $trend['label'],
                'trend_hashtags' => $trend['hashtags'],
                'trend_query' => (string) $trend['trend_query'],
                'trend_reasons' => $trend['reasons'],
                'image_state' => $redo_required
                    ? 'redo'
                    : ($thumbnail_id <= 0 ? 'missing' : ($provider_review_state === 'trusted' ? 'review' : 'provider-review')),
                'redo_required' => $redo_required,
                'story_required' => $story_required,
                'image_provider' => $image_provider,
                'provider_review_state' => $provider_review_state,
                'featured_media' => $thumbnail_id,
                'claim_label' => $this->image_claim_label($post->ID, $claim_user_id),
                'claim_expires' => (int) get_post_meta($post->ID, self::META_IMAGE_CLAIM_EXPIRES, true),
                'diagnostic' => $this->needs_image_diagnostic($post->ID, $category_label, $claim_user_id),
                'summary' => $summary,
                'edit_url' => get_edit_post_link($post->ID, 'raw'),
                'permalink' => get_permalink($post->ID),
                'featured_image_prompt' => $featured_prompt,
                'social_image_prompt' => $social_prompt,
                'story_image_prompt' => $story_prompt,
                'chatgpt_prompt' => $human_prompt,
                'managed_images' => $managed_images,
                'api_generation_allowed' => $api_allowed,
                'api_payload' => [
                    'model' => 'gpt-image-1',
                    'size' => '1536x1024',
                    'quality' => 'high',
                    'prompt' => $human_prompt,
                    'site_name' => get_bloginfo('name'),
                    'site_logo_url' => $logo_url,
                    'requested_by_user_login' => $requested_by,
                ],
            ];
        }

        usort($items, static function (array $a, array $b) use ($is_creator_newsdesk): int {
            $priority = ['redo' => 0, 'provider-review' => 1, 'missing' => 2, 'review' => 3];
            $redo_compare = (int) (($a['image_state'] ?? '') !== 'redo') <=> (int) (($b['image_state'] ?? '') !== 'redo');
            if ($redo_compare !== 0) {
                return $redo_compare;
            }
            if ($is_creator_newsdesk) {
                $left_unpublished = in_array((string) ($a['status'] ?? ''), ['draft', 'pending'], true) ? 0 : 1;
                $right_unpublished = in_array((string) ($b['status'] ?? ''), ['draft', 'pending'], true) ? 0 : 1;
                $publication_compare = $left_unpublished <=> $right_unpublished;
                if ($publication_compare !== 0) {
                    return $publication_compare;
                }
                $ingest_order_compare = ((int) ($b['post_id'] ?? 0)) <=> ((int) ($a['post_id'] ?? 0));
                if ($ingest_order_compare !== 0) {
                    return $ingest_order_compare;
                }
                $left_time = strtotime((string) ($a['post_date_gmt'] ?? '')) ?: 0;
                $right_time = strtotime((string) ($b['post_date_gmt'] ?? '')) ?: 0;
                $freshness_compare = $right_time <=> $left_time;
                if ($freshness_compare !== 0) {
                    return $freshness_compare;
                }
            }
            $state_compare = ($priority[$a['image_state'] ?? 'review'] ?? 4) <=> ($priority[$b['image_state'] ?? 'review'] ?? 4);
            if ($state_compare !== 0) {
                return $state_compare;
            }
            $score_compare = ((int) ($b['trend_score'] ?? 0)) <=> ((int) ($a['trend_score'] ?? 0));
            if ($score_compare !== 0) {
                return $score_compare;
            }

            return ((int) ($b['post_id'] ?? 0)) <=> ((int) ($a['post_id'] ?? 0));
        });

        return $items;
    }

    private function needs_image_count(string $category_filter = '', string $search_filter = '', int $claim_user_id = 0, bool $respect_claims = false): int {
        if ($category_filter === '' && $search_filter === '') {
            return $this->fast_needs_image_count($claim_user_id, $respect_claims);
        }

        $query = new WP_Query(array_merge(
            $this->needs_image_query_args(1, 0, $category_filter, $search_filter, $claim_user_id, $respect_claims),
            [
                'fields' => 'ids',
                'no_found_rows' => false,
            ]
        ));

        return (int) $query->found_posts;
    }

    private function fast_needs_image_posts(int $per_page, int $offset, int $claim_user_id, bool $respect_claims): array {
        global $wpdb;

        $where = $this->fast_needs_image_where_sql($claim_user_id, $respect_claims);
        $order_by = $this->is_creator_newsdesk_site()
            ? "CASE WHEN p.post_status IN ('draft','pending') THEN 0 ELSE 1 END ASC, p.ID DESC"
            : 'p.post_modified_gmt DESC, p.ID DESC';
        $ids = $wpdb->get_col($wpdb->prepare(
            "SELECT p.ID
             FROM {$wpdb->posts} p
             WHERE {$where}
             ORDER BY {$order_by}
             LIMIT %d OFFSET %d",
            max(1, $per_page),
            max(0, $offset)
        ));

        $posts = array_map('get_post', array_map('intval', is_array($ids) ? $ids : []));
        return array_values(array_filter($posts, static fn($post): bool => $post instanceof WP_Post));
    }

    private function fast_needs_image_count(int $claim_user_id, bool $respect_claims): int {
        global $wpdb;

        $where = $this->fast_needs_image_where_sql($claim_user_id, $respect_claims);
        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} p WHERE {$where}");
    }

    private function fast_needs_image_where_sql(int $claim_user_id, bool $respect_claims): string {
        global $wpdb;

        $image_required = esc_sql(self::META_IMAGE_REQUIRED);
        $redo_required = esc_sql(self::META_IMAGE_REDO_REQUIRED);
        $story_required = esc_sql(self::META_STORY_REQUIRED);
        $secondary_images = esc_sql(self::META_SECONDARY_SOCIAL_IMAGES);
        $provider_key = esc_sql(self::META_FEATURED_IMAGE_PROVIDER);
        $claim_user_key = esc_sql(self::META_IMAGE_CLAIM_USER);
        $claim_expires_key = esc_sql(self::META_IMAGE_CLAIM_EXPIRES);
        $provider_values = implode(',', array_map(
            static fn(string $provider): string => "'" . esc_sql($provider) . "'",
            ['pytorch', 'torch', 'stable-diffusion', 'sdxl', 'template', 'legacy', 'local-ai', 'automatic', 'unknown']
        ));

        $where = "p.post_type = 'post'
            AND p.post_status IN ('publish','draft','pending','future')
            AND (
                EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$image_required}' AND pm.meta_value = '1')
                OR EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$redo_required}' AND pm.meta_value = '1')
                OR EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$story_required}' AND pm.meta_value = '1')
                OR NOT EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id')
                OR EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id' AND CAST(pm.meta_value AS UNSIGNED) = 0)
                OR (
                    EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id')
                    AND NOT EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$secondary_images}')
                )
                OR EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$provider_key}' AND pm.meta_value IN ({$provider_values}))
                OR (
                    EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id')
                    AND NOT EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$provider_key}')
                )
            )";

        if ($respect_claims && $claim_user_id > 0) {
            $claim_user_id = absint($claim_user_id);
            $now = (int) current_time('timestamp', true);
            $where .= "
                AND EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$claim_user_key}' AND pm.meta_value = '{$claim_user_id}')
                AND EXISTS (SELECT 1 FROM {$wpdb->postmeta} pm WHERE pm.post_id = p.ID AND pm.meta_key = '{$claim_expires_key}' AND CAST(pm.meta_value AS UNSIGNED) > {$now})";
        }

        return $where;
    }

    private function creator_newsdesk_post_media_ready(int $post_id): bool {
        foreach ([self::META_IMAGE_REQUIRED, self::META_STORY_REQUIRED, self::META_IMAGE_REDO_REQUIRED] as $meta_key) {
            if ((string) get_post_meta($post_id, $meta_key, true) === '1') {
                return false;
            }
        }

        $featured_id = (int) get_post_thumbnail_id($post_id);
        $featured_meta = $featured_id > 0 ? wp_get_attachment_metadata($featured_id) : [];
        if ((int) ($featured_meta['width'] ?? 0) !== 1536 || (int) ($featured_meta['height'] ?? 0) !== 1024) {
            return false;
        }

        $story_ids = $this->secondary_social_image_ids($post_id);
        $story_id = (int) ($story_ids[0] ?? 0);
        $story_meta = $story_id > 0 ? wp_get_attachment_metadata($story_id) : [];
        return (int) ($story_meta['width'] ?? 0) === 1080 && (int) ($story_meta['height'] ?? 0) === 1920;
    }

    private function image_ready_publish_query_args(int $per_page): array {
        if ($this->is_creator_newsdesk_site()) {
            $not_required = static function (string $meta_key): array {
                return [
                    'relation' => 'OR',
                    [
                        'key' => $meta_key,
                        'compare' => 'NOT EXISTS',
                    ],
                    [
                        'key' => $meta_key,
                        'value' => '1',
                        'compare' => '!=',
                    ],
                ];
            };

            return [
                'post_type' => 'post',
                'post_status' => ['draft', 'pending'],
                'posts_per_page' => $per_page,
                'orderby' => [
                    'modified' => 'DESC',
                    'ID' => 'DESC',
                ],
                'meta_query' => [
                    'relation' => 'AND',
                    [
                        'key' => '_thumbnail_id',
                        'compare' => 'EXISTS',
                    ],
                    [
                        'key' => self::META_SECONDARY_SOCIAL_IMAGES,
                        'compare' => 'EXISTS',
                    ],
                    $not_required(self::META_IMAGE_REQUIRED),
                    $not_required(self::META_STORY_REQUIRED),
                    $not_required(self::META_IMAGE_REDO_REQUIRED),
                ],
            ];
        }

        return [
            'post_type' => 'post',
            'post_status' => ['draft', 'pending'],
            'posts_per_page' => $per_page,
            'orderby' => 'meta_value',
            'order' => 'ASC',
            'meta_key' => self::META_IMAGE_READY_AT,
            'meta_query' => [
                'relation' => 'AND',
                [
                    'key' => self::META_IMAGE_READY_FOR_PUBLISH,
                    'value' => '1',
                ],
                [
                    'key' => self::META_IMAGE_REQUIRED,
                    'value' => '0',
                ],
                [
                    'key' => '_thumbnail_id',
                    'compare' => 'EXISTS',
                ],
            ],
        ];
    }

    private function image_ready_publish_items(int $per_page): array {
        $candidate_limit = $this->is_creator_newsdesk_site() ? max(200, $per_page) : $per_page;
        $posts = get_posts($this->image_ready_publish_query_args($candidate_limit));
        $items = [];

        foreach ($posts as $post) {
            if ($this->is_creator_newsdesk_site() && !$this->creator_newsdesk_post_media_ready((int) $post->ID)) {
                continue;
            }
            $featured_media = (int) get_post_thumbnail_id($post->ID);
            $secondary_images = $this->secondary_social_image_items($post->ID);
            $items[] = [
                'post_id' => (int) $post->ID,
                'title' => get_the_title($post->ID),
                'status' => get_post_status($post->ID),
                'permalink' => get_permalink($post->ID),
                'featured_media' => $featured_media,
                'image_provider' => $this->image_provider($post->ID, $featured_media),
                'secondary_social_images' => $secondary_images,
                'secondary_social_image_count' => count($secondary_images),
                'ready_at' => (string) get_post_meta($post->ID, self::META_IMAGE_READY_AT, true),
            ];
            if (count($items) >= $per_page) {
                break;
            }
        }

        return $items;
    }

    private function image_ready_publish_count(): int {
        if ($this->is_creator_newsdesk_site()) {
            $candidate_ids = get_posts(array_merge(
                $this->image_ready_publish_query_args(-1),
                [
                    'fields' => 'ids',
                    'no_found_rows' => true,
                ]
            ));
            return count(array_filter(
                array_map('intval', is_array($candidate_ids) ? $candidate_ids : []),
                fn(int $post_id): bool => $this->creator_newsdesk_post_media_ready($post_id)
            ));
        }

        $query = new WP_Query(array_merge(
            $this->image_ready_publish_query_args(1),
            [
                'fields' => 'ids',
                'no_found_rows' => false,
            ]
        ));

        return (int) $query->found_posts;
    }

    private function human_image_prompt(array $item): string {
        $settings = $this->settings();
        $brand = trim((string) ($settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'this publication');
        $brand = $this->canonical_prompt_brand($brand);
        $title = trim(wp_strip_all_tags((string) ($item['title'] ?? '')));
        $category = trim(wp_strip_all_tags((string) ($item['category'] ?? '')));
        $summary = trim(wp_strip_all_tags((string) ($item['summary'] ?? '')));
        $content = trim(wp_strip_all_tags((string) ($item['content'] ?? '')));
        $source_prompt = trim((string) ($item['source_prompt'] ?? ''));
        $is_creator_newsdesk = stripos($brand, 'Creator Newsdesk') !== false;
        $padding = min(160, max(64, (int) ($settings['image_safe_padding'] ?? 64)));
        if ($is_creator_newsdesk) {
            return $this->creator_newsdesk_minimal_image_prompt($title, '1536x1024 landscape', $padding);
        }
        $context_mode = (string) ($settings['image_prompt_context'] ?? 'auto');
        if ($context_mode === 'auto') {
            $context_mode = $is_creator_newsdesk ? 'title' : 'full';
        }
        if ($context_mode === 'title') {
            $facts = $title;
        } elseif ($context_mode === 'title-summary') {
            $facts = trim($title . ($summary !== '' ? '. ' . $summary : ''));
        } else {
            $facts = trim($summary . ' ' . $source_prompt . ' ' . $content);
            if ($facts === '') {
                $facts = $title;
            }
        }
        $facts = $this->compact_image_prompt_brief($facts);
        $mode = $this->resolved_image_editorial_mode((string) ($settings['image_editorial_mode'] ?? 'auto'), $brand);
        $logo_mode = (string) ($settings['image_logo_handling'] ?? 'auto');
        if ($logo_mode === 'auto') {
            $logo_mode = $is_creator_newsdesk ? 'supplied' : 'overlay';
        }
        $custom_direction = trim(wp_strip_all_tags((string) ($settings['image_custom_direction'] ?? '')));

        $prompt = [
            $this->image_prompt_intro($title, $facts, $category),
            $this->image_editorial_direction($mode, $brand),
            'Compose specifically for this story rather than from a recurring template. Vary the palette, lighting, headline placement, scale, and composition from story to story.',
            'Do not make a chaotic or overcrowded infographic. Avoid tiny unreadable text, dense panels, chart walls, long text blocks, and cramped icon grids.',
            'Render this exact WordPress post title as the main readable headline, without shortening, paraphrasing, or adding words: "' . $title . '".',
            'Keep every part of the headline, logo, and important subject at least ' . $padding . ' pixels inside all four canvas edges. Nothing may touch or cross the trim edge.',
            'Facebook may center-crop this 1536x1024 Landscape image to a wide 1.91:1 link preview. Keep the complete headline, logo, and other essential details inside the central horizontal safe band from 180 through 844 pixels vertically, and make sure that simulated center crop remains fully readable.',
            $this->image_logo_direction($logo_mode, $brand),
            'Aside from the configured logo and exact post title, add no readable text unless the story context explicitly requires it. Do not invent claims, labels, badges, watermarks, or calls to action.',
            'Visual brief: ' . $facts,
        ];
        if ($custom_direction !== '') {
            $prompt[] = 'Site-specific art direction: ' . $this->compact_image_prompt_brief($custom_direction, 800);
        }

        return trim(implode("\n\n", array_filter($prompt)));
    }

    private function resolved_image_editorial_mode(string $mode, string $brand): string {
        if (in_array($mode, ['news', 'comedy', 'documentary', 'explainer'], true)) {
            return $mode;
        }
        if (stripos($brand, 'Daily Smirk') !== false || stripos($brand, 'Daily Fib') !== false) {
            return 'comedy';
        }
        if (stripos($brand, 'Love Lies') !== false) {
            return 'documentary';
        }
        if (stripos($brand, 'Factology') !== false || stripos($brand, 'Credit Repair') !== false) {
            return 'explainer';
        }
        return 'news';
    }

    private function image_editorial_direction(string $mode, string $brand): string {
        if ($mode === 'comedy') {
            return 'Render the absurd premise as straight-faced, believable editorial photography with cinematic lighting and dry visual timing. Do not use a generic meme, comic-book rendering, or a SATIRE warning badge.';
        }
        if ($mode === 'documentary') {
            return 'Use restrained documentary-style visual storytelling: sober lighting, credible locations or symbolic evidence details, no sensational gore, no invented evidence, and no implication beyond the supplied facts.';
        }
        if ($mode === 'explainer') {
            return 'Use a clear service-journalism composition with one dominant subject and a simple visual metaphor. Keep it credible, useful, and uncluttered rather than turning it into a dense infographic.';
        }
        return 'Create a bold, credible news-magazine feature graphic for ' . $brand . ' with one strong relevant subject, expressive composition, high contrast, and punchy editorial typography.';
    }

    private function image_logo_direction(string $mode, string $brand): string {
        if ($mode === 'supplied') {
            return 'Use the supplied official ' . $brand . ' logo directly in the artwork. Do not redraw it, imitate it, typeset it, or place it inside a container, pill, badge, card, or invented lockup.';
        }
        if ($mode === 'overlay') {
            return 'Do not invent, redraw, imitate, or typeset a publication logo. Leave clean open space for the approved ' . $brand . ' logo to be overlaid after generation; do not draw a placeholder container, pill, badge, card, or lockup.';
        }
        return 'Do not include, invent, redraw, imitate, or typeset any publication logo or logo placeholder.';
    }

    private function story_image_prompt_for_post(WP_Post $post, string $summary, string $stored_prompt): string {
        $settings = $this->settings();
        $brand = trim((string) ($settings['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'this publication');
        $brand = $this->canonical_prompt_brand($brand);
        $call_to_action = trim((string) ($settings['social_call_to_action'] ?? '')) ?: ('Read more on ' . $brand);
        $call_to_action = $this->canonical_brand_name($call_to_action);
        $tags = wp_get_post_tags($post->ID, ['fields' => 'names']);
        $is_fact_or_fiction = array_filter($tags, static fn(string $tag): bool => strtolower($tag) === 'fact or fiction') !== [];
        if ($is_fact_or_fiction && trim($stored_prompt) !== '') {
            return $stored_prompt;
        }

        $is_creator_newsdesk = stripos($brand, 'Creator Newsdesk') !== false;
        $exact_title = trim(wp_strip_all_tags(get_the_title($post->ID)));
        $padding = min(160, max(96, (int) ($settings['image_safe_padding'] ?? 96)));
        if ($is_creator_newsdesk) {
            return $this->creator_newsdesk_minimal_image_prompt($exact_title, '1080x1920 vertical Facebook/Instagram Story', $padding);
        }
        $context_mode = (string) ($settings['image_prompt_context'] ?? 'auto');
        if ($context_mode === 'auto') {
            $context_mode = $is_creator_newsdesk ? 'title' : 'full';
        }
        $clean_summary = $this->dedupe_prompt_sentences(trim(wp_strip_all_tags($summary)));
        $clean_content = trim(wp_strip_all_tags((string) $post->post_content));
        if ($context_mode === 'title') {
            $visual_context = $exact_title;
        } elseif ($context_mode === 'title-summary') {
            $visual_context = trim($exact_title . ($clean_summary !== '' ? '. ' . $clean_summary : ''));
        } else {
            $visual_context = trim($exact_title . ' ' . $clean_summary . ' ' . $clean_content);
        }
        $visual_context = $this->compact_image_prompt_brief($visual_context);

        $mode = $this->resolved_image_editorial_mode((string) ($settings['image_editorial_mode'] ?? 'auto'), $brand);
        $logo_mode = (string) ($settings['image_logo_handling'] ?? 'auto');
        if ($logo_mode === 'auto') {
            $logo_mode = $is_creator_newsdesk ? 'supplied' : 'overlay';
        }
        $custom_direction = trim(wp_strip_all_tags((string) ($settings['image_custom_direction'] ?? '')));
        $is_daily_smirk = stripos($brand, 'Daily Smirk') !== false || stripos($brand, 'Daily Fib') !== false;
        $comic_styles = [
            'dramatic four-color superhero-comic illustration with bold ink contours, halftone shadows, dynamic perspective, and a wholly original cast',
            'polished modern action-comic illustration with expressive poses, saturated color, cinematic panel lighting, and wholly original characters',
            'friendly Sunday newspaper comic-strip illustration with clean linework, flat cheerful colors, expressive faces, and an original cast',
            'mid-century American newspaper strip illustration with restrained colors, simple backgrounds, dry visual timing, and wholly original characters',
            'deadpan domestic humor comic with chunky expressive linework, warm flat colors, and an original human-and-pet cast',
            'vintage pulp crime-comic cover with heavy inks, limited color registration, dramatic shadows, and exaggerated but original characters',
            'energetic manga-inspired comedy panel with speed lines, expressive reactions, crisp black inks, and original characters',
            'retro underground satire-comic illustration with loose ink texture, offbeat expressions, muted print colors, and original characters',
        ];
        $comic_style = $comic_styles[abs(crc32((string) $post->ID . '|' . $exact_title)) % count($comic_styles)];
        $prompt = [
            'Create an original 1080x1920 vertical Facebook/Instagram Story image for ' . $brand . '.',
            $this->image_editorial_direction($mode, $brand),
            'Build a visually rich, full-bleed, story-specific scene with a strong dominant subject, depth, vivid story-appropriate color, and punchy editorial typography. Vary palette, lighting, headline placement, scale, and composition from story to story; do not default to the same dark blue template or empty background.',
            $is_daily_smirk ? 'Visual style for this edition: ' . $comic_style . ', adapted to a vertical social Story. Use broad comic traditions only. Do not reproduce trademarked characters, publisher logos, named comic strips, or an existing artist\'s exact style.' : '',
            'Render this exact WordPress post title as the main readable headline, without shortening, paraphrasing, or adding words: "' . $exact_title . '".',
            $this->image_logo_direction($logo_mode, $brand),
            'Treat the configured logo as a clearly legible secondary brand mark, not a miniature watermark.',
            'Keep every part of the headline, logo, and important subject at least ' . $padding . ' pixels inside all four canvas edges. Nothing may touch or cross the trim edge or mobile UI safe zone.',
            'Aside from the configured logo and exact post title, add no readable text. Do not add a call to action, summary, claim, label, badge, panel, watermark, URL, or category name.',
            'Do not make a generic stock poster, sparse title card, chaotic infographic, or recurring template. Let the imagery and headline hierarchy carry the story.',
            'Visual context only; do not render this context as additional copy: ' . $visual_context,
        ];
        if (!$is_creator_newsdesk && $call_to_action !== '') {
            $prompt[] = 'Reserve unobstructed lower-screen space for the publishing app to add its own call to action later; do not render the call to action into this image.';
        }
        if ($custom_direction !== '') {
            $prompt[] = 'Site-specific art direction: ' . $this->compact_image_prompt_brief($custom_direction, 800);
        }

        return trim(implode("\n\n", array_filter($prompt)));
    }

    private function creator_newsdesk_minimal_image_prompt(string $title, string $format, int $padding): string {
        return implode("\n", [
            'Create a visually strong original ' . $format . ' image for Creator Newsdesk.',
            'Use this exact post title as the only headline: "' . $title . '".',
            'Use the supplied official Creator Newsdesk logo directly, with no container, pill, badge, card, or redrawing.',
            'Keep every part of the title, logo, and important subject at least ' . $padding . ' pixels from every edge.',
            'Do not add any other readable text.',
        ]);
    }

    private function story_topic_from_title(string $title): string {
        $topic = trim(wp_strip_all_tags($title));
        $topic = (string) preg_replace('/^The (?:surprising truth|real story|facts|sourced background|simple version) (?:about|behind|on) /i', '', $topic);
        $topic = (string) preg_replace('/^What people get wrong about /i', '', $topic);
        $topic = (string) preg_replace('/^Why /i', '', $topic);
        $topic = (string) preg_replace('/ (?:is stranger than it sounds|still raises strange questions|still gets people talking|deserves a closer look|is not quite what it seems)\.?$/i', '', $topic);
        $topic = (string) preg_replace('/: what actually happened\.?$/i', '', $topic);

        return trim($topic, " \t\n\r\0\x0B.");
    }

    private function clean_story_prompt_fragment(string $text): string {
        $text = wp_strip_all_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        $text = trim((string) preg_replace('/\s+/', ' ', $text));
        $text = trim($text, " \t\n\r\0\x0B\"'");
        $text = (string) preg_replace('/\s*(?:\.{3}|…)\s*$/u', '', $text);

        return $text;
    }

    private function canonical_prompt_brand(string $brand): string {
        return $this->canonical_brand_name($brand);
    }

    private function is_creator_newsdesk_site(): bool {
        $brand = trim((string) ($this->settings()['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: '');

        return stripos($this->canonical_prompt_brand($brand), 'Creator Newsdesk') !== false;
    }

    private function canonical_brand_name(string $brand): string {
        return trim(str_ireplace(['The Daily Fib', 'Daily Fib', 'Creator Publishing Hub'], ['The Daily Smirk', 'Daily Smirk', 'Creator Publishing Hub'], $brand));
    }

    private function compact_image_prompt_brief(string $text, int $max_chars = 560): string {
        $text = strip_shortcodes($text);
        $text = wp_strip_all_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, get_bloginfo('charset') ?: 'UTF-8');
        $text = (string) preg_replace('/([a-z])([A-Z])/', '$1 $2', $text);
        $text = (string) preg_replace('/\b(?:Read more|See less)\b.*$/i', '', $text);
        $text = trim((string) preg_replace('/\s+/', ' ', $text));
        $text = $this->dedupe_prompt_sentences($text);

        if (function_exists('mb_strlen') && mb_strlen($text) > $max_chars) {
            return wp_html_excerpt($text, $max_chars, '...');
        }

        if (!function_exists('mb_strlen') && strlen($text) > $max_chars) {
            return wp_html_excerpt($text, $max_chars, '...');
        }

        return $text;
    }

    private function image_prompt_intro(string $title, string $facts, string $category): string {
        $brand = trim((string) ($this->settings()['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'the publication');
        $brand = $this->canonical_prompt_brand($brand);
        $standard = [
            'Make a landscape image with the supplied ' . $brand . ' logo, bold layered magazine-style design, vivid colors, and a dramatic main scene.',
            'Create a high-impact 16:9 ' . $brand . ' feature graphic with logo, strong color contrast, cinematic lighting, and visual storytelling.',
            'Design a rich landscape ' . $brand . ' image with logo, premium editorial texture, depth, supporting details, and a clear focal subject.',
            'Make a landscape ' . $brand . ' graphic with logo using a strong color scheme, dramatic subject, readable headline area, and polished news-magazine energy.',
            'Create a wide ' . $brand . ' image with logo, vivid but tasteful palette, cinematic scene, and a few large readable visual callouts.',
            'Make a landscape image with the supplied ' . $brand . ' logo, strong atmosphere, layered background detail, and an engaging feature-story composition.',
        ];
        $historical = [
            'Make a landscape ' . $brand . ' historical feature graphic with logo, sepia/aged-paper tones, dramatic period scene, and rich archival texture.',
            'Create a wide historical editorial ' . $brand . ' image with logo, cinematic light, parchment details, and a strong story scene.',
            'Design a 16:9 ' . $brand . ' landscape image with logo using antique sepia colors, layered historical atmosphere, and large readable callouts.',
        ];
        $haystack = strtolower($title . ' ' . $facts . ' ' . $category);
        $use_historical = str_contains(strtolower($category), 'history')
            || (bool) preg_match('/\b(ancient|archive|century|medieval|historical|history|war|empire|revolution|colonial|victorian|roman|greek|egypt|old|vintage|heritage|folklore)\b/', $haystack);
        $intros = $use_historical ? $historical : $standard;
        $hash = sprintf('%u', crc32($category . '|' . $title . '|' . $facts));
        $index = (int) $hash % count($intros);

        return $intros[$index];
    }

    private function dedupe_prompt_sentences(string $facts): string {
        $parts = preg_split('/(?<=[.!?])\s+/', $facts, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($parts) || count($parts) < 2) {
            return $facts;
        }

        $seen = [];
        $clean = [];
        foreach ($parts as $part) {
            $sentence = trim($part);
            if ($sentence === '') {
                continue;
            }

            $key = strtolower((string) preg_replace('/\s+/', ' ', $sentence));
            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $clean[] = $sentence;
        }

        return trim(implode(' ', $clean));
    }

    private function needs_image_diagnostic(int $post_id, string $category_label, int $claim_user_id): string {
        $post = get_post($post_id);
        $trend = $post instanceof WP_Post ? $this->image_trend_score($post) : ['score' => 0, 'label' => 'Low', 'hashtags' => [], 'trend_query' => '', 'reasons' => []];
        $lines = [
            'Autopilot Image Desk diagnosis',
            'Post #' . $post_id,
            'Title: ' . get_the_title($post_id),
            'Status: ' . get_post_status($post_id),
            'Category: ' . $category_label,
            'Trend priority: ' . $trend['label'] . ' ' . $trend['score'],
            'Trend hashtags: ' . implode(' ', (array) $trend['hashtags']),
            'Trend query: ' . (string) $trend['trend_query'],
            'Image required: ' . (string) get_post_meta($post_id, self::META_IMAGE_REQUIRED, true),
            'Image redo required: ' . (string) get_post_meta($post_id, self::META_IMAGE_REDO_REQUIRED, true),
            'Featured media: ' . (string) get_post_thumbnail_id($post_id),
            'Claim: ' . ($this->image_claim_label($post_id, $claim_user_id) ?: 'unclaimed or expired'),
            'Permalink: ' . get_permalink($post_id),
            'Edit URL: ' . (string) get_edit_post_link($post_id, 'raw'),
        ];

        return implode("\n", $lines);
    }

    private function chatgpt_image_prompt(string $prompt, string $title): string {
        $brand = trim((string) ($this->settings()['site_brand_name'] ?? '')) ?: (get_bloginfo('name') ?: 'this publication');
        return trim(
            "Create the image for this {$brand} draft. Use the prompt exactly, make it visually rich and polished, avoid chaotic overcrowded infographic layouts, keep any text large and readable, and do not add extra claims.\n\n" .
            "Draft title: {$title}\n\n" .
            $prompt
        );
    }

    private function image_provider(int $post_id, int $attachment_id): string {
        $provider = sanitize_key((string) get_post_meta($post_id, self::META_FEATURED_IMAGE_PROVIDER, true));
        if ($provider !== '') {
            return $provider;
        }

        if ((string) get_post_meta($post_id, self::META_MANUAL_SOCIAL_IMAGE, true) !== '') {
            return 'manual';
        }

        if ($attachment_id > 0) {
            $attachment_provider = sanitize_key((string) get_post_meta($attachment_id, self::META_FEATURED_IMAGE_PROVIDER, true));
            if ($attachment_provider !== '') {
                return $attachment_provider;
            }

            $attached_file = (string) get_post_meta($attachment_id, '_wp_attached_file', true);
            if (str_starts_with($attached_file, 'cph-social/')) {
                return 'manual';
            }
        }

        return $attachment_id > 0 ? 'unknown' : 'none';
    }

    private function image_provider_review_state(string $provider): string {
        $provider = sanitize_key($provider);
        if ($provider === '' || $provider === 'none') {
            return 'missing';
        }
        if (str_starts_with($provider, 'approved-')) {
            return 'trusted';
        }
        if (preg_match('/(?:pytorch|torch|stable-diffusion|sdxl|template|legacy|local-ai|automatic)/', $provider)) {
            return 'replace';
        }
        if (preg_match('/(?:openai|chatgpt|gpt-image|manual|human|licensed|unsplash)/', $provider)) {
            return 'trusted';
        }

        return 'review';
    }

    private function append_secondary_social_image(int $post_id, int $attachment_id): void {
        $this->append_attachment_id_meta($post_id, self::META_SECONDARY_SOCIAL_IMAGES, $attachment_id);
    }

    private function remove_secondary_social_image(int $post_id, int $attachment_id): void {
        $this->remove_attachment_id_meta($post_id, self::META_SECONDARY_SOCIAL_IMAGES, $attachment_id);
    }

    private function append_alternate_main_image(int $post_id, int $attachment_id): void {
        $this->append_attachment_id_meta($post_id, self::META_ALTERNATE_MAIN_IMAGES, $attachment_id);
    }

    private function append_attachment_id_meta(int $post_id, string $meta_key, int $attachment_id): void {
        if ($attachment_id <= 0) {
            return;
        }

        $ids = $this->attachment_id_meta_values($post_id, $meta_key);
        if (!in_array($attachment_id, $ids, true)) {
            $ids[] = $attachment_id;
        }

        update_post_meta($post_id, $meta_key, wp_json_encode(array_values($ids)));
    }

    private function remove_attachment_id_meta(int $post_id, string $meta_key, int $attachment_id): void {
        if ($attachment_id <= 0) {
            return;
        }

        $ids = array_values(array_filter(
            $this->attachment_id_meta_values($post_id, $meta_key),
            static fn(int $id): bool => $id !== $attachment_id
        ));

        if ($ids) {
            update_post_meta($post_id, $meta_key, wp_json_encode($ids));
        } else {
            delete_post_meta($post_id, $meta_key);
        }
    }

    private function alternate_main_image_ids(int $post_id): array {
        return $this->attachment_id_meta_values($post_id, self::META_ALTERNATE_MAIN_IMAGES);
    }

    private function secondary_social_image_ids(int $post_id): array {
        return $this->attachment_id_meta_values($post_id, self::META_SECONDARY_SOCIAL_IMAGES);
    }

    private function attachment_id_meta_values(int $post_id, string $meta_key): array {
        $raw = (string) get_post_meta($post_id, $meta_key, true);
        $decoded = $raw !== '' ? json_decode($raw, true) : [];
        if (!is_array($decoded)) {
            $decoded = [];
        }

        return array_values(array_unique(array_filter(array_map('absint', $decoded))));
    }

    private function secondary_social_image_items(int $post_id): array {
        $items = [];
        foreach ($this->secondary_social_image_ids($post_id) as $attachment_id) {
            $url = wp_get_attachment_image_url($attachment_id, 'full');
            if (!$url) {
                continue;
            }

            $items[] = [
                'attachment_id' => $attachment_id,
                'url' => $url,
                'alt' => (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
                'role' => (string) get_post_meta($attachment_id, '_cph_image_role', true),
            ];
        }

        return $items;
    }

    private function managed_image_item(int $attachment_id, string $kind, bool $featured = false): array {
        $full_url = wp_get_attachment_image_url($attachment_id, 'full');
        $thumb_url = wp_get_attachment_image_url($attachment_id, 'medium_large') ?: $full_url;
        if (!$full_url) {
            return [];
        }

        return [
            'attachment_id' => $attachment_id,
            'kind' => $kind,
            'featured' => $featured,
            'label' => $featured ? 'Featured' : ($kind === 'story' ? 'Story' : 'Main'),
            'provider' => $this->image_provider((int) wp_get_post_parent_id($attachment_id), $attachment_id),
            'origin' => sanitize_key((string) get_post_meta($attachment_id, self::META_IMAGE_ORIGIN, true)),
            'filename' => basename((string) get_attached_file($attachment_id)),
            'thumbnail_url' => $thumb_url,
            'full_url' => $full_url,
            'alt' => (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
        ];
    }

    private function managed_image_items(int $post_id): array {
        $items = [];
        $featured_id = (int) get_post_thumbnail_id($post_id);
        if ($featured_id > 0) {
            $item = $this->managed_image_item($featured_id, 'main', true);
            if ($item) {
                $items[] = $item;
            }
        }
        foreach ($this->alternate_main_image_ids($post_id) as $attachment_id) {
            $item = $this->managed_image_item($attachment_id, 'main');
            if ($item) {
                $items[] = $item;
            }
        }
        foreach ($this->secondary_social_image_ids($post_id) as $attachment_id) {
            $item = $this->managed_image_item($attachment_id, 'story');
            if ($item) {
                $items[] = $item;
            }
        }

        return $items;
    }

    private function managed_image_item_markup(array $item): string {
        $attachment_id = absint($item['attachment_id'] ?? 0);
        if ($attachment_id <= 0 || empty($item['full_url'])) {
            return '';
        }

        return sprintf(
            '<article class="fni-media-item" data-attachment-id="%1$d" data-kind="%2$s"><span class="fni-media-kind">%3$s</span><div class="fni-media-thumb"><img src="%4$s" alt="%5$s" loading="lazy" decoding="async"></div><div class="fni-media-meta"><span class="fni-media-name" title="%6$s">%6$s</span><button type="button" class="fni-media-action fni-media-view" data-full-url="%7$s" aria-label="View %6$s full size" title="View full size"><i class="fa-regular fa-eye" aria-hidden="true"></i></button><button type="button" class="fni-media-action fni-media-delete" aria-label="Delete %6$s" title="Delete from post and Media Library"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></div></article>',
            $attachment_id,
            esc_attr((string) ($item['kind'] ?? 'main')),
            esc_html((string) ($item['label'] ?? 'Image')),
            esc_url((string) ($item['thumbnail_url'] ?? $item['full_url'])),
            esc_attr((string) ($item['alt'] ?? '')),
            esc_attr((string) ($item['filename'] ?? ('Image #' . $attachment_id))),
            esc_url((string) $item['full_url'])
        );
    }

    private function is_recyclable_image(string $provider): bool {
        return in_array($provider, ['openai', 'api', 'manual', 'unknown'], true);
    }

    private function hashtag_count(string $caption): int {
        preg_match_all('/(^|\s)#[A-Za-z0-9_]+/', $caption, $matches);
        return count($matches[0]);
    }

    private function social_safe_language(string $value, string $page_profile = ''): string {
        $host = strtolower((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
        $profile = strtolower($page_profile);
        if (strpos($host, 'loveliesabroad') === false && strpos($profile, 'loveliesabroad') === false && strpos($profile, 'love-lies-abroad') === false) {
            return $value;
        }

        $replacements = [
            'murdered' => 'unalived',
            'killed' => 'unalived',
            'slain' => 'unalived',
            'murdering' => 'unaliving',
            'killing' => 'unaliving',
            'murders' => 'unalivings',
            'killings' => 'unalivings',
            'deaths' => 'unalivings',
            'murder' => 'unaliving',
            'homicide' => 'unaliving',
            'death' => 'unaliving',
            'dead' => 'unalived',
        ];

        return (string) preg_replace_callback(
            '/\b(murdered|killed|slain|murdering|killing|murders|killings|deaths|murder|homicide|death|dead)\b/i',
            static function (array $match) use ($replacements): string {
                $replacement = $replacements[strtolower($match[0])] ?? $match[0];
                return ctype_upper(substr($match[0], 0, 1)) ? ucfirst($replacement) : $replacement;
            },
            $value
        );
    }

    private function hashtags_from_caption(string $caption): array {
        preg_match_all('/(^|\s)(#[A-Za-z0-9_]+)/', $caption, $matches);
        $hashtags = array_map(static function (string $tag): string {
            $tag = strtolower(trim($tag));
            if ($tag === '#facts' || $tag === '#generalknowledge') {
                return '#curiousfacts';
            }
            return $tag;
        }, $matches[2] ?? []);
        $hashtags = array_values(array_unique(array_filter($hashtags)));

        return array_slice($hashtags, 0, 4);
    }

    private function image_trend_score(WP_Post $post): array {
        $post_id = (int) $post->ID;
        $title = get_the_title($post_id);
        $caption = (string) get_post_meta($post_id, self::META_SOCIAL, true);
        $trend_query = (string) get_post_meta($post_id, self::META_TREND_QUERY, true);
        $categories = wp_get_post_categories($post_id, ['fields' => 'names']);
        $tags = wp_get_post_tags($post_id, ['fields' => 'names']);
        $summary = get_the_excerpt($post_id);
        if ($summary === '') {
            $summary = wp_trim_words(wp_strip_all_tags((string) $post->post_content), 30);
        }

        $hashtags = $this->hashtags_from_caption($caption);
        $haystack = strtolower(implode(' ', array_filter([
            $title,
            $caption,
            $trend_query,
            implode(' ', $categories ?: []),
            implode(' ', $tags ?: []),
            $summary,
        ])));

        $score = 20;
        $reasons = [];

        $hashtag_count = count($hashtags);
        if ($hashtag_count >= 5) {
            $score += 24;
            $reasons[] = '5+ hashtags';
        } elseif ($hashtag_count >= 3) {
            $score += 16;
            $reasons[] = '3+ hashtags';
        } elseif ($hashtag_count > 0) {
            $score += 6;
            $reasons[] = 'has hashtags';
        }

        if (trim($caption) !== '') {
            $score += 10;
            $reasons[] = 'social caption ready';
        }

        if (trim($trend_query) !== '') {
            $score += 18;
            $reasons[] = 'trend query present';
        }

        $category_bonus = [
            'philippines' => 20,
            'filipino' => 20,
            'space' => 16,
            'science' => 14,
            'history' => 12,
            'bizarre' => 12,
            'psychology' => 10,
            'mystery' => 10,
        ];
        foreach ($category_bonus as $needle => $bonus) {
            if (str_contains($haystack, $needle)) {
                $score += $bonus;
                $reasons[] = ucfirst($needle) . ' audience';
                break;
            }
        }

        $viral_terms = [
            'strange', 'mystery', 'mysterious', 'monster', 'survived', 'survival',
            'rare', 'weird', 'ancient', 'hidden', 'secret', 'unexplained',
            'philippines', 'filipino', 'space', 'brain', 'psychology', 'disaster',
            'only survivor', 'war', 'revolution', 'viral',
        ];
        $term_hits = 0;
        foreach ($viral_terms as $term) {
            if (str_contains($haystack, $term)) {
                $term_hits++;
            }
        }
        if ($term_hits >= 3) {
            $score += 18;
            $reasons[] = 'viral-friendly topic';
        } elseif ($term_hits > 0) {
            $score += min(12, $term_hits * 4);
            $reasons[] = 'curiosity hook';
        }

        $score = max(0, min(100, $score));
        update_post_meta($post_id, self::META_IMAGE_TREND_SCORE, (string) $score);

        if ($score >= 78) {
            $label = 'Hot';
        } elseif ($score >= 58) {
            $label = 'Strong';
        } elseif ($score >= 38) {
            $label = 'Medium';
        } else {
            $label = 'Low';
        }

        return [
            'score' => $score,
            'label' => $label,
            'hashtags' => $hashtags,
            'trend_query' => $trend_query,
            'reasons' => array_values(array_unique($reasons)),
        ];
    }

    private function choose_status(float $confidence, int $source_count, array $risk_flags, bool $image_required, bool $has_featured_image_upload): string {
        $settings = $this->settings();

        if ($settings['autopublish_enabled'] !== '1') {
            return $settings['default_status'];
        }

        if ($risk_flags) {
            return 'draft';
        }

        if ($confidence < (float) $settings['minimum_confidence']) {
            return 'draft';
        }

        if ($source_count < (int) $settings['minimum_sources']) {
            return 'draft';
        }

        if ($image_required && !$has_featured_image_upload) {
            return 'draft';
        }

        return 'publish';
    }

    private function attach_featured_image(int $post_id, string $base64, string $filename, string $alt_text) {
        return $this->attach_base64_image($post_id, $base64, $filename, $alt_text, true);
    }

    private function attach_base64_image(int $post_id, string $base64, string $filename, string $alt_text, bool $set_thumbnail) {
        $binary = base64_decode($base64, true);
        if ($binary === false || $binary === '') {
            return new WP_Error('invalid_featured_image', 'Featured image payload is not valid base64.', ['status' => 400]);
        }

        if (strlen($binary) > 12 * 1024 * 1024) {
            return new WP_Error('featured_image_too_large', 'Featured image payload is larger than 12MB.', ['status' => 413]);
        }

        $filename = $filename ?: 'cph-featured.jpg';
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $allowed_extensions, true)) {
            return new WP_Error('invalid_featured_image_type', 'Featured image must be a JPG, PNG, or WebP file.', ['status' => 400]);
        }

        $upload = wp_upload_bits($filename, null, $binary);
        if (!empty($upload['error'])) {
            return new WP_Error('featured_image_upload_failed', $upload['error'], ['status' => 500]);
        }

        $filetype = wp_check_filetype($upload['file']);
        if (empty($filetype['type']) || !str_starts_with($filetype['type'], 'image/')) {
            @unlink($upload['file']);
            return new WP_Error('invalid_featured_image_mime', 'Uploaded featured image is not a recognized image.', ['status' => 400]);
        }

        $attachment_id = wp_insert_attachment([
            'post_mime_type' => $filetype['type'],
            'post_title' => sanitize_text_field(pathinfo($filename, PATHINFO_FILENAME)),
            'post_content' => '',
            'post_status' => 'inherit',
        ], $upload['file'], $post_id, true);

        if (is_wp_error($attachment_id)) {
            @unlink($upload['file']);
            return $attachment_id;
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';
        $metadata = wp_generate_attachment_metadata($attachment_id, $upload['file']);
        wp_update_attachment_metadata($attachment_id, $metadata);
        update_post_meta($attachment_id, '_wp_attachment_image_alt', $alt_text);
        if ($set_thumbnail) {
            set_post_thumbnail($post_id, $attachment_id);
        }

        return (int) $attachment_id;
    }

    private function category_id(string $category): int {
        if ($category === '') {
            $default_term = get_term((int) get_option('default_category'), 'category');
            $category = $default_term instanceof WP_Term ? $default_term->name : 'Uncategorized';
        }
        $term = term_exists($category, 'category');
        if (!$term) {
            $term = wp_insert_term($category, 'category');
        }

        if (is_wp_error($term)) {
            return (int) get_option('default_category');
        }

        return (int) (is_array($term) ? $term['term_id'] : $term);
    }

    private function risk_flags(string $text): array {
        $settings = $this->settings();
        $terms = preg_split('/\r\n|\r|\n/', (string) $settings['blocked_terms']);
        $flags = [];
        $haystack = strtolower($text);

        foreach ($terms as $term) {
            $term = trim(strtolower($term));
            if ($term !== '' && str_contains($haystack, $term)) {
                $flags[] = $term;
            }
        }

        return array_values(array_unique($flags));
    }

    private function sanitize_string_list($items): array {
        $items = is_array($items) ? $items : [];
        return array_values(array_filter(array_map('sanitize_text_field', $items)));
    }

    private function sanitize_url_list($items): array {
        $items = is_array($items) ? $items : [];
        $urls = [];
        foreach ($items as $item) {
            $url = esc_url_raw((string) $item);
            if ($url) {
                $urls[] = $url;
            }
        }

        return array_values(array_unique($urls));
    }
}

register_activation_hook(__FILE__, ['Creator_Publishing_Hub', 'activate']);
new Creator_Publishing_Hub();
