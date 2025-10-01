from flask import Flask
from flask_cors import CORS
from src.routes.health import bp as health_bp

app = Flask(__name__)
CORS(app)

# register routes
app.register_blueprint(health_bp, url_prefix="/health")

if __name__ == "__main__":
    app.run(debug=True)
