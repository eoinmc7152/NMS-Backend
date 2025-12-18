package com.example.nmsmobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.roundToInt

private const val CORRECT_REGION   = "Munster"
private const val CORRECT_COUNTRY  = "Ireland"
private const val CORRECT_TOWN     = "Cork"
private const val CORRECT_HOSPITAL = "Cork Hospital"
private const val CORRECT_FLOOR    = "First floor"

private enum class CogQuestionType { DROPDOWN, TEXT, INFO }

private data class CogQuestion(
    val prompt: String,
    val type: CogQuestionType,
    val options: List<String> = emptyList(),
    val correctAnswer: String = "",
    val maxScore: Int = 1
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CognitiveTestScreen(navController: NavController, appVm: AppViewModel) {
    val today = LocalDate.now()
    val locale = Locale.getDefault()

    val yearCorrect = today.year.toString()
    val monthName = today.month.getDisplayName(TextStyle.FULL, locale)
    val dayOfWeek = today.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
    val dayOfMonth = today.dayOfMonth.toString()

    val season = when (today.monthValue) {
        12, 1, 2 -> "Winter"
        3, 4, 5 -> "Spring"
        6, 7, 8 -> "Summer"
        else -> "Autumn"
    }

    val yearOptions = listOf(
        yearCorrect, (today.year - 1).toString(), (today.year + 1).toString()
    ).shuffled()

    val seasonOptions = listOf(
        season, "Spring", "Summer", "Autumn", "Winter"
    ).distinct().shuffled()

    val monthOptions = listOf(
        monthName, "January", "April", "August"
    ).distinct().shuffled()

    val dayOfWeekOptions = listOf(
        dayOfWeek, "Monday", "Wednesday", "Friday"
    ).distinct().shuffled()

    val dateOptions = listOf(
        dayOfMonth, "1", "15", "30"
    ).distinct().shuffled()

    val questions = remember {
        listOf(
            // ORIENTATION – TIME (5)
            CogQuestion(
                prompt = "What year is it?",
                type = CogQuestionType.DROPDOWN,
                options = yearOptions,
                correctAnswer = yearCorrect
            ),
            CogQuestion(
                prompt = "Which season is it now?",
                type = CogQuestionType.DROPDOWN,
                options = seasonOptions,
                correctAnswer = season
            ),
            CogQuestion(
                prompt = "What is today’s date (day of the month)?",
                type = CogQuestionType.DROPDOWN,
                options = dateOptions,
                correctAnswer = dayOfMonth
            ),
            CogQuestion(
                prompt = "What day of the week is today?",
                type = CogQuestionType.DROPDOWN,
                options = dayOfWeekOptions,
                correctAnswer = dayOfWeek
            ),
            CogQuestion(
                prompt = "What month is it?",
                type = CogQuestionType.DROPDOWN,
                options = monthOptions,
                correctAnswer = monthName
            ),

            // ORIENTATION – PLACE (5)
            CogQuestion(
                prompt = "In which province are we?",
                type = CogQuestionType.TEXT,
                correctAnswer = CORRECT_REGION
            ),
            CogQuestion(
                prompt = "In which country are we?",
                type = CogQuestionType.TEXT,
                correctAnswer = CORRECT_COUNTRY
            ),
            CogQuestion(
                prompt = "In which town or city are we?",
                type = CogQuestionType.TEXT,
                correctAnswer = CORRECT_TOWN
            ),
            CogQuestion(
                prompt = "What is the name of this hospital?",
                type = CogQuestionType.TEXT,
                correctAnswer = CORRECT_HOSPITAL
            ),
            CogQuestion(
                prompt = "On which floor are we?",
                type = CogQuestionType.TEXT,
                correctAnswer = CORRECT_FLOOR
            ),

            // ATTENTION / CALCULATION (5)
            CogQuestion(
                prompt = "Spell the word WORLD backwards (type it):",
                type = CogQuestionType.TEXT,
                correctAnswer = "dlrow"
            ),
            CogQuestion(
                prompt = "Starting from 100, subtract 7 once (type the result):",
                type = CogQuestionType.TEXT,
                correctAnswer = "93"
            ),
            CogQuestion(
                prompt = "From that number, subtract 7 again:",
                type = CogQuestionType.TEXT,
                correctAnswer = "86"
            ),
            CogQuestion(
                prompt = "Subtract 7 again:",
                type = CogQuestionType.TEXT,
                correctAnswer = "79"
            ),
            CogQuestion(
                prompt = "Subtract 7 one more time:",
                type = CogQuestionType.TEXT,
                correctAnswer = "72"
            ),

            CogQuestion(
                prompt = "Please remember this word: APPLE.\nYou will be asked to type it on the next screen.",
                type = CogQuestionType.INFO,
                maxScore = 0
            ),
            CogQuestion(
                prompt = "Please type the word you were just told to remember (do not look back).",
                type = CogQuestionType.TEXT,
                correctAnswer = "apple"
            ),

            // TABLE
            CogQuestion(
                prompt = "Please remember this word: TABLE.\nYou will be asked to type it on the next screen.",
                type = CogQuestionType.INFO,
                maxScore = 0
            ),
            CogQuestion(
                prompt = "Please type the word you were just told to remember.",
                type = CogQuestionType.TEXT,
                correctAnswer = "table"
            ),

            // PENNY
            CogQuestion(
                prompt = "Please remember this word: PENNY.\nYou will be asked to type it on the next screen.",
                type = CogQuestionType.INFO,
                maxScore = 0
            ),
            CogQuestion(
                prompt = "Please type the word you were just told to remember.",
                type = CogQuestionType.TEXT,
                correctAnswer = "penny"
            ),

            CogQuestion(
                prompt = "Language: type the word PENCIL.",
                type = CogQuestionType.TEXT,
                correctAnswer = "pencil"
            ),
            CogQuestion(
                prompt = "Language: type the word WATCH.",
                type = CogQuestionType.TEXT,
                correctAnswer = "watch"
            ),
            CogQuestion(
                prompt = "Repeat this phrase exactly: NO IFS, ANDS, OR BUTS.",
                type = CogQuestionType.TEXT,
                correctAnswer = "no ifs, ands, or buts"
            ),
            CogQuestion(
                prompt = "3-stage command (1/3): imagine you TAKE A PAPER IN YOUR HAND. Type DONE when you understand.",
                type = CogQuestionType.TEXT,
                correctAnswer = "done"
            ),
            CogQuestion(
                prompt = "3-stage command (2/3): imagine you FOLD IT IN HALF. Type DONE when you do this.",
                type = CogQuestionType.TEXT,
                correctAnswer = "done"
            ),
            CogQuestion(
                prompt = "3-stage command (3/3): imagine you PUT IT ON THE FLOOR. Type DONE when finished.",
                type = CogQuestionType.TEXT,
                correctAnswer = "done"
            ),
            CogQuestion(
                prompt = "type the phrase CLOSE YOUR EYES.",
                type = CogQuestionType.TEXT,
                correctAnswer = "close your eyes"
            ),
            CogQuestion(
                prompt = "Write a sentence (for this test, type: I AM WRITING A SENTENCE).",
                type = CogQuestionType.TEXT,
                correctAnswer = "i am writing a sentence"
            )
        )
    }

    val totalQuestions = questions.size
    val maxRawScore = remember { questions.sumOf { it.maxScore } }  // to normalise to /30

    var currentIndex by remember { mutableStateOf(0) }
    var rawScore by remember { mutableStateOf(0) }

    var textAnswer by remember { mutableStateOf("") }
    var dropdownExpanded by remember { mutableStateOf(false) }
    var selectedOption by remember { mutableStateOf<String?>(null) }

    val currentQuestion = questions[currentIndex]

    fun normalise(s: String): String =
        s.trim().lowercase(Locale.getDefault())

    fun checkAndAdvance() {
        val isCorrect = when (currentQuestion.type) {
            CogQuestionType.INFO -> false
            CogQuestionType.DROPDOWN -> {
                selectedOption != null &&
                        normalise(selectedOption!!) == normalise(currentQuestion.correctAnswer)
            }
            CogQuestionType.TEXT -> {
                normalise(textAnswer) == normalise(currentQuestion.correctAnswer)
            }
        }

        if (isCorrect && currentQuestion.maxScore > 0) {
            rawScore += currentQuestion.maxScore
        }

        if (currentIndex == totalQuestions - 1) {
            val mmseLike = if (maxRawScore > 0) {
                (rawScore.toDouble() / maxRawScore * 30.0)
                    .coerceIn(0.0, 30.0)
                    .roundToInt()
            } else 0

            appVm.cognitiveScore = mmseLike


            navController.navigate("dashboard") {
                popUpTo("dashboard") {inclusive = false }
            }
        } else {
            currentIndex++
            textAnswer = ""
            selectedOption = null
            dropdownExpanded = false
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
                Text(
                    "Cognitive Test",
                    style = MaterialTheme.typography.titleLarge
                )
                Text(
                    "Question ${currentIndex + 1} of $totalQuestions",
                    style = MaterialTheme.typography.bodyMedium
                )

                Spacer(Modifier.height(8.dp))

                Text(
                    currentQuestion.prompt,
                    style = MaterialTheme.typography.bodyLarge
                )

                Spacer(Modifier.height(16.dp))

                when (currentQuestion.type) {
                    CogQuestionType.DROPDOWN -> {
                        ExposedDropdownMenuBox(
                            expanded = dropdownExpanded,
                            onExpandedChange = { dropdownExpanded = !dropdownExpanded }
                        ) {
                            OutlinedTextField(
                                value = selectedOption ?: "Select an answer",
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(
                                        expanded = dropdownExpanded
                                    )
                                },
                                modifier = Modifier
                                    .menuAnchor()
                                    .fillMaxWidth()
                            )
                            ExposedDropdownMenu(
                                expanded = dropdownExpanded,
                                onDismissRequest = { dropdownExpanded = false }
                            ) {
                                currentQuestion.options.forEach { option ->
                                    DropdownMenuItem(
                                        text = { Text(option) },
                                        onClick = {
                                            selectedOption = option
                                            dropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    CogQuestionType.TEXT -> {
                        OutlinedTextField(
                            value = textAnswer,
                            onValueChange = { textAnswer = it },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.Sentences
                            )
                        )
                    }

                    CogQuestionType.INFO -> {

                    }
                }

                Spacer(Modifier.height(8.dp))

                Text(
                    "Current score: $rawScore (will be scaled to /30)",
                    style = MaterialTheme.typography.bodyMedium
                )

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = { checkAndAdvance() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        if (currentIndex == totalQuestions - 1)
                            "Finish Test"
                        else
                            "Next"
                    )
                }
            }
        }
    }
}
