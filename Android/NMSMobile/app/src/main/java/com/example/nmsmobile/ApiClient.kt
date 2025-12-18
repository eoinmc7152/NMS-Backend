package com.example.nmsmobile

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.Response

interface NmsApiService {

    @POST("patient/questionnaire/")
    suspend fun submitQuestionnaire(
        @Header("X-API-Key") apiKey: String,
        @Body body: SubmitQuestionnaireRequest
    ): Response<SubmitQuestionnaireResponse>
}

object NmsApiClient {

    private const val BASE_URL =
        "https://nms-backend-835155720402.europe-west1.run.app/"

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .build()

    val api: NmsApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NmsApiService::class.java)
    }
}
