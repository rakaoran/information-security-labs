from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/article-ai")
def article_ai():
    return render_template("index.html", page="article-ai")

if __name__ == "__main__":
    # Publisher 1 : technology articles
    app.run(host="127.0.0.1", port=8001, debug=True)
