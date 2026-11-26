"""Build the local GeoNames populated-place SQLite database.

The database is generated from the GeoNames ``allCountries`` extract and keeps
every feature whose feature class is ``P`` (populated place). Country and
admin-1 names are stored in small lookup tables so the large place table stays
compact.

Example:
    python tools/build_places_database.py \
        --data-dir /tmp/geonames \
        --output projects/gateway/src/gateway/assets/places/places.sqlite

Use ``--download`` to fetch the source files into ``--data-dir`` first, and
``--compress`` to produce a committed ``places.sqlite.xz`` archive.
"""

from __future__ import annotations

import argparse
import json
import lzma
import sqlite3
import time
import urllib.request
import zipfile
from pathlib import Path

GEONAMES_DUMP_URL = 'https://download.geonames.org/export/dump'
ALL_COUNTRIES = 'allCountries.zip'
COUNTRY_INFO = 'countryInfo.txt'
ADMIN1_CODES = 'admin1CodesASCII.txt'
POPULATED_FEATURE_CLASS = 'P'
BATCH_SIZE = 50_000
SOURCE_LICENSE = 'CC BY 4.0'
SOURCE_NAME = 'GeoNames'


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True, help='Directory containing GeoNames files.')
    parser.add_argument('--output', type=Path, required=True, help='SQLite output path.')
    parser.add_argument('--download', action='store_true', help='Download the required GeoNames files.')
    parser.add_argument('--compress', action='store_true', help='Also produce an .xz archive.')
    parser.add_argument('--index', action='store_true', help='Create runtime indexes in the output database.')
    parser.add_argument('--metadata', type=Path, help='Optional metadata JSON output path.')
    return parser.parse_args()


def download(data_dir: Path) -> None:
    """Download the required GeoNames source files."""
    data_dir.mkdir(parents=True, exist_ok=True)
    for name in (ALL_COUNTRIES, COUNTRY_INFO, ADMIN1_CODES):
        target = data_dir / name
        if target.is_file():
            continue
        print(f'Downloading {name}...')
        urllib.request.urlretrieve(f'{GEONAMES_DUMP_URL}/{name}', target)


def read_countries(data_dir: Path) -> dict[str, str]:
    """Read ISO country code to country name mappings."""
    countries: dict[str, str] = {}
    for line in (data_dir / COUNTRY_INFO).read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        columns = line.split('\t')
        countries[columns[0]] = columns[4]
    return countries


def read_admin1(data_dir: Path) -> dict[str, tuple[str, str]]:
    """Read admin-1 code to region name mappings."""
    admin1: dict[str, tuple[str, str]] = {}
    for line in (data_dir / ADMIN1_CODES).read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        columns = line.split('\t')
        code = columns[0]
        admin1[code] = (code.split('.', 1)[0], columns[1])
    return admin1


def create_schema(connection: sqlite3.Connection) -> None:
    """Create the compact place schema."""
    connection.executescript(
        """
        CREATE TABLE countries(
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );
        CREATE TABLE admin1(
            code TEXT PRIMARY KEY,
            country_code TEXT NOT NULL,
            name TEXT NOT NULL
        );
        CREATE TABLE places(
            geoname_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            ascii_name TEXT,
            country_code TEXT NOT NULL,
            admin1_code TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            population INTEGER NOT NULL,
            feature_code TEXT NOT NULL
        );
        """
    )


def create_indexes(connection: sqlite3.Connection) -> None:
    """Create indexes used by the Gateway search."""
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


def iter_populated_places(archive_path: Path):
    """Yield populated-place rows from the GeoNames allCountries archive."""
    with zipfile.ZipFile(archive_path) as archive, archive.open('allCountries.txt') as source:
        for raw_line in source:
            columns = raw_line.decode('utf-8').rstrip('\n').split('\t')
            if len(columns) < 19 or columns[6] != POPULATED_FEATURE_CLASS:
                continue
            population = int(columns[14] or 0) if columns[14] else 0
            name = columns[1]
            ascii_name = columns[2] or None
            if ascii_name == name:
                ascii_name = None
            yield (
                int(columns[0]),
                name,
                ascii_name,
                columns[8],
                f'{columns[8]}.{columns[10]}' if columns[10] else None,
                float(columns[4]),
                float(columns[5]),
                population,
                columns[7],
            )


def build_database(data_dir: Path, output: Path, *, index: bool) -> dict[str, object]:
    """Build the SQLite database and return generation metadata."""
    if output.exists():
        output.unlink()
    connection = sqlite3.connect(output)
    connection.execute('PRAGMA journal_mode=OFF')
    connection.execute('PRAGMA synchronous=OFF')
    connection.execute('PRAGMA cache_size=-200000')
    create_schema(connection)
    countries = read_countries(data_dir)
    admin1 = read_admin1(data_dir)
    connection.executemany('INSERT INTO countries(code, name) VALUES(?, ?)', countries.items())
    connection.executemany(
        'INSERT INTO admin1(code, country_code, name) VALUES(?, ?, ?)',
        [(code, country_code, name) for code, (country_code, name) in admin1.items()],
    )
    connection.commit()

    started = time.monotonic()
    row_count = 0
    batch: list[tuple[object, ...]] = []
    for row in iter_populated_places(data_dir / ALL_COUNTRIES):
        batch.append(row)
        row_count += 1
        if len(batch) >= BATCH_SIZE:
            connection.executemany(
                'INSERT INTO places(geoname_id, name, ascii_name, country_code, admin1_code, '
                'latitude, longitude, population, feature_code) '
                'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
                batch,
            )
            batch.clear()
            connection.commit()
            if row_count % 500_000 == 0:
                print(f'{row_count:,} places loaded...')
    if batch:
        connection.executemany(
            'INSERT INTO places(geoname_id, name, ascii_name, country_code, admin1_code, '
            'latitude, longitude, population, feature_code) '
            'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            batch,
        )
    connection.commit()
    if index:
        create_indexes(connection)
        connection.commit()
    connection.execute('VACUUM')
    connection.close()
    return {
        'source': SOURCE_NAME,
        'source_url': f'{GEONAMES_DUMP_URL}/{ALL_COUNTRIES}',
        'source_license': SOURCE_LICENSE,
        'feature_class': POPULATED_FEATURE_CLASS,
        'place_count': row_count,
        'country_count': len(countries),
        'admin1_count': len(admin1),
        'row_count': row_count,
        'indexed': index,
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'build_seconds': round(time.monotonic() - started, 1),
    }


def main() -> None:
    """Build the database and optional compressed archive."""
    args = parse_args()
    if args.download:
        download(args.data_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    metadata = build_database(args.data_dir, args.output, index=args.index)
    metadata['sqlite_bytes'] = args.output.stat().st_size
    if args.compress:
        archive_path = args.output.with_suffix(args.output.suffix + '.xz')
        print(f'Compressing {args.output} -> {archive_path}...')
        with args.output.open('rb') as source, lzma.open(
            archive_path, 'wb', preset=9 | lzma.PRESET_EXTREME
        ) as target:
            while chunk := source.read(1024 * 1024):
                target.write(chunk)
        metadata['archive_bytes'] = archive_path.stat().st_size
        metadata['archive_path'] = archive_path.name
    if args.metadata:
        args.metadata.write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
