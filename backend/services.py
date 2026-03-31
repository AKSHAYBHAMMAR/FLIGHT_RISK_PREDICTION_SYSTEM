import requests
import math
import logging
from .engine import engine

API_KEY = "1ba7a5c4137bda36dd6a1b0736778a63"

logger = logging.getLogger("Services")

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in KM between two lat/lon points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_coordinates(city):
    """Geocode city to coordinates."""
    try:
        url = f"http://api.openweathermap.org/geo/1.0/direct?q={city.strip()}&limit=1&appid={API_KEY}"
        res = requests.get(url, timeout=10).json()
        if not res:
            raise ValueError(f"City '{city}' not found")
        return res[0]['lat'], res[0]['lon'], res[0]['name']
    except Exception as e:
        logger.error(f"Geocoding Error for {city}: {e}")
        return None, None, None

def get_weather(lat, lon):
    """Fetch current weather data for coordinates."""
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        data = requests.get(url, timeout=10).json()
        
        weather_info = {
            "temp": data['main']['temp'],
            "humidity": data['main']['humidity'],
            "wind": data['wind']['speed'],
            "visibility": data.get('visibility', 10000) / 1000,
            "condition": data['weather'][0]['main'] if 'weather' in data else "Unknown"
        }
        return weather_info
    except Exception as e:
        logger.warning(f"Weather Fetch Error ({lat}, {lon}): {e}. Using fallback values.")
        return {"temp": 25, "wind": 10, "visibility": 10, "humidity": 60, "condition": "Clear"}

def get_city_name(lat, lon):
    """Reverse geocode coordinates to city name."""
    try:
        url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={API_KEY}"
        res = requests.get(url, timeout=5).json()
        if res:
            return res[0]['name']
    except:
        pass
    return f"Sector {round(lat, 2)},{round(lon, 2)}"

def calculate_route_analysis(dep_city, dest_city):
    """Complete analysis: geocoding, routing, and prediction."""
    lat1, lon1, dep_name = get_coordinates(dep_city)
    lat2, lon2, dest_name = get_coordinates(dest_city)
    
    if lat1 is None or lat2 is None:
        raise ValueError("One or both cities could not be found.")

    total_distance = haversine(lat1, lon1, lat2, lon2)
    
    # We create 6-8 waypoints along the route for analysis
    num_points = 6
    waypoints = []
    
    for i in range(num_points):
        # Progress along the route
        fraction = i / (num_points - 1)
        lat = lat1 + (lat2 - lat1) * fraction
        lon = lon1 + (lon2 - lon1) * fraction
        
        # Add slight curvature/variation for realism if not first/last
        if 0 < i < num_points - 1:
            lat += (math.sin(fraction * math.pi) * 0.1)
        
        weather = get_weather(lat, lon)
        
        # Simulated distance covered for each point
        dist_covered = fraction * total_distance
        
        # Predict delay for this sector
        point_delay = engine.predict(
            weather['temp'], 
            weather['wind'], 
            weather['visibility'], 
            weather['humidity'], 
            total_distance
        )
        
        # For waypoints, we calculate localized impact
        wp_city = get_city_name(lat, lon) if i % 2 == 0 or i == num_points-1 else f"Sector {i+1}"
        
        waypoints.append({
            "id": i,
            "lat": lat,
            "lng": lon,
            "name": wp_city if i != 0 and i != num_points-1 else (dep_name if i == 0 else dest_name),
            "delay": round(point_delay),
            "distanceCovered": round(dist_covered),
            "weather": weather
        })

    # Final Average Delay
    avg_delay = sum(wp['delay'] for wp in waypoints) / len(waypoints)
    risk, risk_score = engine.get_risk_assessment(avg_delay)
    
    return {
        "departure": {"name": dep_name.upper(), "coord": [lat1, lon1]},
        "destination": {"name": dest_name.upper(), "coord": [lat2, lon2]},
        "distanceKm": round(total_distance),
        "avgDelay": round(avg_delay),
        "risk": risk,
        "riskScore": risk_score,
        "lineCoords": [[wp['lat'], wp['lng']] for wp in waypoints],
        "waypoints": waypoints
    }
