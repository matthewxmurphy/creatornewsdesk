<?php
/**
 * Copyright 2026 Matthew X Murphy. https://MatthewxMurphy.com
 * Product attribution: https://builtnotbegged.com
 * SPDX-License-Identifier: MIT
 * Isolated permission-method contract; no WordPress or provider bootstrap.
 */
namespace CndAuthQA;

$source = file_get_contents($argv[1] ?? __DIR__ . '/../cnd-openclaw/cnd-openclaw.php');
if ($source === false) { throw new \RuntimeException('Source DATA unavailable.'); }
$selected = [];
$methods = [];
foreach (['register_routes', 'check_permission', 'check_post_permission', 'check_batch_permission', 'can_edit_post_id'] as $name) {
    $pattern = '/^    (?:public|private) function ' . preg_quote($name, '/') . '\([^\n]*\)[^\n]*\n[\s\S]*?^    }\n/m';
    $count = preg_match_all($pattern, $source, $matches);
    if ($count === 0 && in_array($name, ['check_post_permission', 'check_batch_permission', 'can_edit_post_id'], true)) { continue; }
    if ($count !== 1) { throw new \RuntimeException('Expected one selected method: ' . $name); }
    $methods[] = $matches[0][0];
    $selected[$name] = hash('sha256', $matches[0][0]);
}
$routes = [];
$actor = [];
$probes = [];
$warnings = [];
set_error_handler(function ($severity, $message) use (&$warnings) { $warnings[] = [$severity, $message]; throw new \RuntimeException($message); });
function register_rest_route($namespace, $route, $config) {
    global $routes;
    if ($namespace !== 'cnd/v1' || isset($routes[$route])) { throw new \RuntimeException('Unexpected route registration.'); }
    $routes[$route] = $config;
}
function current_user_can($capability, ...$args) {
    global $actor, $probes;
    $probes[] = ['capability' => $capability, 'args' => $args];
    if ($capability === 'edit_posts' && $args === []) { return $actor['broad']; }
    if ($capability === 'edit_post' && count($args) === 1 && is_int($args[0])) { return in_array($args[0], $actor['editable'], true); }
    throw new \RuntimeException('Unexpected capability probe.');
}
class Request {
    private $id;
    private $body;
    public function __construct($id, $body) { $this->id = $id; $this->body = $body; }
    public function get_param($name) { if ($name !== 'id') { throw new \RuntimeException('Unexpected parameter.'); } return $this->id; }
    public function get_json_params() { return $this->body; }
}
eval('namespace CndAuthQA; class Subject {' . implode("\n", $methods) . '}');
$subject = new Subject();
$subject->register_routes();
$expectedRoutes = [
    '/posts-needs-images' => ['GET', 'get_posts_needing_images'],
    '/posts-needs-og' => ['GET', 'get_posts_needing_og'],
    '/posts-needs-tags' => ['GET', 'get_posts_needing_tags'],
    '/generate/(?P<id>\d+)' => ['POST', 'generate_image'],
    '/generate-og/(?P<id>\d+)' => ['POST', 'generate_og_image'],
    '/batch-generate' => ['POST', 'batch_generate'],
    '/stats' => ['GET', 'get_stats'],
    '/tags/analyze/(?P<id>\d+)' => ['POST', 'analyze_and_add_tags'],
];
if (array_keys($routes) !== array_keys($expectedRoutes)) { throw new \RuntimeException('Route roster changed.'); }
$routeSummary = [];
foreach ($expectedRoutes as $route => [$method, $handler]) {
    if ($routes[$route]['methods'] !== $method || $routes[$route]['callback'] !== [$subject, $handler]) { throw new \RuntimeException('Handler contract changed.'); }
    $routeSummary[$route] = ['method' => $method, 'handler' => $handler, 'permission' => $routes[$route]['permission_callback'][1]];
}
$cases = [];
foreach (['/generate/(?P<id>\d+)', '/generate-og/(?P<id>\d+)', '/tags/analyze/(?P<id>\d+)'] as $index => $route) {
    foreach ([
        ['foreign', 202, true, [101], false, [202]],
        ['own', 101, true, [101], true, [101]],
        ['editor', 202, true, [101,202], true, [202]],
        ['broad-denied', 101, false, [101], false, []],
        ['zero', 0, true, [101], false, []],
        ['zero-prefixed-own', '00101', true, [101], true, [101]],
    ] as [$id, $post, $broad, $editable, $expected, $objectProbes]) {
        $cases[] = compact('route', 'post', 'broad', 'editable', 'expected', 'objectProbes') + ['id' => 'single-' . $index . '-' . $id, 'body' => null];
    }
}
foreach ([
    ['mixed', ['post_ids'=>[101,202]], true, [101], false, [101,202]],
    ['denied-first', ['post_ids'=>[202,101]], true, [101], false, [202]],
    ['empty', ['post_ids'=>[]], true, [101], true, []],
    ['own', ['post_ids'=>[101,'00101']], true, [101], true, [101,101]],
    ['editor', ['post_ids'=>[101,202]], true, [101,202], true, [101,202]],
    ['broad-denied', ['post_ids'=>[101]], false, [101], false, []],
    ['scalar', ['post_ids'=>'101'], true, [101], false, []],
    ['nested', ['post_ids'=>[[101]]], true, [101], false, []],
    ['boolean', ['post_ids'=>[true]], true, [101], false, []],
    ['zero', ['post_ids'=>[0]], true, [101], false, []],
    ['missing-json', null, true, [101], true, []],
] as [$id, $body, $broad, $editable, $expected, $objectProbes]) {
    $cases[] = compact('body', 'broad', 'editable', 'expected', 'objectProbes') + ['id'=>'batch-' . $id, 'route'=>'/batch-generate', 'post'=>null];
}
foreach (['/posts-needs-images','/posts-needs-og','/posts-needs-tags','/stats'] as $index => $route) {
    foreach ([true,false] as $broad) { $cases[] = ['id'=>'read-' . $index . '-' . (int)$broad, 'route'=>$route, 'post'=>202, 'body'=>null, 'broad'=>$broad, 'editable'=>[], 'expected'=>$broad, 'objectProbes'=>[]]; }
}
$results = [];
foreach ($cases as $case) {
    $actor = ['broad'=>$case['broad'], 'editable'=>$case['editable']];
    $before = serialize([$case, $actor]);
    $probes = [];
    $allowed = call_user_func($routes[$case['route']]['permission_callback'], new Request($case['post'], $case['body']));
    $unchanged = serialize([$case, $actor]) === $before;
    $expectedProbes = [['capability'=>'edit_posts','args'=>[]]];
    foreach ($case['objectProbes'] as $id) { $expectedProbes[] = ['capability'=>'edit_post','args'=>[$id]]; }
    $probesMatch = $probes === $expectedProbes;
    $results[] = ['id'=>$case['id'], 'allowed'=>$allowed, 'expected'=>$case['expected'], 'passed'=>$allowed === $case['expected'] && $unchanged && $probesMatch, 'input_unchanged'=>$unchanged, 'probes_match'=>$probesMatch, 'probes'=>$probes, 'candidate_expected_probes'=>$expectedProbes];
}
$passed = count(array_filter($results, fn($case) => $case['passed']));
echo json_encode(['total'=>count($results),'passed'=>$passed,'failed'=>count($results)-$passed,'selected'=>$selected,'routes'=>$routeSummary,'warnings'=>$warnings,'handlers_or_provider_executed'=>false,'results'=>$results], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES) . "\n";
exit($passed === count($results) ? 0 : 1);
