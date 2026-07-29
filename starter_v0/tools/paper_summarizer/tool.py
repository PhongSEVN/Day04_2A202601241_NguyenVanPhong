"""Paper summarizer tool - search papers from arXiv, OpenAlex, and local dataset."""
from __future__ import annotations

import json
import urllib.request
import urllib.parse
from pathlib import Path
from xml.etree import ElementTree as ET


def _search_arxiv(query: str, max_results: int = 5) -> list[dict]:
    """Search arXiv API - try title first, then all fields. Handle 503 errors."""
    import time

    for attempt in range(2):  # Retry once if 503
        try:
            # Try title search first (more specific)
            search_query = urllib.parse.quote(query)
            url = f"http://export.arxiv.org/api/query?search_query=ti:{search_query}&start=0&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"

            with urllib.request.urlopen(url, timeout=5) as response:
                root = ET.fromstring(response.read())

            papers = []
            ns = {"atom": "http://www.w3.org/2005/Atom"}

            for entry in root.findall("atom:entry", ns):
                title = entry.findtext("atom:title", "", ns) or ""
                summary = entry.findtext("atom:summary", "", ns) or ""
                arxiv_id = entry.findtext("atom:id", "", ns) or ""

                # Extract arxiv ID from URL (format: http://arxiv.org/abs/XXXX.XXXXX)
                if "arxiv.org/abs/" in arxiv_id:
                    arxiv_id = arxiv_id.split("arxiv.org/abs/")[-1]

                papers.append({
                    "title": title.strip(),
                    "abstract": summary.strip(),
                    "url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else "",
                    "source": "arXiv"
                })

            return papers
        except urllib.error.HTTPError as e:
            if e.code == 503 and attempt == 0:
                time.sleep(2)  # Wait 2s before retry
                continue
            return []
        except Exception:
            return []

    return []


def _search_openalex(query: str, max_results: int = 5) -> list[dict]:
    """Search OpenAlex API. Decode inverted index abstracts."""
    try:
        search_query = urllib.parse.quote(query)
        url = f"https://api.openalex.org/works?search={search_query}&per-page={max_results}"

        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read())

        papers = []
        for result in data.get("results", []):
            title = result.get("title", "")
            doi = result.get("doi", "")

            # Decode inverted_index abstract
            abstract = ""
            inv_index = result.get("abstract_inverted_index", {})
            if inv_index:
                # Build array from inverted index
                max_pos = max((pos for positions in inv_index.values() for pos in positions), default=-1)
                abstract_words = [""] * (max_pos + 1)
                for word, positions in inv_index.items():
                    for pos in positions:
                        abstract_words[pos] = word
                abstract = " ".join(abstract_words).strip()
            else:
                abstract = result.get("abstract", "")

            papers.append({
                "title": title,
                "abstract": abstract or "",
                "url": doi or result.get("id", ""),
                "source": "OpenAlex"
            })

        return papers
    except Exception:
        return []


def _search_local_dataset(query: str) -> list[dict]:
    """Search local dataset file."""
    try:
        dataset_path = Path(__file__).parent.parent.parent / "data" / "dataset.json"
        if not dataset_path.exists():
            return []

        with open(dataset_path, encoding="utf-8") as f:
            data = json.load(f)

        papers = data.get("items", []) if isinstance(data, dict) else data
        query_lower = query.lower()

        matches = []
        for paper in papers:
            title = paper.get("title", "").lower()
            abstract = paper.get("abstract", "").lower()
            if query_lower in title or query_lower in abstract:
                matches.append({
                    "title": paper.get("title", ""),
                    "abstract": paper.get("abstract", ""),
                    "url": paper.get("url", paper.get("arxiv_url", "")),
                    "source": "Local Dataset"
                })

        return matches
    except Exception:
        return []


def _create_summary(abstract: str, summary_format: str, max_chars: int) -> str:
    """Create summary from abstract."""
    if not abstract:
        return "Không có tóm tắt."

    if summary_format == "full":
        return abstract[:max_chars] + ("..." if len(abstract) > max_chars else "")
    else:  # brief
        sentences = abstract.split(". ")
        summary = ". ".join(sentences[:2])
        if len(summary) > max_chars:
            summary = summary[:max_chars].rsplit(" ", 1)[0] + "..."
        return summary


def paper_summarizer(query: str, summary_format: str = "brief", max_chars: int = 3000) -> dict:
    """Tìm kiếm và tóm tắt bài báo khoa học từ arXiv, OpenAlex, và dataset cục bộ.

    Args:
        query: Tên bài báo, từ khóa, hoặc URL (e.g. "Attention is All You Need")
        summary_format: "brief" (1-2 đoạn) hoặc "full" (chi tiết)
        max_chars: Số ký tự tối đa cho tóm tắt

    Returns:
        dict với keys: title, abstract, summary, url, source
    """
    try:
        # Try multiple sources in order
        all_papers = []

        # 1. Try arXiv first (most relevant for papers)
        arxiv_papers = _search_arxiv(query, max_results=3)
        all_papers.extend(arxiv_papers)

        # 2. Try OpenAlex (broader coverage)
        if not arxiv_papers:
            openalex_papers = _search_openalex(query, max_results=3)
            all_papers.extend(openalex_papers)

        # 3. Try local dataset (fallback)
        if not all_papers:
            local_papers = _search_local_dataset(query)
            all_papers.extend(local_papers)

        if not all_papers:
            return {
                "error": "no_papers_found",
                "message": f"Không tìm thấy bài báo về: {query} từ arXiv, OpenAlex, hoặc dataset cục bộ."
            }

        # Take first result
        paper = all_papers[0]
        title = paper.get("title", "Unknown")
        abstract = paper.get("abstract", "")
        url = paper.get("url", "")
        source = paper.get("source", "Unknown")

        summary = _create_summary(abstract, summary_format, max_chars)

        return {
            "title": title,
            "url": url,
            "abstract": abstract[:500] + "..." if len(abstract) > 500 else abstract,
            "summary": summary,
            "source": source,
            "match_count": len(all_papers)
        }

    except Exception as e:
        return {"error": "tool_error", "message": str(e)}
