from flask import Flask, render_template, request, make_response
import secrets
from datetime import datetime
from collections import defaultdict

app = Flask(__name__)

# In-memory log: list of dicts in chronological order
VISITS = []

@app.route("/track")
def track():
    publisher = request.args.get("publisher", "unknown")
    page = request.args.get("page", "/")
    tid = request.cookies.get("tid")
    is_new = tid is None
    if is_new:
        tid = secrets.token_hex(8)

    entry = {
        "time": datetime.now().strftime("%H:%M:%S"),
        "tid": tid,
        "publisher": publisher,
        "page": page,
        "referer": request.headers.get("Referer", "-"),
        "user_agent": request.headers.get("User-Agent", "-")[:60],
    }
    VISITS.append(entry)
    print(f"\n[TRACKER-ONE] tid={tid} publisher={publisher} page={page} new={is_new}")
    print(f"  Cookies received: {dict(request.cookies)}")
    print(f"  Referer: {entry['referer']}")

    response = make_response(render_template("tracker.html", tid=tid, publisher=publisher, page=page))
    if is_new:
        # Persistent third-party cookie. SameSite=None needed for iframe context.
        # NOTE: over plain HTTP Chrome may reject SameSite=None without Secure.
        # For the lab: allow third-party cookies in browser settings.
        response.set_cookie(key="tid", value=tid, max_age=60*60*24*365, samesite="None", secure=False)
    return response

@app.route("/profile")
def profile():
    # Group by tid, chronological order
    grouped = defaultdict(list)
    for v in VISITS:
        grouped[v["tid"]].append(v)
    return render_template("profile.html", grouped=dict(grouped), visits=VISITS)

@app.route("/clear")
def clear():
    VISITS.clear()
    return "tracker log cleared. <a href='/profile'>back to /profile</a>"

@app.route("/")
def home():
    return "Tracker-One running. <a href='/profile'>View reconstructed profiles (/profile)</a>"

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8003, debug=True)
