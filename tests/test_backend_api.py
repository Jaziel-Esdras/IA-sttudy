from fastapi.testclient import TestClient

from backend.app import app, initialize_database


initialize_database()
client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ask_and_history():
    payload = {
        "prompt": "Quero revisar álgebra linear e guardar esse pedido no histórico.",
        "category": "matematica",
    }

    response = client.post("/api/ask", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "resposta" in data
    assert data["prompt"] == payload["prompt"]
    assert data["category"] == payload["category"]

    history = client.get("/api/history")
    assert history.status_code == 200
    payload_history = history.json()
    assert len(payload_history["items"]) >= 1
    assert payload_history["items"][0]["prompt"] == payload["prompt"]
