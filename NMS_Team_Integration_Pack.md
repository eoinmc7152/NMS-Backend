# NMS Backend — Team Integration Pack (Cloud Run)

**Base API URL**
- https://nms-backend-835155720402.europe-west1.run.app

**Health check**
- GET `https://nms-backend-835155720402.europe-west1.run.app/health/`

---

## Authentication (API Key)

Some endpoints require an API key header.

**Header name**
- `X-API-Key`

**API key value**
- Set by the project owner in Cloud Run as the environment variable `API_KEY`.
- Ask the project owner for the current value.

### When is the API key enforced?
- If `API_KEY` is set on the server, protected routes require `X-API-Key`.
- If `API_KEY` is NOT set, those routes are open (no key needed).

---

## Endpoints

### Health
- **GET** `/health/`  
  ✅ Public

### Questionnaire
- **GET** `/patient/questionnaire/`  
  ✅ Public (ping)

- **POST** `/patient/questionnaire/`  
  🔒 Requires `X-API-Key` **if** `API_KEY` is set.

**Request body (JSON)**
```json
{
  "patientId": "patient123",
  "answers": [
    { "q": "age", "value": 45 },
    { "q": "smoker", "value": false }
  ]
}
```

**Response (201 Created)**
```json
{
  "ok": true,
  "resultId": "abc123",
  "patientId": "patient123",
  "risk": { }
}
```
Also returns:
- `Location: /results/<resultId>`

### Results
- **GET** `/results/`  
  ✅ Public  
  Query params:
  - `patientId` (optional)
  - `limit` (optional, default 20, clamped 1..100)
  - `cursorDoc` (optional, for pagination)

Examples:
- `/results/?patientId=patient123`
- `/results/?limit=10`
- `/results/?patientId=patient123&limit=20&cursorDoc=LAST_DOC_ID`

- **GET** `/results/<result_id>`  
  ✅ Public

- **PUT** `/results/<result_id>`  
  🔒 Requires `X-API-Key` **if** `API_KEY` is set.  
  Body: JSON object with fields to update.

- **DELETE** `/results/<result_id>`  
  🔒 Requires `X-API-Key` **if** `API_KEY` is set.

---

## Quick Tests (curl)

### Health
```bash
curl -s https://nms-backend-835155720402.europe-west1.run.app/health/
```

### Questionnaire ping
```bash
curl -s https://nms-backend-835155720402.europe-west1.run.app/patient/questionnaire/
```

### Submit questionnaire (protected)
Replace `YOUR_API_KEY` with the real key:
```bash
curl -i -X POST "https://nms-backend-835155720402.europe-west1.run.app/patient/questionnaire/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "patientId": "patient123",
    "answers": [
      { "q": "age", "value": 45 },
      { "q": "smoker", "value": false }
    ]
  }'
```

### List results
```bash
curl -s "https://nms-backend-835155720402.europe-west1.run.app/results/?patientId=patient123&limit=20"
```

### Get a single result
```bash
curl -s "https://nms-backend-835155720402.europe-west1.run.app/results/RESULT_ID_HERE"
```

---

## Website (HTML/JS) Example

```html
<script>
  const BASE = "https://nms-backend-835155720402.europe-west1.run.app";
  const API_KEY = "YOUR_API_KEY"; // only needed for protected endpoints

  // Health check
  fetch(`${BASE}/health/`)
    .then(r => r.json())
    .then(console.log)
    .catch(console.error);

  // Submit questionnaire (protected)
  const payload = {
    patientId: "patient123",
    answers: [
      { q: "age", value: 45 },
      { q: "smoker", value: false }
    ]
  };

  fetch(`${BASE}/patient/questionnaire/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY
    },
    body: JSON.stringify(payload)
  })
    .then(async (r) => {
      const data = await r.json().catch(() => ({}));
      console.log("status", r.status, data);
    })
    .catch(console.error);
</script>
```

### CORS note (browser only)
If the website gets a **CORS error**, the backend must allow the website origin.
For quick dev, the backend can use `CORS(app)` (allow all). For production, restrict origins.

---

## Android (Retrofit) Example (Kotlin)

### Manifest permission
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### Retrofit setup
```kotlin
private const val BASE_URL = "https://nms-backend-835155720402.europe-west1.run.app/"

val retrofit = Retrofit.Builder()
  .baseUrl(BASE_URL) // must end with /
  .addConverterFactory(GsonConverterFactory.create())
  .build()

val api = retrofit.create(Api::class.java)
```

### API interface
```kotlin
interface Api {
  @GET("health/")
  suspend fun health(): Response<Map<String, Any>>

  @GET("patient/questionnaire/")
  suspend fun questionnairePing(): Response<Map<String, Any>>

  @POST("patient/questionnaire/")
  suspend fun submitQuestionnaire(
    @Header("X-API-Key") apiKey: String,
    @Body body: Map<String, Any>
  ): Response<Map<String, Any>>

  @GET("results/")
  suspend fun listResults(
    @Query("patientId") patientId: String?,
    @Query("limit") limit: Int = 20,
    @Query("cursorDoc") cursorDoc: String? = null
  ): Response<Map<String, Any>>

  @GET("results/{id}")
  suspend fun getResult(@Path("id") id: String): Response<Map<String, Any>>
}
```

### Submit example
```kotlin
val payload = mapOf(
  "patientId" to "patient123",
  "answers" to listOf(
    mapOf("q" to "age", "value" to 45),
    mapOf("q" to "smoker", "value" to false)
  )
)

val response = api.submitQuestionnaire("YOUR_API_KEY", payload)
println(response.code())
println(response.body())
```

---

## Troubleshooting

### 404 Not Found at `/`
- Normal. Use `/health/` or `/patient/questionnaire/`.

### 401 Unauthorized
- Missing/incorrect `X-API-Key` header, **and** server has `API_KEY` set.

### CORS error in browser
- Backend must allow the website origin. (Android is not affected by CORS.)

---

**Owner-only note (do not share publicly):** The API key is stored in Cloud Run as env var `API_KEY`.
