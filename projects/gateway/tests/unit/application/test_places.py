"""Unit tests for local place search and recommendation routes."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from meogap.rest.contracts import PUBLIC_HEALTH_PATH, ErrorResponse
from meogap.rest.factory import RestAppConfig, create_rest_app

from gateway.application.routes import build_demo_router
from gateway.core.demo import DemoError, DemoSettings, DemoStore
from gateway.core.places import PlaceDatabase, PlaceSearchSettings

pytestmark = pytest.mark.unit

AUTH_HEADERS = {'Authorization': 'Bearer demo-ui-token'}
NOW = datetime(2026, 1, 1, tzinfo=UTC)
LIMIT = 10


def build_place_database(tmp_path: Path) -> PlaceDatabase:
    """Create a small indexed-compatible place database for route tests."""
    database_path = tmp_path / 'places.sqlite'
    connection = sqlite3.connect(database_path)
    connection.executescript(
        """
        CREATE TABLE countries(code TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE admin1(code TEXT PRIMARY KEY, country_code TEXT NOT NULL, name TEXT NOT NULL);
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
    connection.executemany(
        'INSERT INTO countries(code, name) VALUES(?, ?)',
        [('FR', 'France'), ('GB', 'United Kingdom'), ('BR', 'Brazil')],
    )
    connection.executemany(
        'INSERT INTO admin1(code, country_code, name) VALUES(?, ?, ?)',
        [
            ('FR.OCCITANIE', 'FR', 'Occitanie'),
            ('FR.ILE-DE-FRANCE', 'FR', 'Île-de-France'),
            ('GB.ENGLAND', 'GB', 'England'),
            ('BR.SAO-PAULO', 'BR', 'São Paulo'),
        ],
    )
    connection.executemany(
        'INSERT INTO places VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            (1, 'Toulouse', 'Toulouse', 'FR', 'FR.OCCITANIE', 43.6045, 1.4442, 493465, 'PPLA'),
            (2, 'Paris', 'Paris', 'FR', 'FR.ILE-DE-FRANCE', 48.8566, 2.3522, 2138551, 'PPLC'),
            (3, 'London', 'London', 'GB', 'GB.ENGLAND', 51.5072, -0.1276, 8961989, 'PPLC'),
            (4, 'São Paulo', 'Sao Paulo', 'BR', 'BR.SAO-PAULO', -23.5505, -46.6333, 12325232, 'PPLA'),
        ],
    )
    connection.executescript(
        """
        CREATE INDEX idx_places_ascii ON places(ascii_name COLLATE NOCASE);
        CREATE INDEX idx_places_name ON places(name COLLATE NOCASE);
        CREATE INDEX idx_places_population ON places(population DESC);
        CREATE INDEX idx_places_lat ON places(latitude);
        CREATE INDEX idx_places_lng ON places(longitude);
        CREATE INDEX idx_places_country ON places(country_code);
        CREATE INDEX idx_places_admin1 ON places(admin1_code);
        CREATE INDEX idx_places_country_population ON places(country_code, population DESC);
        CREATE INDEX idx_places_admin1_population ON places(admin1_code, population DESC);
        """
    )
    connection.commit()
    connection.close()
    return PlaceDatabase(
        PlaceSearchSettings(
            archive_path=tmp_path / 'missing.sqlite.xz',
            cache_dir=tmp_path,
            database_path=database_path,
        ),
        prepared=True,
    )


def build_client(tmp_path: Path) -> TestClient:
    """Build an isolated Gateway client backed by a small place database."""
    store = DemoStore(
        DemoSettings(queue_delay_seconds=0, processing_delay_seconds=0, delivery_delay_seconds=0),
        clock=lambda: NOW,
    )
    config = RestAppConfig(
        service='gateway-place-test',
        title='Gateway place test',
        version='0.1.0',
        health_path=PUBLIC_HEALTH_PATH,
    )
    application = create_rest_app(config, routers=(build_demo_router(store, build_place_database(tmp_path)),))

    @application.exception_handler(DemoError)
    async def handle_demo_error(request: Request, exc: DemoError) -> JSONResponse:
        """Return the shared error envelope for route tests."""
        payload = ErrorResponse(
            code=exc.code,
            message=exc.message,
            service='gateway-place-test',
            operation=request.url.path,
        )
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump())

    return TestClient(application)


def test_place_suggestions_search_by_name_ascii_country_and_region(tmp_path: Path) -> None:
    """Search matches names, ASCII names, countries and admin-1 regions."""
    client = build_client(tmp_path)
    # Act
    toulouse = client.get('/api/v1/places/suggestions?q=toulouse', headers=AUTH_HEADERS)
    sao = client.get('/api/v1/places/suggestions?q=sao', headers=AUTH_HEADERS)
    france = client.get('/api/v1/places/suggestions?q=france', headers=AUTH_HEADERS)
    region = client.get('/api/v1/places/suggestions?q=occitanie', headers=AUTH_HEADERS)
    # Assert
    assert toulouse.status_code == status.HTTP_200_OK
    assert toulouse.json()['items'][0]['name'] == 'Toulouse'
    assert toulouse.json()['items'][0]['country'] == 'France'
    assert toulouse.json()['items'][0]['admin1'] == 'Occitanie'
    assert sao.json()['items'][0]['name'] == 'São Paulo'
    assert {item['country'] for item in france.json()['items']} == {'France'}
    assert region.json()['items'][0]['admin1'] == 'Occitanie'


def test_empty_query_returns_popular_and_nearby_recommendations(tmp_path: Path) -> None:
    """An empty query returns popular or nearby recommendations."""
    client = build_client(tmp_path)
    # Act
    popular = client.get('/api/v1/places/suggestions?limit=3', headers=AUTH_HEADERS)
    nearby = client.get('/api/v1/places/suggestions?lat=43.6&lng=1.44&limit=3', headers=AUTH_HEADERS)
    # Assert
    assert popular.status_code == status.HTTP_200_OK
    assert [item['name'] for item in popular.json()['items']][:2] == ['São Paulo', 'London']
    assert nearby.json()['items'][0]['name'] == 'Toulouse'
    assert nearby.json()['items'][0]['match_type'] == 'nearby'


def test_place_suggestions_reject_partial_coordinates(tmp_path: Path) -> None:
    """Nearby recommendations require both coordinates."""
    client = build_client(tmp_path)
    response = client.get('/api/v1/places/suggestions?lat=43.6', headers=AUTH_HEADERS)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json()['code'] == 'INVALID_COORDINATES'


def test_place_suggestions_require_authentication(tmp_path: Path) -> None:
    """Place search is a protected public Gateway operation."""
    client = build_client(tmp_path)
    assert client.get('/api/v1/places/suggestions?q=paris').status_code == status.HTTP_401_UNAUTHORIZED
