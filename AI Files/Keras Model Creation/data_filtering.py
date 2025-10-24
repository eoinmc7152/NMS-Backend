# Ruaidhrí
# Creating an updated CSV file where the less relevant columns are removed from the dataset
# Also involves converting non-numerical values into numbers

import pandas as pd

if __name__ == "__main__":
    original_data = pd.read_csv("data/old_dataset.csv")

    # Removing unnecessary and complicated columns:
    removed_columns = ["Country"]
    new_data = original_data.drop(columns=removed_columns)
    """
    Removed Country as the dataset is only good for 20 countries - and it is difficult to convert to a numerical format
    """

    # Neural networks can only work with numbers, so must convert all strings:
    # Gender consists of Female (0) and male (1)
    new_data["Gender"] = new_data["Gender"].map({"Female": 0, "Male": 1})

    # Physical Activity Level consists of Low (0), Medium (1), and High (2)
    new_data["Physical Activity Level"] = new_data["Physical Activity Level"].map({"Low": 0, "Medium": 1, "High": 2})

    # Smoking status has Never (0), Former (1), and Current (2)
    new_data["Smoking Status"] = new_data["Smoking Status"].map({"Never": 0, "Former": 1, "Current": 2})

    # Alcohol Consumption has Never (0), Occasionally (1), and Regularly (2)
    new_data["Alcohol Consumption"] = (new_data["Alcohol Consumption"]
                                       .map({"Never": 0, "Occasionally": 1, "Regularly": 2}))

    # Diabetes has No (0), and Yes (1)
    new_data["Diabetes"] = new_data["Diabetes"].map({"No": 0, "Yes": 1})

    # Hypertension has No (0), and Yes (1)
    new_data["Hypertension"] = new_data["Hypertension"].map({"No": 0, "Yes": 1})

    # Cholesterol Level has Normal (0), and High (1)
    new_data["Cholesterol Level"] = new_data["Cholesterol Level"].map({"Normal": 0, "High": 1})

    # Family History of Alzheimer’s has No (0), and Yes (1)
    new_data["Family History of Alzheimer’s"] = new_data["Family History of Alzheimer’s"].map({"No": 0, "Yes": 1})

    # Depression Level has Low (0), Medium (1), and High (2)
    new_data["Depression Level"] = new_data["Depression Level"].map({"Low": 0, "Medium": 1, "High": 2})

    # Sleep Quality has Poor (0), Average (1), and Good (2)
    new_data["Sleep Quality"] = new_data["Sleep Quality"].map({"Poor": 0, "Average": 1, "Good": 2})

    # Dietary Habits has Unhealthy (0), Average (1), and Healthy (2)
    new_data["Dietary Habits"] = new_data["Dietary Habits"].map({"Unhealthy": 0, "Average": 1, "Healthy": 2})

    # Air Pollution Exposure has Low (0), Medium (1), and High (2)
    new_data["Air Pollution Exposure"] = new_data["Air Pollution Exposure"].map({"Low": 0, "Medium": 1, "High": 2})

    # Employment Status has Unemployed (0), Employed (1), and Retired (2)
    new_data["Employment Status"] = new_data["Employment Status"].map({"Unemployed": 0, "Employed": 1, "Retired": 2})

    # Marital Status has Single (0), Married (1), and Widowed (2)
    new_data["Marital Status"] = new_data["Marital Status"].map({"Single": 0, "Married": 1, "Widowed": 2})

    new_data["Genetic Risk Factor (APOE-ε4 allele)"] = (new_data["Genetic Risk Factor (APOE-ε4 allele)"]
                                                        .map({"No": 0, "Yes": 1}))

    # Social Engagement Level has Low (0), Medium (1), and High (2)
    new_data["Social Engagement Level"] = new_data["Social Engagement Level"].map({"Low": 0, "Medium": 1, "High": 2})

    # Income Level has Low (0), Medium (1), and High (2)
    new_data["Income Level"] = new_data["Income Level"].map({"Low": 0, "Medium": 1, "High": 2})

    # Stress Levels has Low (0), Medium (1), and High (2)
    new_data["Stress Levels"] = new_data["Stress Levels"].map({"Low": 0, "Medium": 1, "High": 2})

    # Urban vs Rural Living has Urban (0), and Rural (1)
    new_data["Urban vs Rural Living"] = new_data["Urban vs Rural Living"].map({"Urban": 0, "Rural": 1})

    # Alzheimer’s Diagnosis has No (0) and Yes (1)
    new_data["Alzheimer’s Diagnosis"] = new_data["Alzheimer’s Diagnosis"].map({"No": 0, "Yes": 1})

    new_data.to_csv("data/new_dataset.csv", index=False)
