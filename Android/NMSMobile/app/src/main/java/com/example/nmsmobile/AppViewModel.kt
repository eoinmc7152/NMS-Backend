package com.example.nmsmobile

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class AppViewModel : ViewModel() {

    // Stores questionnaire answers collected in the UI
    val answers = mutableStateMapOf<String, Any>()

    var cognitiveScore by mutableStateOf(0)

    // Speech task
    var audioPath by mutableStateOf<String?>(null)
    var transcript by mutableStateOf<String?>(null)

    var isSubmitting by mutableStateOf(false)
        private set

    var submitError by mutableStateOf<String?>(null)
        private set

    // Stores last backend response (so UI can show resultId/risk if desired)
    var lastBackendResult by mutableStateOf<SubmitQuestionnaireResponse?>(null)
        private set

    var aiRiskScore by mutableStateOf<Float?>(null)
        private set

    var aiSpeechDiagnosis by mutableStateOf<String?>(null)
        private set


// -------------------- BACKEND (Cloud Run) --------------------

    /**
     * Build a request that matches the Flask backend contract:
     * {
     *   "patientId": "...",
     *   "patientName": "...",
     *   "answers": [ { "q": "...", "value": ... }, ... ],
     *   "notes": [ ... ]   // optional
     * }
     *
     * This converts the existing answers map into the required answers list.
     */
    private fun buildBackendRequest(): SubmitQuestionnaireRequest {


        val patientId = "patient_001"
        val patientName = "John Doe"

        // Convert map keys/values into the backend's expected list format
        val answersList = answers.map { (k, v) ->
            AnswerItem(q = k, value = v)
        }

        // Provide simple notes for the doctor dashboard (optional, but helpful)
        val notes = mutableListOf<String>()

        val smoking = answers["Smoking Status"] ?: answers["smoker"]
        if (smoking != null && smoking.toString().trim().lowercase() !in listOf("0", "false", "no", "none", "")) {
            notes.add("Smoker")
        }

        val memory = answers["Memory Loss"] ?: answers["memory_loss"] ?: answers["Memory"]
        if (memory != null && memory.toString().trim().lowercase() !in listOf("0", "false", "no", "none", "")) {
            notes.add("Memory issues")
        }

        return SubmitQuestionnaireRequest(
            patientId = patientId,
            patientName = patientName,
            answers = answersList,
            notes = if (notes.isEmpty()) null else notes
        )
    }

    /**
     * Submit to the deployed backend (Cloud Run).
     * Requires X-API-Key header because your backend enforces API_KEY env var.
     */
    fun submitQuestionnaireToBackend() {
        viewModelScope.launch {
            isSubmitting = true
            submitError = null
            lastBackendResult = null

            try {
                val body = buildBackendRequest()
                Log.d("AppViewModel", "Sending to backend: $body")

                val response = NmsApiClient.api.submitQuestionnaire(
                    apiKey = "some-secret-key-123",
                    body = body

                )

                if (response.isSuccessful) {
                    val respBody = response.body()
                    lastBackendResult = respBody
                    Log.d("AppViewModel", "Backend OK (${response.code()}): $respBody")
                } else {
                    val errorStr = response.errorBody()?.string()
                    submitError = "Server error: ${response.code()}"
                    Log.e("AppViewModel", "Backend FAIL (${response.code()}): $errorStr")
                }
            } catch (e: Exception) {
                submitError = e.localizedMessage ?: "Network error"
                Log.e("AppViewModel", "Exception calling backend", e)
            } finally {
                isSubmitting = false
            }
        }
    }

    fun clearBackendResult() {
        lastBackendResult = null
        submitError = null
    }


// -------------------- AI model (PythonAnywhere) --------------------

    /**
     * Safely get any numeric answer (Int or Float). Returns 0 if missing.
     */
    private fun num(key: String): Number {
        val v = answers[key]
        return when (v) {
            is Number -> v
            else -> 0
        }
    }

    /**
     * Build the 23-element vector in the exact order from Ruaidhri’s spec:
     *
     * Age, Gender, Education Level, BMI, Physical Activity Level,
     * Smoking Status, Alcohol Consumption, Diabetes, Hypertension,
     * Cholesterol Level, Family History of Alzheimer’s, Cognitive Test Score,
     * Depression Level, Sleep Quality, Dietary Habits, Air Pollution Exposure,
     * Employment Status, Marital Status, Genetic Risk Factor,
     * Social Engagement Level, Income Level, Stress Levels, Urban vs Rural.
     */
    private fun buildAiVector(): List<Number> {
        // Simple mapping: 30 + score, clamped.
        val cognitiveForModel = (30 + cognitiveScore).coerceIn(30, 99)

        return listOf(
            num("Age"),
            num("Gender"),
            num("Education Level"),
            num("BMI"),
            num("Physical Activity Level"),
            num("Smoking Status"),
            num("Alcohol Consumption"),
            num("Have you been diagnosed with diabetes?"),
            num("Have you ever been diagnosed with high blood pressure? (Hypertension)"),
            num("Have you ever been diagnosed with high cholesterol? "),
            num("Do you have a family history of Alzheimer's?"),
            cognitiveForModel,
            num("How often do you feel down or depressed?"),
            num("How would you describe your sleep quality?"),
            num("How would you describe your usual diet?"),
            num("How would you describe the level of air pollution in the area you live?"),
            num("Employment Status"),
            num("Marital Status"),
            num("Genetic Risk Factor"),
            num("How socially active are you in your daily life(e.g. meeting friends)?"),
            num("How would you describe your financial situation?"),
            num("How often do you feel stressed?"),
            num("Where do you currently live?")      // Urban vs Rural
        )
    }

    /**
     * Send questionnaire-style numeric data to the AI model.
     * onComplete is called with the AI's numeric result (or null if error).
     */
    fun sendDataToAI(onComplete: (Float?) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val vector = buildAiVector()
                Log.d("AppViewModel", "Sending AI data vector: $vector")

                val response = AIModelApiClient.api.submitData(
                    AIDataRequest(vector)
                )

                if (response.isSuccessful) {
                    val res = response.body()?.alzheimersRisk
                    aiRiskScore = res
                    Log.d("AppViewModel", "AI data OK: $res")
                    onComplete(res)
                } else {
                    Log.e("AppViewModel", "AI data error: ${response.code()}")
                    onComplete(null)
                }
            } catch (e: Exception) {
                Log.e("AppViewModel", "Exception sending AI data", e)
                onComplete(null)
            }
        }
    }

    /**
     * Send speech transcript text to the AI model.
     * onComplete is called with the AI's numeric result (or null if error).
     */
    fun sendSpeechToAI(onComplete: (String?) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val txt = transcript ?: ""
                Log.d("AppViewModel", "Sending AI speech text: $txt")

                val response = AIModelApiClient.api.submitSpeech(
                    AISpeechRequest(txt)
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    val diag = body?.diagnosis   // <-- "Alzheimer's Risk"
                    aiSpeechDiagnosis = diag
                    Log.d("AppViewModel", "AI speech diagnosis: $diag")
                    onComplete(diag)
                } else {
                    Log.e("AppViewModel", "AI speech error: ${response.code()}")
                    onComplete(null)
                }
            } catch (e: Exception) {
                Log.e("AppViewModel", "Exception sending AI speech", e)
                onComplete(null)
            }
        }
    }

}
