import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Engine")

class PredictionEngine:
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(os.path.dirname(__file__), "flight_risk_model.joblib")
        self._initialize_model()

    def _initialize_model(self):
        """Train or load the model."""
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info("Loaded pre-trained model.")
            except Exception as e:
                logger.error(f"Error loading model: {e}. Retraining...")
                self._train_new_model()
        else:
            self._train_new_model()

    def _calculate_severity(self, temp, wind, vis, hum):
        """Intelligent weather severity score based on multiple factors."""
        score = 0
        
        # Visibility (CRITICAL)
        if vis < 2: score += 50
        elif vis < 5: score += 25
        elif vis < 8: score += 10
        
        # Wind Speed (Significant for flight operation)
        if wind > 25: score += 40
        elif wind > 15: score += 20
        elif wind > 10: score += 10
        
        # Humidity & Storm Probability (Humidity > 85% + Wind > 15 often indicates storm)
        if hum > 85:
            score += 15
            if wind > 15: score += 20 # Storm coupling
            
        # Temperature Extremes
        if temp > 40 or temp < -10: score += 20
        elif temp > 35 or temp < 5: score += 10
        
        return score

    def _train_new_model(self):
        """Generate high-quality synthetic data and train the Random Forest."""
        logger.info("Generating realistic training data...")
        data = []
        
        # We generate 2000 points for better coverage
        for _ in range(2000):
            distance = np.random.randint(50, 6000)
            temp = np.random.uniform(-15, 45)
            wind = np.random.uniform(0, 35)
            visibility = np.random.uniform(0.5, 12)
            humidity = np.random.uniform(20, 100)
            
            severity = self._calculate_severity(temp, wind, visibility, humidity)
            
            # Non-linear delay calculation logic
            # Base delay 5-15 mins
            base = np.random.normal(10, 5)
            
            # Distance impact (longer flights have more buffer, but more chance for minor en-route issues)
            dist_impact = distance * 0.005 
            
            # Severity impact is high (weather)
            weather_impact = (severity ** 1.3) * 0.5
            
            # Visibility impact is non-linear
            vis_impact = (max(0, 10 - visibility) ** 2) * 0.8
            
            delay = base + dist_impact + weather_impact + vis_impact
            delay = max(0, min(delay, 240)) # Cap at 4 hours for realism
            
            data.append([temp, wind, visibility, humidity, distance, severity, delay])
            
        df = pd.DataFrame(data, columns=[
            'temperature', 'wind_speed', 'visibility', 'humidity', 'distance_km', 'severity', 'delay'
        ])
        
        features = ['temperature', 'wind_speed', 'visibility', 'humidity', 'distance_km', 'severity']
        X = df[features]
        y = df['delay']
        
        logger.info("Training Random Forest Regressor...")
        self.model = RandomForestRegressor(n_estimators=500, max_depth=15, random_state=42)
        self.model.fit(X, y)
        
        joblib.dump(self.model, self.model_path)
        logger.info(f"Model trained and saved to {self.model_path}")

    def predict(self, temp, wind, vis, hum, distance):
        """Predict delay for a specific set of parameters."""
        severity = self._calculate_severity(temp, wind, vis, hum)
        
        input_data = pd.DataFrame([{
            'temperature': temp,
            'wind_speed': wind,
            'visibility': vis,
            'humidity': hum,
            'distance_km': distance,
            'severity': severity
        }])
        
        prediction = self.model.predict(input_data)[0]
        return round(float(prediction), 2)

    def get_risk_assessment(self, avg_delay):
        """Map delay minutes to risk categories."""
        if avg_delay < 15:
            return "Low", 1
        elif avg_delay < 35:
            return "Moderate", 2
        elif avg_delay < 55:
            return "High", 3
        else:
            return "Severe", 4

engine = PredictionEngine()
