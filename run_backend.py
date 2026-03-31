import sys
import os

# Add the current directory to sys.path to allow imports from .
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app import app

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
