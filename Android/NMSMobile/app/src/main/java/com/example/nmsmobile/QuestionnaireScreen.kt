package com.example.nmsmobile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

data class NumericQuestion(
    val text: String,
    val options: List<Pair<String, Int>>
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionnaireScreen(navController: NavController, appVm: AppViewModel) {

    val answers: MutableMap<String, Any> = appVm.answers
    val context = LocalContext.current

    val questions = listOf(
        // 1. Age
        NumericQuestion("Age", emptyList()), // numeric input

        // 2. Gender
        NumericQuestion(
            "Gender",
            listOf("Female" to 0, "Male" to 1)
        ),

        // 3. Education Level (0–19)
        NumericQuestion(
            "Education Level",
            (0..19).map { value -> value.toString() to value }
        ),

        // 4. BMI
        NumericQuestion("BMI", emptyList()), // numeric input

        // 5. Physical Activity Level
        NumericQuestion(
            "Physical Activity Level",
            listOf("Low" to 0, "Medium" to 1, "High" to 2)
        ),

        // 6. Smoking Status
        NumericQuestion(
            "Smoking Status",
            listOf(
                "Never smoked" to 0,
                "Formerly smoked" to 1,
                "Currently smoke" to 2
            )
        ),

        // 7. Alcohol Consumption
        NumericQuestion(
            "Alcohol Consumption",
            listOf(
                "Never drink" to 0,
                "Occasionally drink" to 1,
                "Regularly drink" to 2
            )
        ),

        // 8. Diabetes
        NumericQuestion(
            "Have you been diagnosed with diabetes?",
            listOf("No" to 0, "Yes" to 1)
        ),

        // 9. Hypertension
        NumericQuestion(
            "Have you ever been diagnosed with high blood pressure? (Hypertension)",
            listOf("No" to 0, "Yes" to 1)
        ),

        // 10. Cholesterol Level (Normal / High)
        NumericQuestion(
            "Have you ever been diagnosed with high cholesterol? ",
            listOf("No" to 0, "Yes" to 1)
        ),

        // 11. Family History of Alzheimer's
        NumericQuestion(
            "Do you have a family history of Alzheimer's?",
            listOf("No" to 0, "Yes" to 1)
        ),

        // 12. Cognitive Test Score (user types their score)
       // NumericQuestion("Cognitive Test Score", emptyList()),

        // 13. Depression Level
        NumericQuestion(
            "How often do you feel down or depressed?",
            listOf(
                "Low (Rarely or Never)" to 0,
                "Medium (Sometimes)" to 1,
                "High (Often or Most of the time)" to 2
            )
        ),

        // 14. Sleep Quality
        NumericQuestion(
            "How would you describe your sleep quality?",
            listOf("Poor" to 0, "Average" to 1, "Good" to 2)
        ),

        // 15. Dietary Habits
        NumericQuestion(
            "How would you describe your usual diet?",
            listOf("Mostly unhealthy" to 0, "Somewhat balanced" to 1, "Mostly healthy" to 2)
        ),

        // 16. Air Pollution Exposure
        NumericQuestion(
            "How would you describe the level of air pollution in the area you live?",
            listOf("Low" to 0, "Medium" to 1, "High" to 2)
        ),

        // 17. Employment Status
        NumericQuestion(
            "Employment Status",
            listOf("Unemployed" to 0, "Employed" to 1, "Retired" to 2)
        ),

        // 18. Marital Status
        NumericQuestion(
            "Marital Status",
            listOf("Single" to 0, "Married" to 1, "Widowed" to 2)
        ),

        // 19. Genetic Risk Factor
        NumericQuestion(
            "Genetic Risk Factor",
            listOf("No" to 0, "Yes" to 1)
        ),

        // 20. Social Engagement Level
        NumericQuestion(
            "How socially active are you in your daily life(e.g. meeting friends)?",
            listOf(
                "I rarely socialize" to 0,
                "I sometimes socialize" to 1,
                "I regularly socialize" to 2
            )
        ),

        // 21. Income Level
        NumericQuestion(
            "How would you describe your financial situation?",
            listOf(
                "I struggle to meet expenses" to 0,
                "I can manage my living costs comfortably" to 1,
                "I have more than enough for my needs" to 2
            )
        ),

        // 22. Stress Levels
        NumericQuestion(
            "How often do you feel stressed?",
            listOf(
                "Low (Rarely or Never)" to 0,
                "Medium (Sometimes)" to 1,
                "High (Often or Most of the time)" to 2
            )
        ),

        // 23. Urban vs Rural Living
        NumericQuestion(
            "Where do you currently live?",
            listOf(
                "In a city or urban area" to 0,
                "In a rural or countryside area" to 1
            )
        )
    )

    val required = listOf("Age", "BMI", "Gender", "Physical Activity Level")

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
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                Text(
                    "Questionnaire",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(questions, key = { it.text }) { question ->
                        when (question.text) {
                            "Age",
                            "BMI",
                            "Cognitive Test Score" -> {
                                NumericInputQuestion(question.text, answers)
                            }

                            else -> {
                                DropdownQuestion(question, answers)
                            }
                        }
                    }

                    item {
                        Spacer(Modifier.height(24.dp))

                        Button(
                            onClick = {
                                val missing = required.filter { it !in answers }
                                val ageOk = ((answers["Age"] as? Float) ?: 0f) > 0f
                                val bmiOk = ((answers["BMI"] as? Float) ?: 0f) in 10f..60f

                                if (missing.isNotEmpty() || !ageOk || !bmiOk) {
                                    Toast.makeText(
                                        context,
                                        "Please complete all required fields with valid values.",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                    return@Button
                                }
                                
                                appVm.submitQuestionnaireToBackend()

                                navController.navigate("dashboard")
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            Text("Submit Questionnaire")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun NumericInputQuestion(label: String, answers: MutableMap<String, Any>) {
    var value by rememberSaveable(label) {
        mutableStateOf(
            (answers[label] as? Float)
                ?.takeIf { it != 0f }
                ?.toString()
                ?: ""
        )
    }

    OutlinedTextField(
        value = value,
        onValueChange = {
            value = it
            answers[label] = it.toFloatOrNull() ?: 0f
        },
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth()
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DropdownQuestion(question: NumericQuestion, answers: MutableMap<String, Any>) {
    var expanded by remember { mutableStateOf(false) }

    val selectedNumeric = answers[question.text] as? Int
    val selectedLabel = question.options
        .firstOrNull { it.second == selectedNumeric }
        ?.first
        ?: ""

    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = question.text,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(bottom = 4.dp)
        )

        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = if (selectedLabel.isEmpty()) "Select an option" else selectedLabel,
                onValueChange = {},
                readOnly = true,
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                },
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth()
            )

            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                question.options.forEach { (label, numericValue) ->
                    DropdownMenuItem(
                        text = { Text(label) },
                        onClick = {
                            expanded = false
                            answers[question.text] = numericValue
                        }
                    )
                }
            }
        }
    }
}
