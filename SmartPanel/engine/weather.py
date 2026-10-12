"""Weather fetching via Open-Meteo (free, no API key required)."""
from __future__ import annotations
import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

WMO_CODES = {
    0: ("Clear sky", "☀️"),
    1: ("Mainly clear", "🌤️"),
    2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"),
    45: ("Foggy", "🌫️"),
    48: ("Icy fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Drizzle", "🌦️"),
    55: ("Heavy drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    71: ("Slight snow", "🌨️"),
    73: ("Snow", "❄️"),
    75: ("Heavy snow", "❄️"),
    80: ("Rain showers", "🌦️"),
    81: ("Showers", "🌧️"),
    82: ("Violent showers", "⛈️"),
    95: ("Thunderstorm", "⛈️"),
    99: ("Hail storm", "⛈️"),
}


def get_coords(city: str) -> tuple[float, float] | None:
    try:
        r = requests.get(GEOCODING_URL, params={"name": city, "count": 1, "language": "en", "format": "json"}, timeout=5)
        data = r.json()
        if data.get("results"):
            loc = data["results"][0]
            return loc["latitude"], loc["longitude"]
    except Exception as e:
        print(f"[Weather] Geocoding error: {e}")
    return None


def fetch_weather(city: str = "London") -> dict:
    coords = get_coords(city)
    if not coords:
        return {"error": f"City '{city}' not found"}
    lat, lon = coords
    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,apparent_temperature",
            "wind_speed_unit": "kmh",
            "timezone": "auto",
        }
        r = requests.get(WEATHER_URL, params=params, timeout=5)
        data = r.json()
        current = data.get("current", {})
        code = current.get("weathercode", 0)
        desc, emoji = WMO_CODES.get(code, ("Unknown", "❓"))
        return {
            "city": city,
            "temp": round(current.get("temperature_2m", 0)),
            "feels_like": round(current.get("apparent_temperature", 0)),
            "humidity": current.get("relative_humidity_2m", 0),
            "wind": round(current.get("windspeed_10m", 0)),
            "description": desc,
            "emoji": emoji,
            "error": None,
        }
    except Exception as e:
        return {"error": str(e)}
