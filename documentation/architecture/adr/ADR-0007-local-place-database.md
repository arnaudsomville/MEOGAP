# ADR-0007 — Local GeoNames Place Database in the Gateway

**Status:** Accepted
**Date:** 26 November 2026
**Scope:** Gateway place search and recommendations used by the UI search field

## Context

The UI search field previously used 47 hardcoded places. A useful geographic search needs
worldwide coverage, country/region context and recommendations. A browser-only dataset large enough
for that is impractical to download and keep in memory.

## Decision

1. Build a local SQLite database from the GeoNames `allCountries` extract, keeping every feature
   whose feature class is `P` (populated place): approximately 5.2 million rows.
2. Store country and admin-1 names in small lookup tables and keep the place table compact:
   `geoname_id`, `name`, `ascii_name`, `country_code`, `admin1_code`, latitude, longitude,
   population and feature code.
3. Commit a compressed `places.sqlite.xz` archive and generation metadata under
   `projects/gateway/src/gateway/assets/places/`. The uncompressed database and its indexes are
   generated locally or at container build time, not committed.
4. The Gateway prepares the SQLite file once in a writable cache directory, creates the indexes
   required for prefix search, popularity and nearby recommendations, then serves read-only
   queries. `GATEWAY_PLACES_CACHE_DIR` and `GATEWAY_PLACES_DB_PATH` allow deployment overrides.
5. Expose `GET /api/v1/places/suggestions` through the existing UI → Gateway REST boundary. The
   endpoint supports text search, popular places and nearby recommendations using an optional map
   centre.
6. The UI keeps a small hardcoded fallback list when the Gateway search is unavailable. It does not
   download the full database.
7. GeoNames data is licensed under CC BY 4.0; the attribution is shown in the search dropdown and
   recorded in the generated metadata.

## Consequences

- The repository gains a compressed data archive (about 89 MB) but remains below the GitHub
  single-file limit.
- The first local preparation decompresses and indexes the database. Deployments should run the
  preparation step during image build or a one-time setup command; tests use a small fixture
  database instead of the full archive.
- The database is deterministic for a given archive and generation metadata.
- Place names come from GeoNames and may contain duplicates, historical names or population zeros;
  ranking uses population and match quality, not a claim of administrative authority.
- No remote geocoding service or API key is introduced.

## References

- `tools/build_places_database.py`
- `projects/gateway/src/gateway/core/places.py`
- `projects/gateway/src/gateway/assets/places/places.meta.json`
- `https://www.geonames.org/`
