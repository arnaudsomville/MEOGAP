"""Local GeoNames place search backed by a bundled SQLite database.

The committed archive contains every GeoNames populated place (feature class
``P``), with country and admin-1 lookup tables. The SQLite file is decompressed
and indexed once into a writable cache directory, then queried read-only.
"""

from __future__ import annotations

import json
import lzma
import os
import sqlite3
import tempfile
import threading
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from gateway.core.demo.models import PlaceListView, PlaceView

ARCHIVE_NAME = 'places.sqlite.xz'
CACHE_DIR_ENV = 'GATEWAY_PLACES_CACHE_DIR'
DATABASE_PATH_ENV = 'GATEWAY_PLACES_DB_PATH'
DEFAULT_LIMIT = 10
MAX_LIMIT = 50
SEARCH_CANDIDATE_LIMIT = 500
MIN_MEANINGFUL_POPULATION = 1000
NEARBY_DELTA_DEGREES = 0.75
NEARBY_FALLBACK_DELTA_DEGREES = 3.0
INDEX_NAMES = (
    'idx_places_ascii',
    'idx_places_name',
    'idx_places_population',
    'idx_places_lat',
    'idx_places_country_population',
    'idx_places_admin1_population',
)


class PlaceDatabaseError(Exception):
    """Raised when the bundled place database cannot be prepared or queried."""


@dataclass(frozen=True)
class PlaceSearchSettings:
    """Configuration for the local place database."""

    archive_path: Path
    cache_dir: Path
    database_path: Path | None = None


def _default_settings() -> PlaceSearchSettings:
    """Resolve the default archive and cache locations."""
    archive_path = Path(__file__).resolve().parents[1] / 'assets' / 'places' / ARCHIVE_NAME
    cache_dir = Path(os.getenv(CACHE_DIR_ENV, str(Path(tempfile.gettempdir()) / 'meogap-places')))
    database_path = Path(os.environ[DATABASE_PATH_ENV]) if os.getenv(DATABASE_PATH_ENV) else None
    return PlaceSearchSettings(archive_path=archive_path, cache_dir=cache_dir, database_path=database_path)


def normalize_query(value: str) -> str:
    """Return a case-folded, diacritic-free query."""
    decomposed = unicodedata.normalize('NFKD', value)
    return ''.join(character for character in decomposed if not unicodedata.combining(character)).casefold().strip()


def _row_to_view(row: sqlite3.Row, match_type: str) -> PlaceView:
    """Convert one SQLite row to the public place view."""
    return PlaceView(
        place_id=row['geoname_id'],
        name=row['name'],
        country=row['country_name'],
        admin1=row['admin1_name'],
        latitude=row['latitude'],
        longitude=row['longitude'],
        population=row['population'],
        feature_code=row['feature_code'],
        match_type=match_type,
    )


class PlaceDatabase:
    """Read-only populated-place search with a one-time preparation step."""

    def __init__(self, settings: PlaceSearchSettings | None = None, *, prepared: bool = False) -> None:
        """Initialize the database wrapper without touching the file."""
        self.settings = settings or _default_settings()
        self._lock = threading.Lock()
        self._prepared = prepared
        self._database_path = self.settings.database_path

    def prepare(self) -> Path:
        """Decompress and index the bundled database if needed."""
        return self._prepare()

    def search(self, query: str, limit: int = DEFAULT_LIMIT) -> PlaceListView:
        """Search places by name, ASCII name, country or admin-1 name."""
        normalized = normalize_query(query)
        if not normalized:
            return self.popular(limit)
        path = self._prepare()
        tokens = [token for token in normalized.split() if token]
        first = tokens[0]
        candidates: dict[int, sqlite3.Row] = {}
        with self._connect(path) as connection:
            for column, index in (('ascii_name', 'idx_places_ascii'), ('name', 'idx_places_name')):
                rows = connection.execute(
                    f"""
                    SELECT p.geoname_id, p.name, p.ascii_name, p.latitude, p.longitude,
                           p.population, p.feature_code,
                           c.name AS country_name, a.name AS admin1_name
                    FROM places p INDEXED BY {index}
                    JOIN countries c ON c.code = p.country_code
                    LEFT JOIN admin1 a ON a.code = p.admin1_code
                    WHERE p.{column} LIKE ?
                    ORDER BY p.population DESC
                    LIMIT ?
                    """,  # noqa: S608 - column/index names are static
                    (f'{first}%', SEARCH_CANDIDATE_LIMIT),
                ).fetchall()
                candidates.update({row['geoname_id']: row for row in rows})

            country_rows = connection.execute('SELECT code, name FROM countries').fetchall()
            admin_rows = connection.execute('SELECT code, name FROM admin1').fetchall()
            country_codes = [row['code'] for row in country_rows if normalize_query(row['name']).startswith(normalized)]
            admin_codes = [row['code'] for row in admin_rows if normalize_query(row['name']).startswith(normalized)]
            region_query = any(normalize_query(row['name']) == normalized for row in (*country_rows, *admin_rows))
            for code in country_codes:
                rows = connection.execute(
                    """
                    SELECT p.geoname_id, p.name, p.ascii_name, p.latitude, p.longitude,
                           p.population, p.feature_code,
                           c.name AS country_name, a.name AS admin1_name
                    FROM places p INDEXED BY idx_places_country_population
                    JOIN countries c ON c.code = p.country_code
                    LEFT JOIN admin1 a ON a.code = p.admin1_code
                    WHERE p.country_code = ?
                    ORDER BY p.population DESC
                    LIMIT ?
                    """,
                    (code, SEARCH_CANDIDATE_LIMIT),
                ).fetchall()
                candidates.update({row['geoname_id']: row for row in rows})
            for code in admin_codes:
                rows = connection.execute(
                    """
                    SELECT p.geoname_id, p.name, p.ascii_name, p.latitude, p.longitude,
                           p.population, p.feature_code,
                           c.name AS country_name, a.name AS admin1_name
                    FROM places p INDEXED BY idx_places_admin1_population
                    JOIN countries c ON c.code = p.country_code
                    LEFT JOIN admin1 a ON a.code = p.admin1_code
                    WHERE p.admin1_code = ?
                    ORDER BY p.population DESC
                    LIMIT ?
                    """,
                    (code, SEARCH_CANDIDATE_LIMIT),
                ).fetchall()
                candidates.update({row['geoname_id']: row for row in rows})

        ranked: list[tuple[int, int, sqlite3.Row]] = []
        for row in candidates.values():
            fields = (
                normalize_query(row['name']),
                normalize_query(row['ascii_name'] or ''),
                normalize_query(row['country_name']),
                normalize_query(row['admin1_name'] or ''),
            )
            if not all(any(token in field for field in fields) for token in tokens):
                continue
            rank = self._rank(fields, normalized, int(row['population']), region_query)
            ranked.append((rank, -int(row['population']), row))
        ranked.sort(key=lambda item: (item[0], item[1], item[2]['name']))
        return PlaceListView(
            items=[_row_to_view(row, self._match_type(rank)) for rank, _, row in ranked[: max(limit, 1)]]
        )

    @staticmethod
    def _rank(fields: tuple[str, str, str, str], query: str, population: int, region_query: bool) -> int:
        """Rank a candidate by exact name, prefix, country/region or token match."""
        name, ascii_name, country, admin1 = fields
        name_match = query in (name, ascii_name)
        region_match = query in (country, admin1)
        name_prefix = name.startswith(query) or ascii_name.startswith(query)
        region_prefix = country.startswith(query) or admin1.startswith(query)
        if region_query:
            if name_match and population >= MIN_MEANINGFUL_POPULATION:
                rank = 0
            elif region_match:
                rank = 1
            elif name_prefix:
                rank = 2
            elif region_prefix:
                rank = 3
            else:
                rank = 4
        elif name_match:
            rank = 0
        elif region_match:
            rank = 1
        elif name_prefix:
            rank = 2
        elif region_prefix:
            rank = 3
        else:
            rank = 4
        return rank

    @staticmethod
    def _match_type(rank: int) -> str:
        """Translate a rank into the public match type."""
        if rank == 0:
            return 'exact'
        if rank == 1:
            return 'region'
        if rank in (2, 3):
            return 'prefix'
        return 'search'

    def popular(self, limit: int = DEFAULT_LIMIT) -> PlaceListView:
        """Return the most populous places."""
        path = self._prepare()
        sql = """
            SELECT p.geoname_id, p.name, p.ascii_name, p.latitude, p.longitude,
                   p.population, p.feature_code,
                   c.name AS country_name, a.name AS admin1_name
            FROM places p
            JOIN countries c ON c.code = p.country_code
            LEFT JOIN admin1 a ON a.code = p.admin1_code
            WHERE p.population > 0
            ORDER BY p.population DESC, p.name
            LIMIT ?
        """
        with self._connect(path) as connection:
            rows = connection.execute(sql, (max(limit, 1),)).fetchall()
        return PlaceListView(items=[_row_to_view(row, 'popular') for row in rows])

    def recommend(self, latitude: float, longitude: float, limit: int = DEFAULT_LIMIT) -> PlaceListView:
        """Recommend populated places near a map position, then fall back to popular places."""
        path = self._prepare()
        for delta in (NEARBY_DELTA_DEGREES, NEARBY_FALLBACK_DELTA_DEGREES):
            items = self._nearby(path, latitude, longitude, delta, limit)
            if items.items:
                return items
        return self.popular(limit)

    def _nearby(
        self,
        path: Path,
        latitude: float,
        longitude: float,
        delta: float,
        limit: int,
    ) -> PlaceListView:
        """Return populated places in a latitude/longitude box ordered by population."""
        sql = """
            SELECT p.geoname_id, p.name, p.ascii_name, p.latitude, p.longitude,
                   p.population, p.feature_code,
                   c.name AS country_name, a.name AS admin1_name
            FROM places p
            JOIN countries c ON c.code = p.country_code
            LEFT JOIN admin1 a ON a.code = p.admin1_code
            WHERE p.latitude BETWEEN ? AND ?
              AND p.longitude BETWEEN ? AND ?
              AND p.population > 0
            ORDER BY p.population DESC, p.name
            LIMIT ?
        """
        parameters = (
            latitude - delta,
            latitude + delta,
            longitude - delta,
            longitude + delta,
            max(limit, 1),
        )
        with self._connect(path) as connection:
            rows = connection.execute(sql, parameters).fetchall()
        return PlaceListView(items=[_row_to_view(row, 'nearby') for row in rows])

    def _prepare(self) -> Path:
        """Ensure the SQLite file exists and has the required indexes."""
        if self._prepared and self._database_path is not None and self._database_path.is_file():
            return self._database_path
        with self._lock:
            if self._prepared and self._database_path is not None and self._database_path.is_file():
                return self._database_path
            explicit_path = self.settings.database_path is not None
            path = self._database_path or (self.settings.cache_dir / 'places.sqlite')
            self.settings.cache_dir.mkdir(parents=True, exist_ok=True)
            if explicit_path:
                if not path.is_file():
                    raise PlaceDatabaseError(f'Place database not found: {path}')
                if not self._has_indexes(path):
                    self._create_indexes(path)
            elif not path.is_file() or self._is_stale(path):
                self._decompress(path)
                self._create_indexes(path)
                self._write_marker(path)
            elif not self._has_indexes(path):
                self._create_indexes(path)
                self._write_marker(path)
            self._database_path = path
            self._prepared = True
            return path

    def _is_stale(self, database_path: Path) -> bool:
        """Return whether the cached database predates the committed archive."""
        marker = database_path.with_suffix('.meta.json')
        if not marker.is_file() or not self.settings.archive_path.is_file():
            return True
        try:
            metadata = json.loads(marker.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            return True
        if not isinstance(metadata, dict):
            return True
        archive = self.settings.archive_path.stat()
        return (
            metadata.get('archive_bytes') != archive.st_size or metadata.get('archive_mtime_ns') != archive.st_mtime_ns
        )

    def _write_marker(self, database_path: Path) -> None:
        """Record the archive identity next to the prepared database."""
        marker = database_path.with_suffix('.meta.json')
        marker.write_text(
            json.dumps(
                {
                    'archive_bytes': self.settings.archive_path.stat().st_size,
                    'archive_mtime_ns': self.settings.archive_path.stat().st_mtime_ns,
                }
            ),
            encoding='utf-8',
        )

    def _decompress(self, database_path: Path) -> None:
        """Decompress the committed archive atomically into the cache."""
        if not self.settings.archive_path.is_file():
            raise PlaceDatabaseError(f'Place database archive not found: {self.settings.archive_path}')
        temporary = database_path.with_suffix(database_path.suffix + '.tmp')
        with lzma.open(self.settings.archive_path, 'rb') as source, temporary.open('wb') as target:
            while chunk := source.read(1024 * 1024):
                target.write(chunk)
        temporary.replace(database_path)

    def _has_indexes(self, database_path: Path) -> bool:
        """Return whether all required indexes exist."""
        placeholders = ','.join('?' for _ in INDEX_NAMES)
        with self._connect(database_path) as connection:
            rows = connection.execute(
                f"SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ({placeholders})",  # noqa: S608
                INDEX_NAMES,
            ).fetchall()
        return len(rows) == len(INDEX_NAMES)

    def _create_indexes(self, database_path: Path) -> None:
        """Create the indexes needed by text search, popularity and near queries."""
        with self._connect(database_path) as connection:
            connection.execute('PRAGMA journal_mode=OFF')
            connection.execute('PRAGMA synchronous=OFF')
            connection.execute('PRAGMA cache_size=-200000')
            connection.executescript(
                """
                CREATE INDEX IF NOT EXISTS idx_places_ascii ON places(ascii_name COLLATE NOCASE);
                CREATE INDEX IF NOT EXISTS idx_places_name ON places(name COLLATE NOCASE);
                CREATE INDEX IF NOT EXISTS idx_places_population ON places(population DESC);
                CREATE INDEX IF NOT EXISTS idx_places_lat ON places(latitude);
                                        CREATE INDEX IF NOT EXISTS idx_places_country_population
                    ON places(country_code, population DESC);
                CREATE INDEX IF NOT EXISTS idx_places_admin1_population
                    ON places(admin1_code, population DESC);
                """
            )
            connection.commit()

    @staticmethod
    def _connect(database_path: Path) -> sqlite3.Connection:
        """Open a read/write connection with row access by name."""
        connection = sqlite3.connect(database_path)
        connection.row_factory = sqlite3.Row
        return connection


if __name__ == '__main__':
    print(PlaceDatabase().prepare())
