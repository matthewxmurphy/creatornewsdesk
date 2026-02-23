<?php
/**
 * Plugin Name:       CND Article Feed
 * Plugin URI:        https://www.creatornewsdesk.com
 * Description:       Provides a JSON feed endpoint for the Creator Newsdesk pipeline to check article status
 * Version:           1.0.0
 * Author:            Creator Newsdesk
 * Author URI:        https://www.creatornewsdesk.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       cnd-article-feed
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class CND_Article_Feed {

    private $version = '1.0.0';
    private $rest_namespace = 'cnd-feed/v1';
    private $rest_base = 'articles';

    public function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
    }

    public function register_rest_routes() {
        register_rest_route(
            $this->rest_namespace,
            '/' . $this->rest_base,
            array(
                array(
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'           => array( $this, 'get_articles' ),
                    'permission_callback' => array( $this, 'permission_check' ),
                    'args'                => array(
                        'per_page' => array(
                            'default'           => 50,
                            'sanitize_callback' => 'absint',
                        ),
                        'status' => array(
                            'default'           => 'any',
                            'sanitize_callback' => 'sanitize_text_field',
                        ),
                        'needs_work' => array(
                            'default'           => false,
                            'sanitize_callback' => 'rest_sanitize_boolean',
                        ),
                    ),
                ),
            )
        );

        register_rest_route(
            $this->rest_namespace,
            '/stats',
            array(
                array(
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'            => array( $this, 'get_stats' ),
                    'permission_callback' => array( $this, 'permission_check' ),
                ),
            )
        );
    }

    public function permission_check() {
        return true;
    }

    public function get_articles( WP_REST_Request $request ) {
        $per_page = $request->get_param( 'per_page' );
        $status   = $request->get_param( 'status' );
        $needs_work = $request->get_param( 'needs_work' );

        $args = array(
            'post_type'      => 'post',
            'posts_per_page' => $per_page,
            'post_status'    => $status,
        );

        if ( $needs_work ) {
            $args['meta_query'] = array(
                'relation' => 'OR',
                array(
                    'key'     => '_thumbnail_id',
                    'compare' => 'NOT EXISTS',
                ),
                array(
                    'key'     => '_yoast_wpseo_title',
                    'compare' => '=',
                    'value'   => '',
                ),
            );
        }

        $query = new WP_Query( $args );
        $articles = array();

        foreach ( $query->posts as $post ) {
            $articles[] = $this->format_article( $post );
        }

        return rest_ensure_response( $articles );
    }

    public function get_stats() {
        $stats = array(
            'total_posts'    => wp_count_posts( 'post' )->publish,
            'drafts'        => wp_count_posts( 'post' )->draft,
            'pending'        => wp_count_posts( 'post' )->pending,
            'with_images'    => 0,
            'without_images' => 0,
            'with_seo'       => 0,
            'without_seo'    => 0,
        );

        $all_posts = get_posts(
            array(
                'post_type'      => 'post',
                'posts_per_page' => -1,
                'post_status'    => array( 'publish', 'draft', 'pending' ),
            )
        );

        foreach ( $all_posts as $post ) {
            $thumbnail_id = get_post_thumbnail_id( $post->ID );
            $yoast_title  = get_post_meta( $post->ID, '_yoast_wpseo_title', true );

            if ( $thumbnail_id ) {
                $stats['with_images']++;
            } else {
                $stats['without_images']++;
            }

            if ( $yoast_title ) {
                $stats['with_seo']++;
            } else {
                $stats['without_seo']++;
            }
        }

        return rest_ensure_response( $stats );
    }

    private function format_article( $post ) {
        $thumbnail_id = get_post_thumbnail_id( $post->ID );
        
        $featured_image = null;
        if ( $thumbnail_id ) {
            $image_meta = wp_get_attachment_metadata( $thumbnail_id );
            $featured_image = array(
                'id'        => $thumbnail_id,
                'url'       => get_the_post_thumbnail_url( $post->ID, 'full' ),
                'alt'       => get_post_meta( $thumbnail_id, '_wp_attachment_image_alt', true ),
                'caption'   => get_post( $thumbnail_id )->post_excerpt,
                'description' => get_post( $thumbnail_id )->post_content,
                'width'     => isset( $image_meta['width'] ) ? $image_meta['width'] : null,
                'height'    => isset( $image_meta['height'] ) ? $image_meta['height'] : null,
            );
        }

        $yoast_title       = get_post_meta( $post->ID, '_yoast_wpseo_title', true );
        $yoast_desc        = get_post_meta( $post->ID, '_yoast_wpseo_metadesc', true );
        $yoast_focuskw     = get_post_meta( $post->ID, '_yoast_wpseo_focuskw', true );

        $seo_status = array(
            'has_title'       => ! empty( $yoast_title ),
            'has_description' => ! empty( $yoast_desc ),
            'has_focus_keyword' => ! empty( $yoast_focuskw ),
            'title'           => $yoast_title,
            'description'     => $yoast_desc,
            'focus_keyword'   => $yoast_focuskw,
        );

        $og_image = null;
        if ( $thumbnail_id ) {
            $og_image = wp_get_attachment_image_url( $thumbnail_id, 'full' );
        }

        $categories = get_the_category( $post->ID );
        $category_names = array();
        foreach ( $categories as $cat ) {
            $category_names[] = $cat->name;
        }

        $tags = get_the_tags( $post->ID );
        $tag_names = array();
        if ( $tags ) {
            foreach ( $tags as $tag ) {
                $tag_names[] = $tag->name;
            }
        }

        return array(
            'id'              => $post->ID,
            'title'           => $post->post_title,
            'slug'            => $post->post_name,
            'status'          => $post->post_status,
            'date'            => $post->post_date,
            'date_gmt'        => $post->post_date_gmt,
            'modified'        => $post->post_modified,
            'modified_gmt'    => $post->post_modified_gmt,
            'link'            => get_permalink( $post->ID ),
            'featured_image'  => $featured_image,
            'og_image'        => $og_image,
            'seo'             => $seo_status,
            'categories'      => $category_names,
            'tags'            => $tag_names,
            'author'          => get_the_author_meta( 'display_name', $post->post_author ),
            'excerpt'         => $post->post_excerpt,
            'needs_work'      => empty( $thumbnail_id ) || empty( $yoast_title ),
        );
    }
}

new CND_Article_Feed();
