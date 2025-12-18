package com.example.nmsmobile


fun computeMockRisk(
    answers: Map<String, Any>,
    cognitive: Int = 30
): Int {
    val age = (answers["Age"] as? Float ?: 0f).toDouble()
    val bmi = (answers["BMI"] as? Float ?: 0f).toDouble()

    fun intOf(key: String) = (answers[key] as? Int) ?: 0

    val smoking = intOf("Smoking Status")          // 0..2
    val alcohol = intOf("Alcohol Consumption")     // 0..2
    val diabetes = intOf("Diabetes")               // 0/1  (adjust key if your question text changed)
    val hypertension = intOf("Hypertension")       // 0/1
    val cholesterol = intOf("Cholesterol Level")   // 0/1
    val physAct = intOf("Physical Activity Level") // 0..2 (protective)
    val sleep = intOf("Sleep Quality")             // 0..2 (protective)
    val diet = intOf("Dietary Habits")             // 0..2 (protective)
    val stress = intOf("Stress Levels")            // 0..2

    var score = 0.0

    // Age (0..30)
    score += (age.coerceIn(0.0, 100.0) / 100.0) * 30.0

    // BMI risk (0..10) – more risk when > 25
    val bmiRisk = ((bmi - 25.0).coerceAtLeast(0.0) / 20.0)
        .coerceIn(0.0, 1.0) * 10.0
    score += bmiRisk

    score += smoking * 6.0          // 0..12
    score += alcohol * 3.0          // 0..6
    score += diabetes * 8.0         // 0 or 8
    score += hypertension * 8.0     // 0 or 8
    score += cholesterol * 6.0      // 0 or 6
    score += stress * 4.0           // 0..8

    score -= physAct * 2.5          // 0..-5
    score -= sleep * 1.5            // 0..-3
    score -= diet * 2.5             // 0..-5

    val mmse = cognitive.coerceIn(0, 30) // 0 = worst, 30 = best

    val cognitiveComponent = ((30 - mmse) / 30.0) * 35.0  // 0..35
    score += cognitiveComponent

    return score.coerceIn(0.0, 100.0).toInt()
}
