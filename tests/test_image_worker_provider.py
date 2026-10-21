"""Copyright 2026 Matthew X Murphy, https://MatthewxMurphy.com.
Product attribution: https://builtnotbegged.com. SPDX-License-Identifier: MIT.
AST-selected worker method only; synthetic posts/provider/storage doubles.
"""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'cnd-image-worker-hourly.py'

class WorkerProviderContract(unittest.TestCase):
    def subject(self, provider, posts):
        tree = ast.parse(SOURCE.read_text())
        selected = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'process_posts']
        self.assertEqual(len(selected), 1)
        self.assertNotIn('generate_image_openclaw', [getattr(node, 'name', None) for node in tree.body])
        events = []
        def call(name, result):
            def fake(*args):
                events.append(name)
                return result
            return fake
        scope = dict(Dict=dict, os=SimpleNamespace(environ={} if provider is None else {'CND_IMAGE_PROVIDER': provider}),
                     get_posts_needing_images=call('posts', posts), can_generate=call('limit', True),
                     generate_image_comfyui=call('comfyui', 'https://fixture.invalid/image.png'),
                     record_usage=call('usage', None), upload_to_wordpress=call('upload', 77),
                     set_featured_image=call('featured', True), print=lambda *args: None)
        exec(compile(ast.Module(body=selected, type_ignores=[]), str(SOURCE), 'exec'), scope)
        return scope['process_posts'], events

    def test_missing_retired_and_unknown_provider_stop_before_post_access(self):
        for provider in [None, '', 'openclaw', 'xai', 'unknown']:
            with self.subTest(provider=provider):
                subject, events = self.subject(provider, [{'id': 101}])
                with self.assertRaises(ValueError):
                    subject()
                self.assertEqual(events, [])

    def test_explicit_existing_provider_empty_queue(self):
        subject, events = self.subject('comfyui', [])
        self.assertEqual(subject(), dict(attempted=0, generated=0, uploaded=0, failed=0, skipped=0))
        self.assertEqual(events, ['posts'])

    def test_explicit_existing_provider_uses_inert_pipeline_once(self):
        subject, events = self.subject('comfyui', [{'id': 101, 'title': {'rendered': 'Invented fixture'}}])
        self.assertEqual(subject(), dict(attempted=1, generated=1, uploaded=1, failed=0, skipped=0))
        self.assertEqual(events, ['posts', 'limit', 'comfyui', 'usage', 'upload', 'featured'])

if __name__ == '__main__':
    unittest.main()
