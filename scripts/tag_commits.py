#!/usr/bin/env python3
"""Tag commit messages with a fixed, model-assisted taxonomy."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import sys
import tempfile
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / "data" / "commits_5y.tsv"
WEB_OUTPUT = ROOT / "web" / "public" / "data" / "commits_5y.tsv"
DEFAULT_AUDIT = ROOT / "data" / "commit_theme_audit.json"
DEFAULT_MODEL = "gpt-5.4-mini"

THEMES = [
    "AI / model experiments",
    "Analytics / charts",
    "Branding / media assets",
    "Cleanup / removal",
    "Content / writing",
    "Crawler / SEO / metadata",
    "Data extraction / datasets",
    "Dependencies / config",
    "Docs / instructions",
    "Feature additions",
    "Fixes / stabilization",
    "Games / interactive demos",
    "Initial setup / bootstrap",
    "Maps / graph views",
    "Navigation / routing",
    "Pages deploy / domains",
    "Portfolio / showcase",
    "Refactor / organization",
    "Search / filtering",
    "Tests / quality checks",
    "Visual UI / layout",
    "Unclassified",
]

COMMIT_KINDS = [
    "feature",
    "fix",
    "refactor",
    "docs",
    "test",
    "config",
    "deploy",
    "merge",
    "setup",
    "content",
    "data",
    "style",
    "cleanup",
    "experiment",
    "unknown",
]

TAG_FIELDS = [
    "message_theme",
    "message_subtheme",
    "commit_kind",
    "theme_confidence",
    "theme_source",
]

RULES = [
    ("Initial setup / bootstrap", "project bootstrap", "setup", r"\b(initial|first working version|bootstrap|scaffold|starter|first iteration|first draft|working version)\b"),
    ("Docs / instructions", "documentation and guidance", "docs", r"\b(readme|docs?|documentation|instruction|agents\.md|license|note|guide|schema)\b"),
    ("Pages deploy / domains", "pages deployment and domains", "deploy", r"\b(deploy|deployed|deployment|publish|published|gh[- ]?pages|github pages|pages data deploy|cname|custom domain|domain|hashrouter|deployed bundle)\b"),
    ("Dependencies / config", "configuration and dependencies", "config", r"\b(package|lockfile|config|configuration|vite|eslint|tailwind|workflow|docker|compose|worker|api key|env|gitignore|ignore|install|upgrade|port|node_modules|dockerize)\b"),
    ("Tests / quality checks", "tests and validation", "test", r"\b(test|tests|testing|lint|ci|coverage|stabilize tests|unitaires)\b"),
    ("Crawler / SEO / metadata", "crawler and metadata", "feature", r"\b(crawler|crawl|seo|metadata|sitemap|robots|fallback content|xml declaration|declaration viewer)\b"),
    ("AI / model experiments", "model and prompt work", "experiment", r"\b(gpt|openai|llm|model|prompt|reco|recommender|image gen|image generator|generative|qag|finetuning|gpu|captions?)\b"),
    ("Data extraction / datasets", "data collection and parsing", "data", r"\b(data|dataset|datasets|csv|tsv|extract|load|parse|parser|import|export|scrape|wikipedia|restaurants?|addresses|declarations?|listings?|deduplicate)\b"),
    ("Analytics / charts", "analysis and charts", "data", r"\b(analysis|stats|metric|dashboard|chart|charts|matrix|counts?|funnel|cadence|plot|plots|visualization|viz|benchmark|benchmarks|pyramid)\b"),
    ("Branding / media assets", "branding and assets", "style", r"\b(favicon|logo|icon|icons|brand|branding|asset|assets|image|images|webp|photo|background|screenshot|media|emoji)\b"),
    ("Navigation / routing", "navigation and routing", "feature", r"\b(navbar|footer|nav|navigation|route|router|link|links|scroll|cta|tab|tabs)\b"),
    ("Visual UI / layout", "interface and layout", "style", r"\b(ui|style|styles|visual|polish|layout|responsive|mobile|display|view|views|card|cards|tile|tiles|button|dropdown|modal|pixels?|spacing|align|center|shrink|enlarge|resize|theme labels|page|pages|iframe|monitor|palette|font|accessibility)\b"),
    ("Content / writing", "copy and content", "content", r"\b(copy|text|tone|content|article|post|posts|homepage|about|intro|description|restaurant descriptions|title|filenames|diary|examples|wine|menu|economy|tax|sauce|translate|abstracts|summary)\b"),
    ("Search / filtering", "search and filtering", "feature", r"\b(search|filter|filters|sort|sorting|ranking|results|query|selector|browsing|classif)\b"),
    ("Maps / graph views", "maps and graphs", "feature", r"\b(map|maps|graph|graphs|network|atlas|nodes?|edge|relationship|spouse)\b"),
    ("Games / interactive demos", "games and demos", "feature", r"\b(game|games|maze|minecraft|agario|city builder|canvas|interactive|simulation|empty room|stl viewer)\b"),
    ("Portfolio / showcase", "portfolio and showcases", "content", r"\b(portfolio|project card|showcase|github\.io|empty room studio project|self investigation project|michelin restaurants project)\b"),
    ("Refactor / organization", "structure and organization", "refactor", r"\b(refactor|split|rename|organize|reorganize|move|moved|extract|simplify|consolidate|modularize|structure|folder|folders|rework|collapse|reorder|combine|compress)\b"),
    ("Cleanup / removal", "cleanup and removals", "cleanup", r"\b(remove|delete|clean|cleanup|archive|drop|hide|disable|declutter|stop tracking)\b"),
    ("Fixes / stabilization", "fixes and stability", "fix", r"\b(fix|repair|bug|correct|resolve|patch|prevent|restore|stabilize|harden|handle|fallback|compatibility|dedupe)\b"),
    ("Feature additions", "feature work", "feature", r"\b(add|added|ajouter|create|build|implement|feat|feature|new|support|enable|allow|include|show|give|generate|save|convert|make|use|switch|replace|expand|clarify|restrict|preserve|set|fill|standardize|unify|swap|change|update|updates|updated|improve|refine|tweak|tighten|refresh|mettre|modifier|read|request)\b"),
]

COMPILED_RULES = [(theme, subtheme, kind, re.compile(pattern, re.IGNORECASE)) for theme, subtheme, kind, pattern in RULES]


def read_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        return list(reader.fieldnames or []), list(reader)


def write_tsv(rows: list[dict[str, str]], path: Path, fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", newline="", dir=path.parent, delete=False) as handle:
        temp_path = Path(handle.name)
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    temp_path.replace(path)


def batch_items(rows: list[dict[str, str]], start: int, size: int) -> list[dict[str, str]]:
    items = []
    for index, row in enumerate(rows[start : start + size], start=start):
        items.append(
            {
                "id": str(index),
                "repo": row.get("repo", ""),
                "sha": row.get("sha", "")[:12],
                "message": row.get("message", ""),
                "additions": row.get("additions", ""),
                "deletions": row.get("deletions", ""),
                "changed_files": row.get("changed_files", ""),
            }
        )
    return items


def response_schema(batch_size: int) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "tags": {
                "type": "array",
                "minItems": batch_size,
                "maxItems": batch_size,
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "message_theme": {"type": "string", "enum": THEMES},
                        "message_subtheme": {"type": "string"},
                        "commit_kind": {"type": "string", "enum": COMMIT_KINDS},
                        "theme_confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    },
                    "required": ["id", "message_theme", "message_subtheme", "commit_kind", "theme_confidence"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["tags"],
        "additionalProperties": False,
    }


def classify_with_model(client: OpenAI, model: str, rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    prompt = {
        "taxonomy": THEMES,
        "commit_kinds": COMMIT_KINDS,
        "instructions": [
            "Assign one message_theme from the taxonomy to each commit.",
            "Use the commit message as the main evidence. Repo names and change size may help disambiguate.",
            "For merge commits, infer the theme from the branch slug when it is present.",
            "Use Unclassified only when no taxonomy label is defensible.",
            "Keep message_subtheme concise, 2 to 5 words, and descriptive.",
            "Tags describe observable work traces, not guaranteed personal intent.",
        ],
        "commits": rows,
    }
    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "developer",
                "content": "You classify GitHub commit messages for a personal activity dashboard. Return only structured data matching the schema.",
            },
            {
                "role": "user",
                "content": json.dumps(prompt, ensure_ascii=False),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "commit_message_theme_batch",
                "strict": True,
                "schema": response_schema(len(rows)),
            }
        },
    )
    return json.loads(response.output_text)["tags"]


def classify_with_rules(row: dict[str, str]) -> dict[str, str]:
    text = " ".join([row.get("message", ""), row.get("repo", "")])
    if row.get("message", "").lower().startswith("merge "):
        kind = "merge"
    else:
        kind = "unknown"
    for theme, subtheme, rule_kind, pattern in COMPILED_RULES:
        if pattern.search(text):
            return {
                "message_theme": theme,
                "message_subtheme": subtheme,
                "commit_kind": kind if kind == "merge" else rule_kind,
                "theme_confidence": "0.55",
                "theme_source": "rule",
            }
    return {
        "message_theme": "Unclassified",
        "message_subtheme": "unclassified",
        "commit_kind": kind,
        "theme_confidence": "0.20",
        "theme_source": "rule",
    }


def validate_model_tags(batch: list[dict[str, str]], tags: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
    expected = {item["id"] for item in batch}
    tagged = {str(tag.get("id", "")): tag for tag in tags}
    valid: dict[str, dict[str, str]] = {}
    for item_id in expected:
        tag = tagged.get(item_id)
        if not tag:
            continue
        theme = str(tag.get("message_theme", ""))
        subtheme = sanitize(str(tag.get("message_subtheme", ""))) or "general"
        kind = str(tag.get("commit_kind", ""))
        try:
            confidence = float(tag.get("theme_confidence", 0))
        except (TypeError, ValueError):
            confidence = 0
        if theme not in THEMES or kind not in COMMIT_KINDS or not 0 <= confidence <= 1:
            continue
        valid[item_id] = {
            "message_theme": theme,
            "message_subtheme": subtheme[:80],
            "commit_kind": kind,
            "theme_confidence": f"{confidence:.2f}",
            "theme_source": "model",
        }
    return valid


def sanitize(value: str) -> str:
    return " ".join(value.replace("\t", " ").splitlines()).strip()


def tag_rows(rows: list[dict[str, str]], model: str, batch_size: int, delay: float) -> tuple[list[dict[str, str]], dict[str, Any]]:
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is required for the model-assisted tagging pass.")

    client = OpenAI()
    tagged_rows = [dict(row) for row in rows]
    batches = 0
    fallback_count = 0
    model_count = 0

    for start in range(0, len(rows), batch_size):
        batch = batch_items(rows, start, batch_size)
        tags = classify_with_model(client, model, batch)
        valid = validate_model_tags(batch, tags)
        batches += 1

        for item in batch:
            row = tagged_rows[int(item["id"])]
            tag = valid.get(item["id"]) or classify_with_rules(row)
            if tag["theme_source"] == "model":
                model_count += 1
            else:
                fallback_count += 1
            for field in TAG_FIELDS:
                row[field] = tag[field]

        print(f"Tagged batch {batches}: rows {start + 1}-{start + len(batch)}", file=sys.stderr)
        if delay:
            time.sleep(delay)

    theme_counts = Counter(row["message_theme"] for row in tagged_rows)
    source_counts = Counter(row["theme_source"] for row in tagged_rows)
    return tagged_rows, {
        "model": model,
        "rows": len(rows),
        "batches": batches,
        "batch_size": batch_size,
        "model_count": model_count,
        "fallback_count": fallback_count,
        "source_counts": dict(source_counts),
        "theme_counts": dict(theme_counts.most_common()),
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def write_audit(audit: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as handle:
        temp_path = Path(handle.name)
        json.dump(audit, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    temp_path.replace(path)


def ensure_fields(fields: list[str]) -> list[str]:
    return [field for field in fields if field not in TAG_FIELDS] + TAG_FIELDS


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--audit-output", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--delay", type=float, default=0.0)
    parser.add_argument("--sync-web", action="store_true")
    args = parser.parse_args()

    if args.batch_size < 1 or args.batch_size > 100:
        raise SystemExit("--batch-size must be between 1 and 100")

    input_path = args.input
    output_path = args.output or input_path
    fields, rows = read_rows(input_path)
    if not rows:
        raise SystemExit(f"No commit rows found in {input_path}")

    original_count = len(rows)
    tagged_rows, audit = tag_rows(rows, args.model, args.batch_size, args.delay)
    if len(tagged_rows) != original_count:
        raise RuntimeError(f"Row count changed from {original_count} to {len(tagged_rows)}")

    output_fields = ensure_fields(fields)
    write_tsv(tagged_rows, output_path, output_fields)
    if args.sync_web:
        if output_path != WEB_OUTPUT:
            shutil.copyfile(output_path, WEB_OUTPUT)
    write_audit(audit, args.audit_output)
    print(f"Tagged {len(tagged_rows)} commits in {output_path}", file=sys.stderr)
    if args.sync_web:
        print(f"Synced tagged commits to {WEB_OUTPUT}", file=sys.stderr)
    print(f"Saved audit to {args.audit_output}", file=sys.stderr)


if __name__ == "__main__":
    main()
