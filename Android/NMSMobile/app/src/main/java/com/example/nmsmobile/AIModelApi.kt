package com.example.nmsmobile

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST


data class AIDataRequest(val data: List<Number>)
data class AIDataResponse(@SerializedName("alzheimers_risk")
val alzheimersRisk: Float? )

data class AISpeechRequest(val text: String)
data class AISpeechResponse(@SerializedName("diagnosis")
val diagnosis: String?)


interface AIModelApi {

    @POST("submit_data")
    suspend fun submitData(
        @Body body: AIDataRequest
    ): Response<AIDataResponse>

    @POST("submit_speech")
    suspend fun submitSpeech(
        @Body body: AISpeechRequest
    ): Response<AISpeechResponse>
}
