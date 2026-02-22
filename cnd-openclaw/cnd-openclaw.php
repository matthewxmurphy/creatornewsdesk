<?php
/**
 * Plugin Name: CND OpenClaw Image Generator
 * Description: Auto-generate featured & OG images via OpenClaw/ComfyUI/A1111 for posts
 * Version: 1.1
 * Author: Creator Newsdesk
 * Requires: Yoast SEO, WPGraphQL
 */

if (!defined('ABSPATH')) exit;

class CND_OpenClaw {
    
    private $api_base = 'https://api.openclaw.ai/v1';
    private $xai_api_key = '';
    
    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        
        $this->xai_api_key = get_option('cnd_xai_api_key', '');
    }
    
    public function register_routes() {
        register_rest_route('cnd/v1', '/posts-needs-images', [
            'methods' => 'GET',
            'callback' => [$this, 'get_posts_needing_images'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/posts-needs-og', [
            'methods' => 'GET',
            'callback' => [$this, 'get_posts_needing_og'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/posts-needs-tags', [
            'methods' => 'GET',
            'callback' => [$this, 'get_posts_needing_tags'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/generate/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => [$this, 'generate_image'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/generate-og/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => [$this, 'generate_og_image'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/batch-generate', [
            'methods' => 'POST',
            'callback' => [$this, 'batch_generate'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/stats', [
            'methods' => 'GET',
            'callback' => [$this, 'get_stats'],
            'permission_callback' => [$this, 'check_permission']
        ]);
        
        register_rest_route('cnd/v1', '/tags/analyze/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => [$this, 'analyze_and_add_tags'],
            'permission_callback' => [$this, 'check_permission']
        ]);
    }
    
    public function check_permission() {
        return current_user_can('edit_posts');
    }
    
    public function get_posts_needing_images($request) {
        $limit = $request->get_param('limit') ?: 50;
        
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'orderby' => 'date',
            'order' => 'ASC',
            'meta_query' => [
                'relation' => 'OR',
                ['key' => '_thumbnail_id', 'compare' => 'NOT EXISTS'],
                ['key' => '_thumbnail_id', 'value' => '0']
            ]
        ]);
        
        return $this->format_posts($posts);
    }
    
    public function get_posts_needing_og($request) {
        $limit = $request->get_param('limit') ?: 50;
        
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'orderby' => 'date',
            'order' => 'ASC'
        ]);
        
        $result = [];
        foreach ($posts as $post) {
            $yoast_og = get_post_meta($post->ID, '_yoast_opengraph_image', true);
            $og_image = get_post_meta($post->ID, '_og_image', true);
            
            if (!$yoast_og && !$og_image) {
                $result[] = $this->format_post($post);
            }
        }
        
        return new WP_REST_Response($result, 200);
    }
    
    public function get_posts_needing_tags($request) {
        $limit = $request->get_param('limit') ?: 50;
        
        $posts = get_posts([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'orderby' => 'date',
            'order' => 'ASC'
        ]);
        
        $result = [];
        foreach ($posts as $post) {
            $tags = wp_get_post_tags($post->ID, ['fields' => 'count']);
            if ($tags == 0) {
                $result[] = $this->format_post($post);
            }
        }
        
        return new WP_REST_Response($result, 200);
    }
    
    private function format_posts($posts) {
        $result = [];
        foreach ($posts as $post) {
            $result[] = $this->format_post($post);
        }
        return new WP_REST_Response($result, 200);
    }
    
    private function format_post($post) {
        $content = strip_tags(strip_shortcodes($post->post_content));
        $excerpt = $post->post_excerpt ?: substr($content, 0, 250);
        
        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'date' => $post->post_date,
            'url' => get_permalink($post->ID),
            'description' => $excerpt,
            'has_featured' => has_post_thumbnail($post->ID),
            'has_og' => !empty(get_post_meta($post->ID, '_yoast_opengraph_image', true)),
            'tags_count' => count(wp_get_post_tags($post->ID)),
            'cnd_image_status' => get_post_meta($post->ID, 'cnd_image_status', true)
        ];
    }
    
    public function generate_image($request) {
        $post_id = $request->get_param('id');
        $method = $request->get_param('method') ?: 'openclaw';
        
        return $this->process_image_generation($post_id, $method, 'featured');
    }
    
    public function generate_og_image($request) {
        $post_id = $request->get_param('id');
        $method = $request->get_param('method') ?: 'openclaw';
        
        return $this->process_image_generation($post_id, $method, 'og');
    }
    
    private function process_image_generation($post_id, $method, $type = 'featured') {
        $post = get_post($post_id);
        
        if (!$post) {
            return new WP_Error('not_found', 'Post not found', ['status' => 404]);
        }
        
        $content = strip_tags(strip_shortcodes($post->post_content));
        $description = $post->post_excerpt ?: substr($content, 0, 250);
        $title = $post->post_title;
        
        $prompt = "Create a $type image for article: $title. $description";
        
        $result = null;
        
        if ($method === 'openclaw') {
            $result = $this->call_openclaw($prompt, $post_id);
        } elseif ($method === 'xai') {
            $result = $this->call_xai($prompt, $post_id);
        } elseif ($method === 'comfyui') {
            $result = $this->call_comfyui($prompt, $post_id);
        } elseif ($method === 'a1111') {
            $result = $this->call_a1111($prompt, $post_id);
        }
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        if ($type === 'og') {
            update_post_meta($post_id, '_yoast_opengraph_image', $result['url']);
            update_post_meta($post_id, '_og_image', $result['url']);
        } else {
            if (!empty($result['attachment_id'])) {
                set_post_thumbnail($post_id, $result['attachment_id']);
            }
        }
        
        update_post_meta($post_id, 'cnd_image_status', 'generated');
        
        return new WP_REST_Response([
            'success' => true,
            'post_id' => $post_id,
            'type' => $type,
            'method' => $method,
            'image_url' => $result['url'] ?? null
        ], 200);
    }
    
    public function batch_generate($request) {
        $data = $request->get_json_params();
        $post_ids = $data['post_ids'] ?? [];
        $method = $data['method'] ?? 'openclaw';
        $type = $data['type'] ?? 'featured';
        
        $results = [];
        foreach ($post_ids as $post_id) {
            $result = $this->process_image_generation($post_id, $method, $type);
            $results[] = ['post_id' => $post_id, 'success' => !is_wp_error($result)];
        }
        
        return new WP_REST_Response(['results' => $results], 200);
    }
    
    public function analyze_and_add_tags($request) {
        $post_id = $request->get_param('id');
        $post = get_post($post_id);
        
        if (!$post) {
            return new WP_Error('not_found', 'Post not found', ['status' => 404]);
        }
        
        $title = $post->post_title;
        $content = strip_tags(strip_shortcodes($post->post_content));
        
        $prompt = "Extract 5-10 relevant tags for this article. Return as JSON array of strings. Article: $title. Content: " . substr($content, 0, 500);
        
        $llm_url = get_option('cnd_llm_url', 'http://172.17.0.1:1240');
        
        $response = wp_remote_post($llm_url . '/v1/completions', [
            'body' => json_encode([
                'prompt' => $prompt,
                'max_tokens' => 200
            ]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 60
        ]);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $text = $body['choices'][0]['text'] ?? '';
        
        preg_match('/\[[^\]]+\]/', $text, $matches);
        
        if ($matches) {
            $tags = json_decode($matches[0], true);
            if (is_array($tags)) {
                wp_set_post_tags($post_id, $tags, true);
                return new WP_REST_Response(['success' => true, 'tags' => $tags], 200);
            }
        }
        
        return new WP_REST_Response(['success' => false, 'error' => 'Could not parse tags'], 400);
    }
    
    private function call_openclaw($prompt, $post_id) {
        $api_key = get_option('cnd_openclaw_key', '');
        
        $response = wp_remote_post($this->api_base . '/generate', [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode(['prompt' => $prompt]),
            'timeout' => 60
        ]);
        
        if (is_wp_error($response)) return $response;
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['data']['image_url'])) {
            return $this->download_and_attach($body['data']['image_url'], $post_id);
        }
        
        return new WP_Error('failed', 'OpenClaw generation failed');
    }
    
    private function call_xai($prompt, $post_id) {
        if (!$this->xai_api_key) {
            return new WP_Error('no_key', 'xAI API key not configured');
        }
        
        $response = wp_remote_post('https://api.x.ai/v1/images/generations', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->xai_api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'model' => 'grok-2-imaging-2',
                'prompt' => $prompt,
                'n' => 1,
                'size' => '1024x1024'
            ]),
            'timeout' => 120
        ]);
        
        if (is_wp_error($response)) return $response;
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['data'][0]['url'])) {
            return $this->download_and_attach($body['data'][0]['url'], $post_id);
        }
        
        return new WP_Error('failed', 'xAI generation failed');
    }
    
    private function call_comfyui($prompt, $post_id) {
        $url = get_option('cnd_comfyui_url', 'http://localhost:8188');
        
        $response = wp_remote_post($url . '/prompt', [
            'body' => json_encode([
                'prompt' => ['inputs' => ['text' => $prompt]]
            ]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 120
        ]);
        
        return ['url' => '', 'pending' => true, 'provider' => 'comfyui'];
    }
    
    private function call_a1111($prompt, $post_id) {
        $url = get_option('cnd_a1111_url', 'http://localhost:7860');
        
        $response = wp_remote_post($url . '/sdapi/v1/txt2img', [
            'body' => json_encode([
                'prompt' => $prompt,
                'steps' => 20,
                'width' => 1024,
                'height' => 1024
            ]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 180
        ]);
        
        if (is_wp_error($response)) return $response;
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['images'][0])) {
            $img_data = base64_decode($body['images'][0]);
            return $this->save_base64_image($img_data, $post_id);
        }
        
        return new WP_Error('failed', 'A1111 generation failed');
    }
    
    private function download_and_attach($image_url, $post_id) {
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        
        $tmp = download_url($image_url);
        if (is_wp_error($tmp)) return $tmp;
        
        $id = media_handle_sideload([
            'name' => 'cnd-' . $post_id . '-' . time() . '.png',
            'tmp_name' => $tmp
        ], $post_id);
        
        if (is_wp_error($id)) {
            @unlink($tmp);
            return $id;
        }
        
        return ['url' => wp_get_attachment_url($id), 'attachment_id' => $id];
    }
    
    private function save_base64_image($data, $post_id) {
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        
        $upload_dir = wp_upload_dir();
        $filename = 'cnd-' . $post_id . '-' . time() . '.png';
        $file = $upload_dir['path'] . '/' . $filename;
        
        file_put_contents($file, $data);
        
        $wp_filetype = wp_check_filetype($filename);
        $attachment = [
            'post_mime_type' => $wp_filetype['type'],
            'post_title' => 'Generated Image',
            'post_status' => 'inherit'
        ];
        
        $id = wp_insert_attachment($attachment, $file, $post_id);
        wp_generate_attachment_metadata($id, $file);
        
        return ['url' => wp_get_attachment_url($id), 'attachment_id' => $id];
    }
    
    public function get_stats() {
        global $wpdb;
        
        $total = wp_count_posts('post')->publish;
        
        $with_thumb = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $wpdb->posts p
            INNER JOIN $wpdb->postmeta pm ON p.ID = pm.post_id
            WHERE p.post_type = 'post' AND p.post_status = 'publish'
            AND pm.meta_key = '_thumbnail_id' AND pm.meta_value > 0"
        ));
        
        $with_og = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $wpdb->postmeta
            WHERE meta_key IN ('_yoast_opengraph_image', '_og_image') AND meta_value != ''"
        ));
        
        return new WP_REST_Response([
            'total_posts' => $total,
            'with_featured_image' => (int)$with_thumb,
            'missing_featured_image' => $total - (int)$with_thumb,
            'with_og_image' => (int)$with_og,
            'missing_og_image' => $total - (int)$with_og
        ], 200);
    }
    
    public function add_admin_menu() {
        add_menu_page('CND Images', 'CND Images', 'manage_options', 'cnd-openclaw', [$this, 'admin_page'], 'dashicons-images-alt2', 30);
    }
    
    public function register_settings() {
        register_setting('cnd_openclaw', 'cnd_openclaw_key');
        register_setting('cnd_openclaw', 'cnd_xai_api_key');
        register_setting('cnd_openclaw', 'cnd_llm_url');
        register_setting('cnd_openclaw', 'cnd_comfyui_url');
        register_setting('cnd_openclaw', 'cnd_a1111_url');
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>CND Image Generator</h1>
            
            <form method="post" action="options.php">
                <?php settings_fields('cnd_openclaw'); ?>
                
                <table class="form-table">
                    <tr><th>OpenClaw API Key</th><td><input type="password" name="cnd_openclaw_key" value="<?php echo esc_attr(get_option('cnd_openclaw_key')); ?>" class="regular-text"></td></tr>
                    <tr><th>xAI API Key</th><td><input type="password" name="cnd_xai_api_key" value="<?php echo esc_attr(get_option('cnd_xai_api_key')); ?>" class="regular-text"></td></tr>
                    <tr><th>LLM URL</th><td><input type="text" name="cnd_llm_url" value="<?php echo esc_attr(get_option('cnd_llm_url', 'http://172.17.0.1:1240')); ?>" class="regular-text"></td></tr>
                    <tr><th>ComfyUI URL</th><td><input type="text" name="cnd_comfyui_url" value="<?php echo esc_attr(get_option('cnd_comfyui_url', 'http://localhost:8188')); ?>" class="regular-text"></td></tr>
                    <tr><th>A1111 URL</th><td><input type="text" name="cnd_a1111_url" value="<?php echo esc_attr(get_option('cnd_a1111_url', 'http://localhost:7860')); ?>" class="regular-text"></td></tr>
                </table>
                
                <?php submit_button('Save'); ?>
            </form>
            
            <hr>
            <h2>API Endpoints</h2>
            <ul>
                <li><code>/wp-json/cnd/v1/posts-needs-images</code> - Featured images</li>
                <li><code>/wp-json/cnd/v1/posts-needs-og</code> - OG images</li>
                <li><code>/wp-json/cnd/v1/posts-needs-tags</code> - Posts needing tags</li>
                <li><code>/wp-json/cnd/v1/generate/{id}?method=openclaw|xai|comfyui|a1111</code></li>
                <li><code>/wp-json/cnd/v1/generate-og/{id}</code></li>
                <li><code>/wp-json/cnd/v1/tags/analyze/{id}</code></li>
            </ul>
        </div>
        <?php
    }
}

new CND_OpenClaw();
