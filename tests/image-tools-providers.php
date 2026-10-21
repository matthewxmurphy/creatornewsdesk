<?php
/**
 * Copyright 2026 Matthew X Murphy. https://MatthewxMurphy.com
 * Product attribution: https://builtnotbegged.com
 * SPDX-License-Identifier: MIT
 * Selected-method synthetic contract: no WordPress or provider bootstrap.
 */
namespace CndProviderQA;
$source = file_get_contents(__DIR__ . '/../cnd-image-tools/cnd-image-tools.php');
if ($source === false) { throw new \RuntimeException('Source unavailable.'); }
$methods = []; $pins = [];
foreach (['generate_image', 'generate_og_image', 'process_image_generation', 'batch_generate'] as $name) {
    $pattern = '/^    (?:public|private) function ' . preg_quote($name, '/') . '\([^\n]*\)[^\n]*\n[\s\S]*?^    }\n/m';
    if (preg_match_all($pattern, $source, $matches) !== 1) { throw new \RuntimeException('Method boundary changed: ' . $name); }
    $methods[] = $matches[0][0]; $pins[$name] = hash('sha256', $matches[0][0]);
}
set_error_handler(function ($severity, $message) { throw new \RuntimeException($message); });
$events = []; $failProvider = false;
class WP_Error {
    public function __construct(public $code, public $message, public $data) {}
}
class WP_REST_Response {
    public function __construct(public $data, public $status) {}
}
class Request {
    public function __construct(private $method, private $ids = [101, 102]) {}
    public function get_param($name) {
        if ($name === 'id') { return 101; }
        if ($name === 'method') { return $this->method; }
        throw new \RuntimeException('Unexpected parameter.');
    }
    public function get_json_params() { return ['post_ids' => $this->ids, 'method' => $this->method]; }
}
function get_post($id) {
    global $events; $events[] = ['post', $id];
    return (object)['post_title' => 'Invented fixture', 'post_content' => 'Invented content', 'post_excerpt' => 'Invented excerpt'];
}
function strip_shortcodes($s) { return $s; }
function is_wp_error($result) { return $result instanceof WP_Error; }
function update_post_meta(...$args) { global $events; $events[] = ['meta', ...$args]; }
function set_post_thumbnail(...$args) { global $events; $events[] = ['thumbnail', ...$args]; }
function fake_provider($name, $id) {
    global $events, $failProvider; $events[] = ['provider', $name, $id];
    return $failProvider ? new WP_Error('synthetic_failure', 'Fixture failure', ['status' => 502]) : ['url' => 'https://fixture.invalid/image.png', 'attachment_id' => 77];
}
$fakeProviders = <<<'CODE'
private function call_xai($prompt, $id) { return fake_provider('xai', $id); }
private function call_comfyui($prompt, $id) { return fake_provider('comfyui', $id); }
private function call_a1111($prompt, $id) { return fake_provider('a1111', $id); }
CODE;
eval('namespace CndProviderQA; class Subject {' . implode("\n", $methods) . $fakeProviders . '}');
$subject = new Subject(); $results = [];
foreach (['generate_image', 'generate_og_image', 'batch_generate'] as $entry) {
    foreach ([null, '', 'openclaw', 'unknown', ['xai']] as $index => $method) {
        $events = []; $request = new Request($method); $before = serialize($request);
        $result = $subject->$entry($request);
        $passed = $result instanceof WP_Error && $result->code === 'cnd_provider_required' && $result->data === ['status' => 400] && $events === [] && serialize($request) === $before;
        $results[] = ['id' => $entry . '-reject-' . $index, 'passed' => $passed, 'effects' => $events];
    }
    foreach (['xai', 'comfyui', 'a1111'] as $method) {
        $events = []; $result = $subject->$entry(new Request($method));
        $providers = array_values(array_filter($events, fn($event) => $event[0] === 'provider'));
        $expected = $entry === 'batch_generate' ? [['provider', $method, 101], ['provider', $method, 102]] : [['provider', $method, 101]];
        $passed = $result instanceof WP_REST_Response && $result->status === 200 && $providers === $expected;
        if ($entry === 'batch_generate') { $passed = $passed && $result->data === ['results' => [['post_id' => 101, 'success' => true], ['post_id' => 102, 'success' => true]]]; }
        else { $passed = $passed && $result->data['method'] === $method && $result->data['type'] === ($entry === 'generate_og_image' ? 'og' : 'featured'); }
        $results[] = ['id' => $entry . '-dispatch-' . $method, 'passed' => $passed];
    }
}
$events = []; $result = $subject->batch_generate(new Request('comfyui', []));
$results[] = ['id' => 'explicit-empty-batch', 'passed' => $result instanceof WP_REST_Response && $result->data === ['results' => []] && $events === []];
$events = []; $failProvider = true; $result = $subject->generate_image(new Request('xai'));
$results[] = ['id' => 'provider-error-preserved', 'passed' => $result instanceof WP_Error && $result->code === 'synthetic_failure' && $events === [['post', 101], ['provider', 'xai', 101]]];
$failed = count(array_filter($results, fn($result) => !$result['passed']));
echo json_encode(['total' => count($results), 'failed' => $failed, 'selected' => $pins, 'real_wordpress_or_provider_executed' => false, 'results' => $results], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES) . "\n";
exit($failed === 0 ? 0 : 1);
