from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import mcsrranked

app = Flask(__name__, static_folder="static")
CORS(app)

# CONFIG DEFAULT
CONFIG = {
    "username": "Dream",
    "theme": "dark",
    "primary": "#7c3aed"
}

ALLOWED_THEMES = {"dark", "light"}


def sanitize_config(payload):
    cleaned = {}
    if isinstance(payload.get("username"), str):
        name = payload["username"].strip()
        if name:
            cleaned["username"] = name[:24]
    if payload.get("theme") in ALLOWED_THEMES:
        cleaned["theme"] = payload["theme"]
    if isinstance(payload.get("primary"), str):
        cleaned["primary"] = payload["primary"].strip()[:16]
    return cleaned


def get_effective_config():
    cfg = CONFIG.copy()
    user = request.args.get("user")
    theme = request.args.get("theme")
    primary = request.args.get("primary")

    if user:
        cfg["username"] = user
    if theme in ALLOWED_THEMES:
        cfg["theme"] = theme
    if primary:
        cfg["primary"] = primary

    return cfg

# =====================
# API CONFIG
# =====================
@app.route("/api/config", methods=["GET", "POST"])
def config():
    global CONFIG
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        updates = sanitize_config(payload)
        if updates:
            CONFIG.update(updates)
    return jsonify(CONFIG)

# =====================
# API PLAYER DATA
# =====================
@app.route("/api/player")
def player():
    try:
        cfg = get_effective_config()
        user = mcsrranked.users.get(cfg["username"])
        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "username": user.nickname,
            "elo": user.elo_rate,
            "rank": user.rank,
            "wins": user.wins,
            "losses": user.losses,
            "winrate": round(user.winrate * 100, 1),
            "status": "online" if user.online else "offline",
            "theme": cfg["theme"],
            "primary": cfg["primary"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =====================
# STATIC ROUTES
# =====================
@app.route("/widget")
def widget():
    return send_from_directory("static/widget", "index.html")

@app.route("/dashboard")
def dashboard():
    return send_from_directory("static/dashboard", "index.html")

# =====================
if __name__ == "__main__":
    app.run(debug=True)
