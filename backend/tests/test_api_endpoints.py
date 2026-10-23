"""
Integration tests for FastAPI endpoints using TestClient.
Tests endpoints: /health, /api/overview, /api/generation, /api/forecast-errors,
/api/forecast-history, /api/data-quality, and validation error responses.
"""
from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "defaultDecisionCutoff" in data


def test_overview_endpoint():
    response = client.get("/api/overview?start_date=2026-01-01&end_date=2026-01-02")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "dataQuality" in data

    metrics = data["metrics"]
    assert "maeMw" in metrics
    assert "rmseMw" in metrics
    assert "meanErrorMw" in metrics
    assert "biasDirection" in metrics
    assert "totalEvaluatedIntervals" in metrics
    assert metrics["expectedIntervals"] == 96  # 2 days * 48 periods = 96

    quality = data["dataQuality"]
    assert quality["expectedIntervals"] == 96
    assert "dataSourceActuals" in quality
    assert "dataSourceForecasts" in quality


def test_generation_series_endpoint():
    response = client.get("/api/generation?start_date=2026-01-01&end_date=2026-01-01")
    assert response.status_code == 200
    data = response.json()
    assert "intervals" in data
    assert len(data["intervals"]) == 48

    first = data["intervals"][0]
    assert first["settlementPeriod"] == 1
    assert "startTime" in first
    assert "actualGenerationMw" in first
    assert "forecastGenerationMw" in first
    assert "status" in first


def test_forecast_errors_endpoint():
    response = client.get("/api/forecast-errors?start_date=2026-01-01&end_date=2026-01-02")
    assert response.status_code == 200
    data = response.json()
    assert "dailySummaries" in data
    assert len(data["dailySummaries"]) == 2
    assert "errorDistribution" in data
    assert isinstance(data["errorDistribution"], list)


def test_forecast_history_endpoint():
    # Pick interval: 2026-01-01 12:00 UTC
    response = client.get("/api/forecast-history?interval_time=2026-01-01T12:00:00Z&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["deliveryDate"] == "2026-01-01"
    assert "versions" in data
    assert "selectionReason" in data

    # Verify every version has required flags
    for v in data["versions"]:
        assert "isEligible" in v
        assert "isSelected" in v
        assert "generationMw" in v


def test_invalid_date_format():
    response = client.get("/api/overview?start_date=invalid-date")
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]


def test_invalid_date_order():
    response = client.get("/api/overview?start_date=2026-01-05&end_date=2026-01-02")
    assert response.status_code == 400
    assert "earlier than or equal to" in response.json()["detail"]
