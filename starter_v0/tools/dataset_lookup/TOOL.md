---
name: dataset_lookup
track: bonus
kind: local_knowledge
provider: local_json
requires_env: []
inputs: [query, publication_year, max_results]
outputs: [items, total_matches, dataset, error]
side_effect: false
---
# dataset_lookup

Searches scientific-paper metadata stored in `data/dataset.json`.

## Inputs

- `query` (required): A paper title, author name, DOI, or OpenAlex ID.
- `publication_year` (optional): Only return papers published in this year.
- `max_results` (optional, default `5`): Number of results, clamped to 1–10.

## Output

Returns ranked matching papers with title, authors, publication year/date, DOI,
OpenAlex ID, and citation count. A successful call contains `error: null`.

The current dataset contains metadata only. This tool does not invent an
abstract, methodology, findings, conclusion, or full-paper summary. Use a paper
text retrieval tool or provide source text when those details are required.
