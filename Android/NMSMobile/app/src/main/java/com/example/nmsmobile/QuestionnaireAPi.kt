package com.example.nmsmobile

data class QuestionnaireRequest(
    val age: Int,
    val gender: Int,
    val bmi: Float,
    val physicalActivityLevel: Int,
    val smokingStatus: Int,
    val alcoholConsumption: Int,
    val diabetes: Int,
    val hypertension: Int,
    val cholesterolLevel: Int,
    val familyHistoryAlzheimers: Int,
    val depressionLevel: Int,
    val sleepQuality: Int,
    val dietaryHabits: Int,
    val airPollutionExposure: Int,
    val employmentStatus: Int,
    val maritalStatus: Int,
    val socialEngagementLevel: Int,
    val incomeLevel: Int,
    val stressLevels: Int,
    val livingArea: Int,

    val cognitiveScore: Int? = null,
    val speechTranscript: String? = null
)

data class QuestionnaireResponse(
    val ok: Boolean? = null,
    val where: String? = null
)