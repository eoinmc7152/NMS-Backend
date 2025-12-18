package com.example.nmsmobile

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

@Composable
fun CalculatingScreen(
    navController: NavController,
    appVm: AppViewModel
) {
    val isSubmitting = appVm.isSubmitting
    val backendResult = appVm.lastBackendResult
    val submitError = appVm.submitError
    val aiRisk = appVm.aiRiskScore

    var uiProgress by remember { mutableStateOf(0f) }

    // Animate progress while submitting
    LaunchedEffect(isSubmitting) {
        if (isSubmitting) {
            uiProgress = 0f
            while (uiProgress < 1f && isSubmitting) {
                uiProgress += 0.05f
                delay(150)
            }
        }
    }

    // Navigate ONLY when backend AND AI are ready
    LaunchedEffect(isSubmitting, backendResult, aiRisk) {
        if (!isSubmitting && backendResult != null && aiRisk != null) {
            // aiRisk is 0.0 .. 1.0 → convert to 0..100%
            val aiPercent = (aiRisk * 100f)
                .roundToInt()
                .coerceIn(0, 100)

            Log.d(
                "CalculatingScreen",
                "Using AI risk score: $aiPercent% (raw=$aiRisk)"
            )

            appVm.clearBackendResult()

            navController.navigate("riskResult/$aiPercent") {
                popUpTo("calculating/{score}") { inclusive = true }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            "Calculating dementia risk...",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(32.dp))

        if (submitError != null) {
            Text(
                text = "Something went wrong: $submitError",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(Modifier.height(24.dp))
            Button(onClick = { navController.popBackStack() }) {
                Text("Back")
            }
        } else {
            LinearProgressIndicator(
                progress = uiProgress.coerceIn(0f, 1f),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp),
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.height(24.dp))
            Text("${(uiProgress * 100).toInt()}%", style = MaterialTheme.typography.bodyLarge)
        }
    }
}
