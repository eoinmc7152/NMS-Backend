package com.example.nmsmobile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.example.nmsmobile.ui.theme.LightGreen
import com.example.nmsmobile.ui.theme.Navy

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onRegisterClick: () -> Unit
) {
    val context = LocalContext.current

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(LightGreen)
                .align(Alignment.TopCenter)
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(Navy)
                .align(Alignment.BottomCenter)
        )

        Card(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth(0.9f),
            colors = CardDefaults.cardColors(MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(8.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("NeuroMind System", style = MaterialTheme.typography.titleLarge)
                Text("Dementia Risk Assessment", style = MaterialTheme.typography.bodyMedium)

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    modifier = Modifier.fillMaxWidth(),
                    visualTransformation = PasswordVisualTransformation()
                )

                Button(
                    onClick = {
                        if (!AuthManager.hasRegisteredUser(context)) {
                            Toast.makeText(context, "No account found. Please register first.", Toast.LENGTH_SHORT).show()
                            return@Button
                        }

                        val ok = AuthManager.login(context, email, password)
                        if (ok) {
                            Toast.makeText(context, "Login successful", Toast.LENGTH_SHORT).show()
                            onLoginSuccess()
                        } else {
                            Toast.makeText(context, "Invalid email or password", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Navy,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) { Text("Login") }

                TextButton(onClick = onRegisterClick) {
                    Text("Don't have an account? Register")
                }
            }
        }
    }
}
