# Ruaidhrí
# A script that will convert the metadata and dialogue content into jsonl format, which can then train our OpenAI model.

import pylangacq as pla
import json


class Patient:
    """A class of an individual patient that will be added to the jsonl file"""

    def __init__(self, pid: str, age: int, gender: str, mmse: int, is_healthy: bool, transcript: str):
        """
        Constructor function
        :param pid: The patient's unique ID, written in the format 'S012'
        :param age: The patient's age
        :param gender: The patient's gender
        :param mmse: The patient's mini-mental state examination score, some patients may not have one
        :param is_healthy: True if the patient is healthy, False if the patient has Alzheimer's
        :param transcript: The dialogue recording from the patient converted to text
        """

        self.pid = pid
        self.age = age
        self.gender = gender
        self.mmse = mmse
        self.is_healthy = is_healthy
        self.transcript = transcript

    def to_dict(self) -> dict:
        """
        Converts the content of the object into a dictionary, which can be used to finetune an OpenAI model
        :return: A dictionary containing the object information
        """

        health = "pattern_a" if self.is_healthy else "pattern_b"

        return {
            "messages": [
                # Giving the system its role to complete:
                {"role": "system", "content": "It is your job to analyse fictional transcripts where a person describes"
                                              " the content of a drawing. You must label each transcript as pattern_a"
                                              " or pattern_b."},
                # Giving the system the example of a user input:
                {"role": "user", "content": self.transcript},
                # Giving the system the matching health state to the above transcript:
                {"role": "assistant", "content": health}
            ]
        }


def get_patient_dialogue(cha_path: str) -> str:
    """
    Finds the dialogue of a patient.
    :param cha_path: The file path of the CHAT file with the dialogue
    :return: A string containing cleaned dialogue from the patient
    """

    chat = pla.read_chat(cha_path)  # Load in CHAT file
    patient_chat = chat.utterances("PAR")  # Gets just the dialogue from the patient

    # Some CHAT file content that is not relevant so will be removed:
    filtered_tokens = {"postclitic", "//", "/?", "/.", "/", "‡"}

    # Breaks down the chat into its individual words in a list:
    words = []

    for utterance in patient_chat:
        for token in utterance.tokens:
            if token.word.lower() not in filtered_tokens:
                words.append(token.word)

    full_dialogue = " ".join(words)  # Turns the list of words into a string

    # Removing some punctuation errors from this process:
    full_dialogue = full_dialogue.replace(" .", ".")
    full_dialogue = full_dialogue.replace(" ,", ",")
    full_dialogue = full_dialogue.replace(" ?", "?")
    full_dialogue = full_dialogue.replace(" !", "!")
    full_dialogue = full_dialogue.replace("_", " ")

    # A small few unwanted characters may get through, but it should be a negligible amount with the cleaning done
    return full_dialogue


def get_patients_metadata(data_path: str, healthy: bool) -> list:
    """
    Forms a list of patients from the text files of their information
    :param data_path: The path to the patient metadata text file
    :param healthy: Whether the patients in the file are healthy (True) or have Alzheimer's (False)
    :return: A list of patient objects created based on the content of the text file
    """

    patients_list = []

    with open(data_path, "r", encoding="utf-8") as file:
        for line in file:
            if line.startswith("S"):  # Only uses the lines that start with an ID
                data = line.split(sep="; ")
                pid, age, gender, mmse = data

                new_patient = Patient(
                    pid.strip(),
                    int(age.strip()),
                    gender.strip(),
                    int(mmse.strip()) if mmse.strip() != "NA" else None,  # Checks if value is assigned in txt
                    healthy,
                    None)

                patients_list.append(new_patient)

    return patients_list


if __name__ == "__main__":
    healthy_patient_list = get_patients_metadata("training_data/healthy_data.txt", True)
    unhealthy_patient_list = get_patients_metadata("training_data/unhealthy_data.txt", False)

    for patient in healthy_patient_list:
        dialogue = get_patient_dialogue(f"training_data/transcription/healthy/{patient.pid}.cha")
        patient.transcript = dialogue
        print(f"Patient {patient.pid} processed.")

    for patient in unhealthy_patient_list:
        dialogue = get_patient_dialogue(f"training_data/transcription/unhealthy/{patient.pid}.cha")
        patient.transcript = dialogue
        print(f"Patient {patient.pid} processed.")

    patient_list = healthy_patient_list + unhealthy_patient_list

    with open("output/patients.jsonl", "w", encoding="utf-8") as output:
        for i, patient in enumerate(patient_list):
            json_formatted_line = json.dumps(patient.to_dict())  # Converts the object to json format

            if i < len(patient_list) - 1:  # All patients other than the final one
                output.write(json_formatted_line + "\n")  # Each object in a jsonl file is on its own line
            else:
                output.write(json_formatted_line)  # Ensuring that the jsonl file does not end on a blank line

    print("Training data successfully written to JSONL file.")
