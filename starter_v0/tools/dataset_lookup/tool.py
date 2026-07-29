from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from tools._shared import ROOT, err, fold_text, terms

DATASET_PATH = ROOT / "data" / "dataset.json"


def _authors(item: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for authorship in item.get("authorships") or []:
        name = str(authorship.get("author_name") or "").strip()
        if name:
            names.append(name)
    return names


def _match_score(item: dict[str, Any], query: str) -> float:
    folded_query = fold_text(query).strip()
    query_terms = terms(query)
    title = str(item.get("title") or item.get("display_name") or "")
    folded_title = fold_text(title)
    authors = _authors(item)
    folded_authors = fold_text(" ".join(authors))
    identifiers = [
        str(item.get("doi") or ""),
        str(item.get("openalex_id") or ""),
        str(item.get("id") or ""),
    ]
    folded_identifiers = [fold_text(value) for value in identifiers if value]

    score = 0.0
    if folded_query == folded_title:
        score = max(score, 100.0)
    elif folded_query and folded_query in folded_title:
        score = max(score, 70.0)

    if any(folded_query == value for value in folded_identifiers):
        score = max(score, 95.0)
    elif folded_query and any(folded_query in value for value in folded_identifiers):
        score = max(score, 80.0)

    if folded_query and folded_query in folded_authors:
        score = max(score, 60.0)

    # Identifiers are matched above as complete strings. Including URL tokens
    # such as "https", "doi", or "openalex" here would create false positives.
    searchable_terms = terms(" ".join([title, " ".join(authors)]))
    if query_terms:
        overlap = len(query_terms & searchable_terms)
        if overlap:
            score = max(score, 50.0 * overlap / len(query_terms))
    return score


def _result_item(item: dict[str, Any], score: float) -> dict[str, Any]:
    return {
        "title": item.get("title") or item.get("display_name"),
        "authors": _authors(item),
        "publication_year": item.get("publication_year"),
        "publication_date": item.get("publication_date"),
        "doi": item.get("doi"),
        "openalex_id": item.get("openalex_id") or item.get("id"),
        "cited_by_count": item.get("cited_by_count", 0),
        "match_score": round(score, 2),
    }


def dataset_lookup(
    query: str = "",
    publication_year: int | None = None,
    max_results: int = 5,
    *,
    dataset_path: Path = DATASET_PATH,
) -> dict[str, Any]:
    """Search local scientific-paper metadata by title, author, DOI, or OpenAlex ID."""
    try:
        cleaned_query = " ".join(str(query or "").split())
        if not cleaned_query:
            raise ValueError("query must not be empty")

        year = int(publication_year) if publication_year is not None else None
        limit = max(1, min(int(max_results or 5), 10))
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        items = payload.get("items")
        if not isinstance(items, list):
            raise ValueError("dataset.json must contain an 'items' list")

        matches: list[tuple[float, int, dict[str, Any]]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            if year is not None and item.get("publication_year") != year:
                continue
            score = _match_score(item, cleaned_query)
            if score <= 0:
                continue
            citations = int(item.get("cited_by_count") or 0)
            matches.append((score, citations, item))

        matches.sort(key=lambda match: (match[0], match[1]), reverse=True)
        return {
            "tool": "dataset_lookup",
            "query": cleaned_query,
            "publication_year": year,
            "total_matches": len(matches),
            "items": [_result_item(item, score) for score, _, item in matches[:limit]],
            "dataset": {
                "path": str(dataset_path),
                "source": payload.get("source"),
                "item_count": len(items),
            },
            "error": None,
        }
    except Exception as exc:
        return err("dataset_lookup", exc)
