package com.example.nmsmobile

import android.Manifest
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import java.util.Locale

@Composable
fun SpeechTaskScreen(navController: NavController, appVm: AppViewModel) {
    val context = LocalContext.current

    var isListening by remember { mutableStateOf(false) }
    var transcript by remember { mutableStateOf(appVm.transcript ?: "") }
    var finalTranscript by remember { mutableStateOf<String?>(null) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var isSending by remember { mutableStateOf(false) }
    var sentMsg by remember { mutableStateOf<String?>(null) }

    val recognizer = remember {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            SpeechRecognizer.createSpeechRecognizer(context)
        } else null
    }

    fun buildIntent(): Intent =
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)

            // helps on some devices
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)

            // allow longer speech (not guaranteed, but helps)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 60000L)
        }

    DisposableEffect(recognizer) {
        if (recognizer == null) {
            errorMsg = "Speech recognition is not available on this device."
            return@DisposableEffect onDispose { }
        }

        val listener = object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                Log.d("SpeechTask", "Ready for speech")
                errorMsg = null
                sentMsg = null
            }

            override fun onBeginningOfSpeech() {
                Log.d("SpeechTask", "Speech beginning")
            }

            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {
                Log.d("SpeechTask", "Speech end (system detected)")
            }

            override fun onError(error: Int) {
                Log.e("SpeechTask", "Recognition error: $error")
                isListening = false

                errorMsg = when (error) {
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                        "Permission issue (error 13). Check app mic permission + system microphone toggle."
                    SpeechRecognizer.ERROR_NO_MATCH,
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                        "Didn't catch that. Try again and speak clearly."
                    SpeechRecognizer.ERROR_NETWORK,
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                        "Network error. Make sure you have internet (hotspot/SIM/Wi-Fi)."
                    else -> "Speech recognition error ($error)."
                }
            }

            override fun onResults(results: Bundle) {
                val texts = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val best = texts?.firstOrNull()

                Log.d("SpeechTask", "Final results: $texts")
                isListening = false

                if (!best.isNullOrBlank()) {
                    transcript = best
                    finalTranscript = best
                    appVm.transcript = best
                } else {
                    errorMsg = "No text recognised. Please try again."
                }
            }

            override fun onPartialResults(partialResults: Bundle) {
                val partial = partialResults
                    .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()

                if (!partial.isNullOrBlank()) {
                    transcript = partial
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }

        recognizer.setRecognitionListener(listener)

        onDispose {
            try { recognizer.cancel() } catch (_: Exception) {}
            recognizer.destroy()
        }
    }

    fun startListeningNow() {
        if (recognizer == null) {
            errorMsg = "Speech recognizer not available."
            return
        }
        errorMsg = null
        sentMsg = null
        transcript = ""
        finalTranscript = null
        isListening = true

        try {
            recognizer.startListening(buildIntent())
            Log.d("SpeechTask", "Speech recogniser started")
        } catch (e: Exception) {
            isListening = false
            errorMsg = "Failed to start recognition: ${e.localizedMessage}"
            Log.e("SpeechTask", "startListening exception", e)
        }
    }

    fun stopListeningNow() {
        if (recognizer == null) return
        try {
            recognizer.stopListening()
        } catch (e: Exception) {
            Log.e("SpeechTask", "stopListening exception", e)
        } finally {
            isListening = false
        }
    }

    val micPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            errorMsg = "Microphone permission is required for the speech task."
        } else {
            startListeningNow()
        }
    }

    fun sendTranscriptToAiNow() {
        val txt = finalTranscript?.trim().orEmpty()
        if (txt.isBlank()) {
            errorMsg = "Nothing to send yet — please record speech first."
            return
        }

        isSending = true
        errorMsg = null
        sentMsg = null

        appVm.transcript = txt
        appVm.sendSpeechToAI { res ->
            isSending = false
            if (res != null) {
                sentMsg = "Sent to AI successfully."
            } else {
                sentMsg = "Sent to AI, but no numeric score returned (check API response mapping)."
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.TopCenter
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .padding(top = 16.dp, bottom = 16.dp),
            colors = CardDefaults.cardColors(MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(4.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Speech Task", style = MaterialTheme.typography.titleLarge)

                Text(
                    "Press Start and speak for ~60 seconds. Press Stop when you’re done. " +
                            "Then you can review the transcript and send it to the AI.",
                    style = MaterialTheme.typography.bodyMedium
                )

                if (!isListening) {
                    Button(
                        onClick = { micPermLauncher.launch(Manifest.permission.RECORD_AUDIO) },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Start") }
                } else {
                    Button(
                        onClick = { stopListeningNow() },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.onErrorContainer
                        )
                    ) { Text("Stop") }
                }

                if (isListening) {
                    Text("Listening…", style = MaterialTheme.typography.bodyMedium)
                }

                if (transcript.isNotBlank()) {
                    Text("Transcript:", style = MaterialTheme.typography.titleSmall)
                    Text(transcript, style = MaterialTheme.typography.bodyMedium)
                }

                if (!finalTranscript.isNullOrBlank()) {
                    Button(
                        onClick = { sendTranscriptToAiNow() },
                        enabled = !isSending,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (isSending) "Sending..." else "Send Transcript to AI")
                    }

                    Button(
                        onClick = {
                            navController.navigate("dashboard") {
                                popUpTo("dashboard") { inclusive = false }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Back to Dashboard") }
                }

                if (sentMsg != null) {
                    Text(sentMsg!!, style = MaterialTheme.typography.bodyMedium)
                }

                if (errorMsg != null) {
                    Text(
                        errorMsg!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}
