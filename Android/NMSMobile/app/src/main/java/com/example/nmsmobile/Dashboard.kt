package com.example.nmsmobile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.example.nmsmobile.ui.theme.GreenDark
import com.example.nmsmobile.ui.theme.Navy

@Composable
fun DashboardScreen(navController: NavController, appVm: AppViewModel) {

    val answers = appVm.answers
    val cognitiveScore = appVm.cognitiveScore
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.TopCenter
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .padding(top = 24.dp, bottom = 16.dp),
            colors = CardDefaults.cardColors(MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(4.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(GreenDark)
                        .padding(12.dp)
                ) {
                    Text(
                        "Assessment Dashboard",
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium
                    )
                }

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = { navController.navigate("questionnaire") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Navy,
                        contentColor = Color.White
                    )
                ) { Text("Health Questionnaire") }

                Button(
                    onClick = { navController.navigate("speech") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Navy,
                        contentColor = Color.White
                    )
                ) { Text("Speech Task") }

                Button(
                    onClick = { navController.navigate("cognitive") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Navy,
                        contentColor = Color.White
                    )
                ) { Text("Cognitive Test") }


                Spacer(Modifier.height(16.dp))

                Button(
                    onClick = {
                        val hasAge = (answers["Age"] as? Float ?: 0f) > 0f
                        val hasBmi = (answers["BMI"] as? Float ?: 0f) > 0f
                        val hasCognitive = cognitiveScore in 0..30

                        if (!hasAge || !hasBmi) {
                            Toast.makeText(
                                context,
                                "Please complete the questionnaire first.",
                                Toast.LENGTH_SHORT
                            ).show()
                            return@Button
                        }

                        if (!hasCognitive) {
                            Toast.makeText(
                                context,
                                "Please complete the cognitive test.",
                                Toast.LENGTH_SHORT
                            ).show()
                            return@Button
                        }

                        appVm.sendDataToAI()

                        appVm.submitQuestionnaireToBackend()

                        navController.navigate("calculating/0")
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Navy,
                        contentColor = Color.White
                    )
                ) {
                    Text("View Risk Result")
                }
                Button(
                    onClick = {
                        AuthManager.logout(context)
                        navController.navigate("login") {
                            popUpTo("dashboard") { inclusive = true }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    )
                ) {
                    Text("Logout")
                }
            }
        }
    }
}
