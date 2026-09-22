from flask import Flask, render_template, request, make_response
import secrets

app = Flask(__name__)

def issue_aid(cookie_name="aid"):
    aid = request.cookies.get(cookie_name)
    is_new = aid is None
    if is_new:
        aid = secrets.token_hex(8)
        print(f"\n[TRACKING:{cookie_name}] New -> {aid}")
    else:
        print(f"\n[TRACKING:{cookie_name}] Returning -> {aid}")
    print(f"  Request cookies: {dict(request.cookies)}")
    return aid, is_new

@app.route("/")
def home():
    """Base case: session cookie (no Expires/Max-Age) — Sec 4 first part."""
    aid, is_new = issue_aid("aid")
    response = make_response(render_template("index.html"))
    response.headers["X-Lab-Message"] = "Hello from the Flask server"
    if is_new:
        response.set_cookie(key="aid", value=aid)  # session cookie
    print(f"  Set-Cookie: {response.headers.get('Set-Cookie')}")
    return response

# --- Sec 4 second part: cookie attributes lab ---
# Usage: delete cookies first, then visit each URL, inspect in
# DevTools > Application > Cookies and Network > Set-Cookie,
# then close/restart browser to test persistence.

@app.route("/persistent")
def persistent():
    """Max-Age + Expires -> truly persistent across restarts."""
    aid, is_new = issue_aid("aid_persist")
    response = make_response(f"<h1>Persistent test: {aid}</h1><p>Check DevTools: Expires / Max-Age present.</p>")
    if is_new:
        response.set_cookie(key="aid_persist", value=aid, max_age=60*60*24*365)  # 1 year
    print(f"  Set-Cookie: {response.headers.get('Set-Cookie')}")
    return response

@app.route("/httponly")
def httponly_test():
    """HttpOnly -> hidden from document.cookie (JS), still sent in HTTP."""
    aid, is_new = issue_aid("aid_http")
    response = make_response(
        f"<h1>HttpOnly test: {aid}</h1>"
        f"<p>Open Console and type <code>document.cookie</code> — this cookie must NOT appear.</p>"
        f"<p>But Network > Request Headers WILL still send <code>Cookie: aid_http=...</code></p>"
    )
    if is_new:
        response.set_cookie(key="aid_http", value=aid, httponly=True)
    print(f"  Set-Cookie: {response.headers.get('Set-Cookie')}")
    return response

@app.route("/secure-test")
def secure_test():
    """Secure -> only sent over HTTPS. Over http:// it will be stored but never sent."""
    aid, is_new = issue_aid("aid_secure")
    response = make_response(
        f"<h1>Secure test: {aid}</h1><p>Over HTTP this cookie is stored but browser never sends it back. "
        f"Check Network: no <code>Cookie: aid_secure</code> on next reload.</p>"
    )
    if is_new:
        response.set_cookie(key="aid_secure", value=aid, secure=True)
    print(f"  Set-Cookie: {response.headers.get('Set-Cookie')}")
    return response

@app.route("/samesite/<mode>")
def samesite_test(mode):
    """SameSite=Strict/Lax/None — controls cross-site sending. None requires Secure."""
    mode = mode.capitalize()  # strict/lax/none
    cname = f"aid_ss_{mode.lower()}"
    aid, is_new = issue_aid(cname)
    response = make_response(
        f"<h1>SameSite={mode} test: {aid}</h1>"
        f"<p>DevTools > Cookies shows SameSite column. "
        f"Strict never sent cross-site, Lax sent on top-level GET, None always sent (needs Secure+HTTPS).</p>"
    )
    if is_new:
        if mode == "None":
            response.set_cookie(key=cname, value=aid, samesite="None", secure=True)
        else:
            response.set_cookie(key=cname, value=aid, samesite=mode)
    print(f"  Set-Cookie: {response.headers.get('Set-Cookie')}")
    return response

@app.route("/path-test")
def path_test():
    """Path=/subonly -> cookie only sent to /subonly/*, not to / ."""
    aid, is_new = issue_aid("aid_path")
    response = make_response(
        f"<h1>Path test: {aid}</h1>"
        f"<p>Cookie Path=/subonly. Reload <a href='/'>/</a> (NOT sent) vs <a href='/subonly/page'>/subonly/page</a> (sent).</p>"
    )
    if is_new:
        response.set_cookie(key="aid_path", value=aid, path="/subonly")
    print(f"  Set-Cookie: {response.headers.get('Set-Cookie')}")
    return response

@app.route("/subonly/page")
def subonly_page():
    aid = request.cookies.get("aid_path", "(not sent)")
    return f"<h1>Subonly page</h1><p>aid_path received by server: {aid}</p><p>Server saw cookies: {dict(request.cookies)}</p>"

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
