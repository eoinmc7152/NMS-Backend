# Ruaidhrí
# Creating the Keras AI model that will be used to test user input values

import pandas as pd
from keras import Input
from sklearn.model_selection import train_test_split
from keras.models import Sequential
from keras.layers import Dense


if __name__ == "__main__":
    # LOADING DATA:
    data = pd.read_csv("data/new_dataset.csv")

    # SELECTING TARGET AND FEATURE DATA:
    target = data["Alzheimer’s Diagnosis"]
    features = data.drop(columns=["Alzheimer’s Diagnosis"])

    # Splitting the data up into training and testing sets, training data getting 80%
    feature_train, feature_test, target_train, target_test = train_test_split(features, target, test_size=0.2,
                                                                              random_state=1)
    # Must choose an arbitrary random_state due to training being repeated, I went for 1

    # DEFINING THE MODEL:
    # Making a sequential model, which is a linear stack of layers
    model = Sequential()

    # Input layer
    model.add(Input(shape=(feature_train.shape[1],)))
    # Specified the number of columns there are in the dataset

    # First hidden layer:
    model.add(Dense(256, activation="relu"))
    # This layer begins to discover the basic relationships between features
    # 256 units should be a lot of information gathered
    # relu chosen as it is good with positive values

    # Second hidden layer:
    model.add(Dense(128, activation="relu"))
    # Adds in another layer of learning patterns between features, building on the first layer's work
    # Less units here to avoid overfitting (model learning training data too well and unable judge new data)

    # Third hidden layer:
    model.add(Dense(64, activation="relu"))

    # Output layer:
    model.add(Dense(1, activation="sigmoid"))
    # Only 1 unit required as it is predicting a binary value
    # Sigmoid produces a probability value from 0 to 1

    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    # Chose adam as the optimiser as it seems to be the most commonly used and should be fine for a small project
    # Chose binary_crossentropy as a binary result is being produced
    # Also keeps track of the accuracy of the accuracy during training

    # TRAINING MODEL:
    model.fit(feature_train, target_train, batch_size=32, epochs=20, validation_data=(feature_test, target_test))
    # Passes over the dataset 20 times

    # EVALUATING MODEL:
    loss, accuracy = model.evaluate(feature_test, target_test)
    print(f"Test loss: {loss}")
    print(f"Test accuracy: {accuracy}")

    # SAVING MODEL:
    model.save("models/alzheimers_model.keras")
