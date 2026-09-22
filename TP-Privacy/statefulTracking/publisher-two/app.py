from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/article-beach")
def article_beach():
    return render_template("index.html", page="article-beach")

if __name__ == "__main__":
    # Publisher 2 : travel articles
    app.run(host="127.0.0.1", port=8002, debug=True)
