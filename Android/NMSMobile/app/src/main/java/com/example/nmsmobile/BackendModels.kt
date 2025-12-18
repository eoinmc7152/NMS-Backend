package com.example.nmsmobile

data class AnswerItem(
    val q: String,
    val value: Any
)

data class SubmitQuestionnaireRequest(
    val patientId: String,
    val patientName: String? = null,
    val answers: List<AnswerItem>,
    val notes: List<String>? = null
)

data class SubmitQuestionnaireResponse(
    val ok: Boolean? = null,
    val resultId: String? = null,
    val patientId: String? = null,
    val risk: Any? = null
)
