#!/usr/bin/env python3
"""Build story cards for the average-hour study."""

from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_COMMITS = ROOT / "data" / "commits_5y.tsv"
DEFAULT_DEPLOYMENTS = ROOT / "data" / "deployments_gh_pages.tsv"
DEFAULT_OUTPUT = ROOT / "data" / "average_hour_stories.json"
WEB_OUTPUT = ROOT / "web" / "public" / "data" / "average_hour_stories.json"
DEFAULT_MODEL = "gpt-5.4-mini"
TIME_ZONE = ZoneInfo("Europe/Paris")


def read_tsv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def parse_dt(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_events(commits_path: Path, deployments_path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for row in read_tsv(commits_path):
        timestamp = parse_dt(row.get("committer_date", ""))
        if not timestamp:
            continue
        events.append(
            {
                "kind": "commit",
                "timestamp": timestamp,
                "repo": row.get("repo", ""),
                "message": row.get("message", ""),
                "theme": row.get("message_theme", ""),
                "url": row.get("url", ""),
            }
        )
    for row in read_tsv(deployments_path):
        timestamp = parse_dt(row.get("deploy_at", ""))
        if not timestamp:
            continue
        events.append(
            {
                "kind": "deployment",
                "timestamp": timestamp,
                "repo": row.get("repo", ""),
                "message": "Successful GitHub Pages deployment",
                "theme": "Pages deploy / domains",
                "url": row.get("environment_url") or row.get("pages_url") or row.get("log_url", ""),
            }
        )
    return sorted(events, key=lambda event: event["timestamp"])


def local_hour_key(timestamp: datetime) -> str:
    local = timestamp.astimezone(TIME_ZONE).replace(minute=0, second=0, microsecond=0)
    return local.isoformat()


def local_day_key(timestamp: datetime) -> str:
    return timestamp.astimezone(TIME_ZONE).date().isoformat()


def local_minute_key(timestamp: datetime) -> str:
    local = timestamp.astimezone(TIME_ZONE).replace(second=0, microsecond=0)
    return local.isoformat()


def minute_of_hour(timestamp: datetime) -> int:
    return timestamp.minute


def bucket_events(events: list[dict[str, Any]], key_func) -> dict[str, list[dict[str, Any]]]:
    buckets: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        key = key_func(event["timestamp"])
        buckets.setdefault(key, []).append(event)
    return buckets


def summarize_bucket(key: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    commits = [event for event in events if event["kind"] == "commit"]
    deployments = [event for event in events if event["kind"] == "deployment"]
    repos = sorted({event["repo"] for event in events if event.get("repo")})
    messages = unique_values(event.get("message", "") for event in commits)[:8]
    themes = Counter(event.get("theme") or "Unclassified" for event in commits)
    repo_counts = Counter(event.get("repo") for event in events if event.get("repo"))
    first = min(event["timestamp"] for event in events)
    last = max(event["timestamp"] for event in events)
    return {
        "key": key,
        "first_at": first.astimezone(TIME_ZONE).isoformat(),
        "last_at": last.astimezone(TIME_ZONE).isoformat(),
        "commit_count": len(commits),
        "deployment_count": len(deployments),
        "event_count": len(events),
        "repos": repos,
        "repo_counts": dict(repo_counts.most_common(6)),
        "messages": messages,
        "themes": dict(themes.most_common(5)),
        "links": unique_values(event.get("url", "") for event in events if event.get("url"))[:6],
    }


def select_story_hours(events: list[dict[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    buckets = [
        summarize_bucket(key, bucket)
        for key, bucket in bucket_events(events, local_hour_key).items()
    ]
    ranked = sorted(buckets, key=story_score, reverse=True)
    selected: list[dict[str, Any]] = []
    seen_repos: set[str] = set()

    for bucket in ranked:
        if bucket["commit_count"] < 2:
            continue
        selected.append(bucket)
        seen_repos.update(bucket["repos"][:3])
        if len(selected) >= limit:
            return selected

    for bucket in ranked:
        if bucket in selected:
            continue
        if any(repo not in seen_repos for repo in bucket["repos"]):
            selected.append(bucket)
            seen_repos.update(bucket["repos"][:3])
        if len(selected) >= limit:
            break
    return selected[:limit]


def story_score(bucket: dict[str, Any]) -> tuple[int, int, int, str]:
    deploy_bonus = min(bucket["deployment_count"], 4) * 4
    repo_bonus = min(len(bucket["repos"]), 6)
    theme_bonus = min(len(bucket["themes"]), 4)
    score = bucket["commit_count"] * 8 + deploy_bonus + repo_bonus + theme_bonus
    return (score, bucket["commit_count"], bucket["event_count"], bucket["key"])


def build_records(events: list[dict[str, Any]]) -> dict[str, Any]:
    commits = [event for event in events if event["kind"] == "commit"]
    minute_counts = Counter(minute_of_hour(event["timestamp"]) for event in commits)
    busiest_minute = max(minute_counts.items(), key=lambda item: (item[1], -item[0])) if minute_counts else (0, 0)
    return {
        "busiest_minute_of_hour": {
            "minute": busiest_minute[0],
            "commit_count": busiest_minute[1],
        },
        "busiest_real_minute": summarize_record_bucket(bucket_events(events, local_minute_key)),
        "busiest_real_hour": summarize_record_bucket(bucket_events(events, local_hour_key)),
        "busiest_real_day": summarize_record_bucket(bucket_events(events, local_day_key)),
    }


def summarize_record_bucket(buckets: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    if not buckets:
        return {"key": "", "commit_count": 0, "deployment_count": 0, "event_count": 0}
    key, events = max(
        buckets.items(),
        key=lambda item: (
            sum(1 for event in item[1] if event["kind"] == "commit"),
            len(item[1]),
            item[0],
        ),
    )
    summary = summarize_bucket(key, events)
    return {
        "key": summary["key"],
        "commit_count": summary["commit_count"],
        "deployment_count": summary["deployment_count"],
        "event_count": summary["event_count"],
        "repos": summary["repos"][:6],
        "messages": summary["messages"][:5],
    }


def build_prompt(story_hours: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "task": "Write concise story cards for a personal GitHub activity dashboard.",
        "tone": [
            "calm, reflective, and precise",
            "ground every sentence in the supplied commit messages",
            "separate measurement from interpretation",
            "avoid contrastive constructions like 'not X, but Y'",
        ],
        "measurement_note": "These are actual Paris-local hours selected from the five-year export. The page around them studies the average hour by minute and second.",
        "stories": [
            {
                "key": bucket["key"],
                "commit_count": bucket["commit_count"],
                "deployment_count": bucket["deployment_count"],
                "repos": bucket["repos"][:5],
                "messages": bucket["messages"][:8],
                "themes": bucket["themes"],
            }
            for bucket in story_hours
        ],
    }


def model_response_schema(count: int) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "stories": {
                "type": "array",
                "minItems": count,
                "maxItems": count,
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string"},
                        "title": {"type": "string"},
                        "summary": {"type": "string"},
                    },
                    "required": ["key", "title", "summary"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["stories"],
        "additionalProperties": False,
    }


def write_with_model(story_hours: list[dict[str, Any]], model: str) -> list[dict[str, str]]:
    from openai import OpenAI

    prompt = build_prompt(story_hours)
    client = OpenAI()
    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "developer",
                "content": "You write concise dashboard story cards from GitHub commit evidence. Return only structured JSON.",
            },
            {
                "role": "user",
                "content": json.dumps(prompt, ensure_ascii=False),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "average_hour_story_cards",
                "strict": True,
                "schema": model_response_schema(len(story_hours)),
            }
        },
    )
    payload = json.loads(response.output_text)
    by_key = {story["key"]: story for story in payload["stories"]}
    return [
        {
            "key": bucket["key"],
            "title": clean_text(by_key.get(bucket["key"], {}).get("title", "")),
            "summary": clean_text(by_key.get(bucket["key"], {}).get("summary", "")),
            "story_source": "model",
        }
        for bucket in story_hours
    ]


def fallback_story(bucket: dict[str, Any]) -> dict[str, str]:
    repo_label = short_repo(next(iter(bucket["repo_counts"]), bucket["repos"][0] if bucket["repos"] else "the projects"))
    theme_label = next(iter(bucket["themes"]), "project work")
    messages = "; ".join(bucket["messages"][:3])
    deploy_text = f" and {bucket['deployment_count']} Pages deployments" if bucket["deployment_count"] else ""
    summary = (
        f"This hour gathered {bucket['commit_count']} commits{deploy_text} around {repo_label}. "
        f"The messages point to {theme_label.lower()}: {messages}."
    )
    return {
        "key": bucket["key"],
        "title": f"{repo_label} concentrated work",
        "summary": clean_text(summary),
        "story_source": "fallback",
    }


def build_payload(events: list[dict[str, Any]], story_hours: list[dict[str, Any]], stories: list[dict[str, str]], model: str, model_error: str = "") -> dict[str, Any]:
    story_by_key = {story["key"]: story for story in stories}
    enriched = []
    for bucket in story_hours:
        story = story_by_key.get(bucket["key"]) or fallback_story(bucket)
        if not story.get("title") or not story.get("summary"):
            story = fallback_story(bucket)
        enriched.append(
            {
                "key": bucket["key"],
                "first_at": bucket["first_at"],
                "last_at": bucket["last_at"],
                "title": story["title"],
                "summary": story["summary"],
                "story_source": story["story_source"],
                "commit_count": bucket["commit_count"],
                "deployment_count": bucket["deployment_count"],
                "event_count": bucket["event_count"],
                "repos": bucket["repos"],
                "repo_counts": bucket["repo_counts"],
                "messages": bucket["messages"],
                "themes": bucket["themes"],
                "links": bucket["links"],
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "time_zone": "Europe/Paris",
        "model": model,
        "model_error": model_error,
        "source_counts": {
            "commits": sum(1 for event in events if event["kind"] == "commit"),
            "deployments": sum(1 for event in events if event["kind"] == "deployment"),
            "events": len(events),
        },
        "records": build_records(events),
        "stories": enriched,
    }


def write_json(payload: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as handle:
        temp_path = Path(handle.name)
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    temp_path.replace(path)


def unique_values(values) -> list[str]:
    seen: set[str] = set()
    output = []
    for value in values:
        value = clean_text(value)
        if not value or value in seen:
            continue
        seen.add(value)
        output.append(value)
    return output


def clean_text(value: str) -> str:
    return " ".join((value or "").replace("\t", " ").splitlines()).strip()


def short_repo(repo: str) -> str:
    return repo.split("/")[-1] if repo else "the projects"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--commits", type=Path, default=DEFAULT_COMMITS)
    parser.add_argument("--deployments", type=Path, default=DEFAULT_DEPLOYMENTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--web-output", type=Path, default=WEB_OUTPUT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--no-model", action="store_true")
    parser.add_argument("--sync-web", action="store_true")
    args = parser.parse_args()

    events = load_events(args.commits, args.deployments)
    story_hours = select_story_hours(events, args.limit)

    model_error = ""
    if not args.no_model and os.environ.get("OPENAI_API_KEY") and story_hours:
        try:
            stories = write_with_model(story_hours, args.model)
        except Exception as exc:  # Keep refreshes reproducible when model access is unavailable.
            model_error = f"{type(exc).__name__}: {exc}"
            stories = [fallback_story(bucket) for bucket in story_hours]
    else:
        stories = [fallback_story(bucket) for bucket in story_hours]

    payload = build_payload(events, story_hours, stories, args.model, model_error)
    write_json(payload, args.output)
    if args.sync_web:
        shutil.copyfile(args.output, args.web_output)
    print(f"Saved {len(story_hours)} average-hour stories to {args.output}")
    if args.sync_web:
        print(f"Synced average-hour stories to {args.web_output}")


if __name__ == "__main__":
    main()
