from flask import Flask, request, jsonify
from flask_cors import CORS
from .services import calculate_route_analysis
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AirlyticsServer")

app = Flask(__name__)
# Enable CORS for all routes (important for static local HTML access)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": time.time()})

@app.route('/api/analyze', methods=['GET'])
def analyze_route():
    dep = request.args.get('dep')
    dest = request.args.get('dest')
    
    if not dep or not dest:
        return jsonify({"error": "Missing departure or destination city"}), 400
    
    logger.info(f"Analyzing route: {dep} -> {dest}")
    try:
        start_time = time.time()
        result = calculate_route_analysis(dep, dest)
        execution_time = time.time() - start_time
        
        logger.info(f"Analysis completed accurately in {round(execution_time, 2)}s")
        return jsonify(result)
    
    except ValueError as ve:
        logger.error(f"Validation Error: {ve}")
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        logger.error(f"Unexpected Backend Error: {e}")
        return jsonify({"error": "An internal server error occurred during analysis."}), 500

if __name__ == "__main__":
    # In production, we would use a WSGI server like gunicorn
    logger.info("Starting Airlytics Backend Server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
