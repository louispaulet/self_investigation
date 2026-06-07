import json
import sys
import types
import unittest
from datetime import timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import build_average_hour_stories as stories


class AverageHourStoryTests(unittest.TestCase):
    def test_parse_dt_handles_valid_and_invalid_values(self):
        parsed = stories.parse_dt("2026-01-10T10:18:03Z")

        self.assertEqual(parsed.tzinfo, timezone.utc)
        self.assertIsNone(stories.parse_dt(""))
        self.assertIsNone(stories.parse_dt("not-a-date"))

    def test_select_story_hours_prefers_dense_hours(self):
        events = [
            event("commit", "2026-01-10T10:18:03Z", "louispaulet/a", "Add chart"),
            event("commit", "2026-01-10T10:22:03Z", "louispaulet/a", "Refine chart"),
            event("deployment", "2026-01-10T10:24:03Z", "louispaulet/a", "Deploy"),
            event("commit", "2026-01-11T10:18:03Z", "louispaulet/b", "Small edit"),
        ]

        selected = stories.select_story_hours(events, limit=1)

        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["commit_count"], 2)
        self.assertEqual(selected[0]["deployment_count"], 1)
        self.assertEqual(selected[0]["repos"], ["louispaulet/a"])

    def test_build_prompt_keeps_story_evidence_bounded(self):
        bucket = {
            "key": "2026-01-10T11:00:00+01:00",
            "commit_count": 3,
            "deployment_count": 1,
            "repos": ["louispaulet/a"],
            "messages": [f"Message {index}" for index in range(12)],
            "themes": {"Analytics / charts": 3},
        }

        prompt = stories.build_prompt([bucket])

        self.assertIn("tone", prompt)
        self.assertEqual(prompt["stories"][0]["messages"], [f"Message {index}" for index in range(8)])
        self.assertIn("average hour", prompt["measurement_note"])

    def test_write_with_model_uses_openai_module_without_network(self):
        bucket = {
            "key": "2026-01-10T11:00:00+01:00",
            "commit_count": 2,
            "deployment_count": 0,
            "repos": ["louispaulet/a"],
            "messages": ["Add chart", "Refine chart"],
            "themes": {"Analytics / charts": 2},
        }
        fake_module = types.ModuleType("openai")
        fake_module.OpenAI = FakeOpenAI
        original = sys.modules.get("openai")
        sys.modules["openai"] = fake_module
        try:
            result = stories.write_with_model([bucket], "fake-model")
        finally:
            if original is None:
                sys.modules.pop("openai", None)
            else:
                sys.modules["openai"] = original

        self.assertEqual(result[0]["story_source"], "model")
        self.assertEqual(result[0]["title"], "Focused chart hour")
        self.assertEqual(FakeOpenAI.last_model, "fake-model")

    def test_fallback_story_uses_commit_evidence(self):
        bucket = {
            "key": "2026-01-10T11:00:00+01:00",
            "commit_count": 2,
            "deployment_count": 1,
            "repos": ["louispaulet/a"],
            "repo_counts": {"louispaulet/a": 3},
            "messages": ["Add chart", "Refine chart"],
            "themes": {"Analytics / charts": 2},
        }

        story = stories.fallback_story(bucket)

        self.assertEqual(story["story_source"], "fallback")
        self.assertIn("a", story["title"])
        self.assertIn("Add chart", story["summary"])

    def test_build_payload_falls_back_when_model_story_is_blank(self):
        bucket = {
            "key": "2026-01-10T11:00:00+01:00",
            "first_at": "2026-01-10T11:00:00+01:00",
            "last_at": "2026-01-10T11:10:00+01:00",
            "commit_count": 2,
            "deployment_count": 0,
            "event_count": 2,
            "repos": ["louispaulet/a"],
            "repo_counts": {"louispaulet/a": 2},
            "messages": ["Add chart", "Refine chart"],
            "themes": {"Analytics / charts": 2},
            "links": [],
        }
        events = [
            event("commit", "2026-01-10T10:00:00Z", "louispaulet/a", "Add chart"),
            event("commit", "2026-01-10T10:10:00Z", "louispaulet/a", "Refine chart"),
        ]

        payload = stories.build_payload(events, [bucket], [{"key": bucket["key"], "title": "", "summary": "", "story_source": "model"}], "fake")

        self.assertEqual(payload["stories"][0]["story_source"], "fallback")
        self.assertTrue(payload["stories"][0]["title"])


def event(kind, timestamp, repo, message):
    parsed = stories.parse_dt(timestamp)
    return {
        "kind": kind,
        "timestamp": parsed,
        "repo": repo,
        "message": message,
        "theme": "Analytics / charts",
        "url": "",
    }


class FakeOpenAI:
    last_model = ""

    def __init__(self):
        self.responses = self

    def create(self, **kwargs):
        FakeOpenAI.last_model = kwargs["model"]
        payload = {
            "stories": [
                {
                    "key": "2026-01-10T11:00:00+01:00",
                    "title": "Focused chart hour",
                    "summary": "The commits describe a compact chart refinement session.",
                }
            ]
        }
        return types.SimpleNamespace(output_text=json.dumps(payload))


if __name__ == "__main__":
    unittest.main()
