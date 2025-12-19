# Ruaidhrí
# Creating the flask app to be hosted which will communicate with the keras model
from keras.models import load_model
from flask import Flask, request, jsonify
import pandas as pd
import os
from openai import OpenAI

MODEL_PATH = os.path.join(os.path.dirname(__file__), "alzheimers_model.keras")
FEATURES = ["Age", "Gender", "Education Level", "BMI", "Physical Activity Level", "Smoking Status",
            "Alcohol Consumption", "Diabetes", "Hypertension", "Cholesterol Level", "Family History of Alzheimer’s",
            "Cognitive Test Score", "Depression Level", "Sleep Quality", "Dietary Habits", "Air Pollution Exposure",
            "Employment Status", "Marital Status", "Genetic Risk Factor (APOE-ε4 allele)", "Social Engagement Level",
            "Income Level", "Stress Levels", "Urban vs Rural Living"]

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Gets API key env for making calls to OpenAI later

app = Flask(__name__)


@app.route("/")
def status():
    return "<h1>Flask application is running</h1>"


@app.route("/submit_data", methods=["POST"])
def submit_data():
    try:
        model = load_model(MODEL_PATH)  # Loads in the keras model
        user_data = request.get_json()  # Retrieves the request that was made
        data_values = user_data["data"]  # Will get the actual numerical values that were sent
        data_dictionary = dict(zip(FEATURES, data_values))  # Converts it to dictionary, so it can be made a DataFrame
        testing_data = pd.DataFrame([data_dictionary])  # Converts it to a DataFrame so that the model can use it
        prediction = float(model.predict(testing_data)[0][0])  # Converts numpy float32 value to regular float to return

        return jsonify({"alzheimers_risk": prediction}), 200  # 200 indicates successful request
    except Exception as e:
        return jsonify({"error": str(e)}), 400  # 400 indicates a bad request


@app.route("/submit_speech", methods=["POST"])
def submit_speech():
    try:
        user_speech = request.get_json()
        user_speech = user_speech["text"].strip()

        if not user_speech:
            return jsonify({"error": "No speech supplied"}), 400

        response = client.chat.completions.create(
            model="ft:gpt-4.1-nano-2025-04-14:3rd-year-group-project:transcript-labeller:CLdP493P",
            messages=[
                {"role": "system", "content": "It is your job to analyse fictional transcripts where a person describes"
                                              " the content of a drawing. You must label each transcript as pattern_a "
                                              "or pattern_b. Respond ONLY with 'pattern_a' OR 'pattern_b', no other "
                                              "words included."},
                {"role": "user", "content": user_speech}
            ],
            temperature=0,  # Don't allow any creativity in the response
            max_tokens=5  # Likely won't return more than 5 tokens anyway, but keep this to be safe
        )

        response_content = response.choices[0].message.content

        if "pattern_a" in response_content.strip().lower():
            alzheimers_risk = "Healthy"
        elif "pattern_b" in response_content.strip().lower():
            alzheimers_risk = "Alzheimer's Risk"
        else:
            alzheimers_risk = "Inconclusive"

        return jsonify({"diagnosis": alzheimers_risk}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/get_news", methods=["GET"])
def get_news():
    try:
        base_directory = os.path.dirname(os.path.dirname(__file__))
        file_path = os.path.join(base_directory, "news_agent", "weekly_summary.txt")  # Gets the weekly summary file

        with open(file_path, "r", encoding="UTF-8") as file:
            content = file.read().strip()

        return jsonify({"weekly_summary": content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run()

"""
To make a dataset request use the following:
    curl -X POST -H "Content-Type: application/json" -d "{\"data\": [VALUES]}" http://127.0.0.1:5000/submit_data

Make sure to replace "VALUES" with an array like these:
    [20, 1, 19, 20.0, 2, 0, 0, 0, 0, 0, 0, 99, 0, 2, 2, 0, 1, 1, 0, 2, 2, 0, 0]
    [90, 0, 0, 31.0, 0, 2, 2, 1, 1, 1, 1, 30, 2, 0, 0, 2, 2, 2, 1, 0, 0, 2, 1]
    
To make a speech request use the following:
    curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"SPEECH!!!.\"}" http://127.0.0.1:5000/submit_speech
    
Make sure to replace "SPEECH!!!" with whatever string you are sending off to be tested.

To get news use the following:
    curl http://127.0.0.1:5000/get_news
    
COMMANDS WITH PYTHONANYWHERE LINKS:
    curl -X POST -H "Content-Type: application/json" -d "{\"data\": [20, 1, 19, 20.0, 2, 0, 0, 0, 0, 0, 0, 99, 0, 2, 2, 0, 1, 1, 0, 2, 2, 0, 0]}" https://ruaidhri.pythonanywhere.com/submit_data
    curl -X POST -H "Content-Type: application/json" -d "{\"data\": [90, 0, 0, 31.0, 0, 2, 2, 1, 1, 1, 1, 30, 2, 0, 0, 2, 2, 2, 1, 0, 0, 2, 1]}" https://ruaidhri.pythonanywhere.com/submit_data
    
    curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"SPEECH!!!.\"}" https://ruaidhri.pythonanywhere.com/submit_speech

    curl https://ruaidhri.pythonanywhere.com/get_news
"""
