<?php
/**
 * Plugin Name:       CND Auto Publisher
 * Plugin URI:        https://www.creatornewsdesk.com
 * Description:      Publishes one draft post every X minutes if it has a featured image and SEO metadata
 * Version: 2026.10.05.001
 * Author: MatthewxMurphy.com
 * License: GPL-2.0-or-later
  * Author URI: https://MatthewxMurphy.com
  * License URI: https://www.gnu.org/licenses/gpl-2.0.html
  * Copyright: 2026 MatthewxMurphy.com
 * Modified: 2026-10-05 (source metadata and maintenance documentation)
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
/**
 * Maintenance notes (2026.10.05.001; MatthewxMurphy.com).
 * Activation creates a recurring cron event and the callback can publish eligible drafts. This legacy timer is distinct from the current immediate-news owner and must not be enabled on the same Newsdesk pipeline without explicit migration review.
 * Read the package runbook before changing permissions, persistence or side effects.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */


if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class CND_Auto_Publisher {

    private $option_name = 'cnd_auto_publisher';
    private $interval_minutes = 3;

    public function __construct() {
        add_action( 'init', array( $this, 'register_schedule' ) );
        add_action( 'cnd_publish_scheduled_post', array( $this, 'publish_scheduled_post' ) );
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        add_filter( 'cron_schedules', array( $this, 'add_custom_schedule' ) );
        
        // Activate on plugin enable
        register_activation_hook( __FILE__, array( $this, 'activate' ) );
        register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );
    }

    public function activate() {
        if ( ! wp_next_scheduled( 'cnd_publish_scheduled_post' ) ) {
            wp_schedule_event( time(), 'cnd_every_x_minutes', 'cnd_publish_scheduled_post' );
        }
    }

    public function deactivate() {
        wp_clear_scheduled_hook( 'cnd_publish_scheduled_post' );
    }

    public function add_custom_schedule( $schedules ) {
        $interval = $this->get_interval_minutes();
        $schedules['cnd_every_x_minutes'] = array(
            'interval' => $interval * 60,
            'display'  => sprintf( 'Every %d minutes', $interval )
        );
        return $schedules;
    }

    public function register_schedule() {
        // Re-register schedule with current interval
        if ( wp_next_scheduled( 'cnd_publish_scheduled_post' ) ) {
            wp_clear_scheduled_hook( 'cnd_publish_scheduled_post' );
        }
        wp_schedule_event( time(), 'cnd_every_x_minutes', 'cnd_publish_scheduled_post' );
    }

    private function get_interval_minutes() {
        return get_option( $this->option_name . '_interval', $this->interval_minutes );
    }

    public function publish_scheduled_post() {
        $args = array(
            'post_type'      => 'post',
            'post_status'    => 'draft',
            'posts_per_page' => 1,
            'orderby'        => 'date',
            'order'          => 'ASC',
            'meta_query'     => array(
                'relation' => 'AND',
                array(
                    'key'     => '_thumbnail_id',
                    'compare' => 'EXISTS'
                )
            )
        );

        $query = new WP_Query( $args );

        if ( ! $query->have_posts() ) {
            error_log( 'CND Auto Publisher: No draft posts with featured image found' );
            return;
        }

        $post = $query->posts[0];

        // Check if post has Yoast SEO title
        $seo_title = get_post_meta( $post->ID, '_yoast_wpseo_title', true );
        if ( empty( $seo_title ) ) {
            error_log( 'CND Auto Publisher: Post ' . $post->ID . ' missing SEO title, skipping' );
            return;
        }

        // Get tags for hashtags
        $tags = get_the_tags( $post->ID );
        $hashtags = array();
        
        if ( $tags ) {
            $tag_count = 0;
            foreach ( $tags as $tag ) {
                if ( $tag_count >= 3 ) break;
                $hashtag = preg_replace( '/[^a-zA-Z0-9]/', '', $tag->name );
                $hashtag = strtolower( $hashtag );
                if ( strlen( $hashtag ) > 2 && ! in_array( '#' . $hashtag, $hashtags ) ) {
                    $hashtags[] = '#' . $hashtag;
                    $tag_count++;
                }
            }
        }

        // Check if it's a policy post
        $categories = get_the_category( $post->ID );
        $is_policy = false;
        foreach ( $categories as $cat ) {
            if ( in_array( $cat->slug, array( 'platform-news', 'creator', 'news' ) ) ) {
                $title_lower = strtolower( $post->post_title );
                if ( strpos( $title_lower, 'tip of the day' ) !== false || 
                     strpos( $title_lower, 'creatorslistenup' ) !== false ||
                     strpos( $title_lower, 'policy' ) !== false ) {
                    $is_policy = true;
                    break;
                }
            }
        }

        if ( $is_policy && ! in_array( '#creatorslistenup', $hashtags ) ) {
            $hashtags[] = '#CreatorsListenUp';
        }

        // Build social message
        $social_message = $post->post_title;
        if ( ! empty( $hashtags ) ) {
            $social_message .= ' ' . implode( ' ', $hashtags );
        }

        // Update Jetpack social message
        update_post_meta( $post->ID, 'jetpack_publicize_message', $social_message );

        // Pre-scrape URL for Facebook OG image
        $post_url = get_permalink( $post->ID );
        $this->scrape_facebook( $post_url );

        // Publish the post
        wp_update_post( array(
            'ID'          => $post->ID,
            'post_status' => 'publish'
        ) );

        // Wait briefly then re-scrape to ensure OG image is cached
        sleep( 2 );
        $this->scrape_facebook( $post_url );

        error_log( 'CND Auto Publisher: Published post ' . $post->ID . ' - ' . $post->post_title );
        
        // Trigger Jetpack Social
        do_action( 'jetpack_publish_post', $post );
    }

    private function scrape_facebook( $url ) {
        // Facebook Graph API scrape
        $args = array(
            'method'  => 'POST',
            'body'    => array(
                'id'      => $url,
                'scrape'  => 'true'
            ),
            'timeout' => 30
        );

        $response = wp_remote_post( 'https://graph.facebook.com', $args );
        
        if ( is_wp_error( $response ) ) {
            error_log( 'CND Auto Publisher: Facebook scrape failed - ' . $response->get_error_message() );
        } else {
            $body = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( isset( $body['og_object'] ) ) {
                error_log( 'CND Auto Publisher: Facebook scraped - ' . $url );
            }
        }

        // Also scrape for LinkedIn (uses same crawler)
        wp_remote_get( 'https://www.linkedin.com/sharing/share-offsite/?url=' . urlencode( $url ), array( 'timeout' => 30 ) );
    }

    public function add_admin_menu() {
        add_options_page(
            'CND Auto Publisher',
            'Auto Publisher',
            'manage_options',
            'cnd-auto-publisher',
            array( $this, 'admin_page' )
        );
    }

    public function admin_page() {
        if ( isset( $_POST['cnd_save_settings'] ) && check_admin_referer( 'cnd_save_settings' ) ) {
            update_option( $this->option_name . '_interval', intval( $_POST['interval'] ) );
            
            // Reschedule with new interval
            wp_clear_scheduled_hook( 'cnd_publish_scheduled_post' );
            wp_schedule_event( time(), 'cnd_every_x_minutes', 'cnd_publish_scheduled_post' );
            
            echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
        }

        $interval = $this->get_interval_minutes();
        ?>
        <div class="wrap">
            <h1>CND Auto Publisher</h1>
            <form method="post">
                <?php wp_nonce_field( 'cnd_save_settings' ); ?>
                <table class="form-table">
                    <tr>
                        <th>Publish Interval</th>
                        <td>
                            <input type="number" name="interval" value="<?php echo esc_attr( $interval ); ?>" min="1" max="60" />
                            <p class="description">Minutes between each automatic publish</p>
                        </td>
                    </tr>
                    <tr>
                        <th>Rules</th>
                        <td>
                            <ul>
                                <li>✓ Only publishes posts with <strong>featured images</strong></li>
                                <li>✓ Only publishes posts with <strong>Yoast SEO title</strong></li>
                                <li>✓ Adds hashtags from tags to Jetpack Social</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <th>Next Scheduled</th>
                        <td>
                            <?php
                            $next = wp_next_scheduled( 'cnd_publish_scheduled_post' );
                            if ( $next ) {
                                echo 'Next publish: ' . date( 'Y-m-d H:i:s', $next );
                            } else {
                                echo 'Not scheduled';
                            }
                            ?>
                        </td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" name="cnd_save_settings" class="button-primary" value="Save Settings" />
                </p>
            </form>
            
            <h2>Recent Drafts with Images</h2>
            <?php
            $drafts = new WP_Query( array(
                'post_type'      => 'post',
                'post_status'    => 'draft',
                'posts_per_page' => 10,
                'meta_query'     => array(
                    array(
                        'key'     => '_thumbnail_id',
                        'compare' => 'EXISTS'
                    )
                )
            ) );
            
            if ( $drafts->have_posts() ) {
                echo '<ul>';
                while ( $drafts->have_posts() ) {
                    $drafts->the_post();
                    $has_seo = get_post_meta( get_the_ID(), '_yoast_wpseo_title', true );
                    $status = $has_seo ? '✓ Ready' : '✗ Missing SEO';
                    echo '<li>' . get_the_title() . ' - ' . $status . '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p>No draft posts with images found.</p>';
            }
            ?>
        </div>
        <?php
    }
}

new CND_Auto_Publisher();
