package com.example.nmsmobile

import android.Manifest
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

@Composable
fun SpeechToTextScreen(navController: NavController, appVm: AppViewModel) {
    val context = LocalContext.current
    var isListening by remember { mutableStateOf(false) }
    var transcript by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    val recognizer = remember {
        try {
            SpeechRecognizer.createSpeechRecognizer(context)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    val micPerm = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            error = "Microphone permission is required."
        } else {
            startListeningInternal(
                recognizer = recognizer,
                onStart = { isListening = true; error = null },
                onError = {
                    isListening = false
                    error = it
                }
            )
        }
    }

    DisposableEffect(recognizer) {
        if (recognizer == null) return@DisposableEffect onDispose {}

        val listener = object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                error = null
            }

            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}

            override fun onError(code: Int) {
                isListening = false
                error = "Speech error ($code). Try again."
            }

            override fun onResults(results: Bundle) {
                results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.let { transcript = it }
                isListening = false
            }

            override fun onPartialResults(partialResults: Bundle) {
                partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.let { transcript = it }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }

        recognizer.setRecognitionListener(listener)

        onDispose {
            recognizer.destroy()
        }
    }

    fun startListening() {
        micPerm.launch(Manifest.permission.RECORD_AUDIO)
    }

    fun stopListening() {
        recognizer?.stopListening()
        isListening = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Speech to Text", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(12.dp))
        Text(
            if (transcript.isBlank()) "Tap Start and speak clearly for ~1 minute."
            else transcript,
            style = MaterialTheme.typography.bodyLarge
        )
        Spacer(Modifier.height(24.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                enabled = !isListening && recognizer != null,
                onClick = { startListening() }
            ) { Text("Start") }

            Button(
                enabled = isListening,
                onClick = { stopListening() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) { Text("Stop") }
        }

        if (recognizer == null) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Speech recognizer could not be created.",
                color = MaterialTheme.colorScheme.error
            )
        }
        if (error != null) {
            Spacer(Modifier.height(8.dp))
            Text(error!!, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(24.dp))
        Button(
            enabled = transcript.isNotBlank(),
            onClick = {
                appVm.transcript = transcript
                navController.navigate("dashboard")
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Save & Back") }

        if (appVm.transcript != null) {
            Spacer(Modifier.height(12.dp))
            Text("Captured transcript:\n${appVm.transcript}")
        }
    }
}

private fun startListeningInternal(
    recognizer: SpeechRecognizer?,
    onStart: () -> Unit,
    onError: (String) -> Unit
) {
    if (recognizer == null) {
        onError("Speech recognizer is not available.")
        return
    }

    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        )
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }

    onStart()
    recognizer.startListening(intent)
}
