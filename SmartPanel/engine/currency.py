"""Currency rates via exchangerate-api (free tier)."""
from __future__ import annotations
import requests

RATES_URL = "https://open.er-api.com/v6/latest/{base}"


def fetch_rates(base: str = "USD", targets: list[str] | None = None) -> dict:
    if targets is None:
        targets = ["EUR", "GBP", "RUB", "UAH", "JPY", "CNY", "TRY", "KZT"]
    try:
        r = requests.get(RATES_URL.format(base=base.upper()), timeout=5)
        data = r.json()
        if data.get("result") != "success":
            return {"error": data.get("error-type", "Unknown error")}
        all_rates = data.get("rates", {})
        filtered = {k: round(v, 4) for k, v in all_rates.items() if k in targets}
        return {
            "base": base.upper(),
            "rates": filtered,
            "updated": data.get("time_last_update_utc", ""),
            "error": None,
        }
    except Exception as e:
        return {"error": str(e)}
