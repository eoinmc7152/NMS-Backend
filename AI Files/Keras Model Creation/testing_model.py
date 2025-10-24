# Ruaidhrí
# Testing out the built Keras model on some made up characters - a young healthy one, and an old unhealthy one

import pandas as pd
from keras.models import load_model

if __name__ == "__main__":
    # Creating fictional characters to be tested:
    low_risk = {
        "Age": 20, "Gender": 1, "Education Level": 19, "BMI": 20.0, "Physical Activity Level": 2, "Smoking Status": 0,
        "Alcohol Consumption": 0, "Diabetes": 0, "Hypertension": 0, "Cholesterol Level": 0,
        "Family History of Alzheimer’s": 0, "Cognitive Test Score": 99, "Depression Level": 0, "Sleep Quality": 2,
        "Dietary Habits": 2, "Air Pollution Exposure": 0, "Employment Status": 1, "Marital Status": 1,
        "Genetic Risk Factor (APOE-ε4 allele)": 0, "Social Engagement Level": 2, "Income Level": 2, "Stress Levels": 0,
        "Urban vs Rural Living": 0
    }
    low_risk_df = pd.DataFrame([low_risk])

    high_risk = {
        "Age": 90, "Gender": 0, "Education Level": 0, "BMI": 31.0, "Physical Activity Level": 0, "Smoking Status": 2,
        "Alcohol Consumption": 2, "Diabetes": 1, "Hypertension": 1, "Cholesterol Level": 1,
        "Family History of Alzheimer’s": 1, "Cognitive Test Score": 30, "Depression Level": 2, "Sleep Quality": 0,
        "Dietary Habits": 0, "Air Pollution Exposure": 2, "Employment Status": 2, "Marital Status": 2,
        "Genetic Risk Factor (APOE-ε4 allele)": 1, "Social Engagement Level": 0, "Income Level": 0, "Stress Levels": 2,
        "Urban vs Rural Living": 1
    }
    high_risk_df = pd.DataFrame([high_risk])

    # Loading in the Keras model from a file:
    model = load_model("models/alzheimers_model.keras")

    # Testing the characters I made:
    low_risk_prediction = model.predict(low_risk_df)
    high_risk_prediction = model.predict(high_risk_df)

    print(f"\nThe healthier person has a {low_risk_prediction[0][0] * 100:.2f}% risk of Alzheimer's\n"
          f"The unhealthy person has a {high_risk_prediction[0][0] * 100:.2f}% risk of Alzheimer's")
