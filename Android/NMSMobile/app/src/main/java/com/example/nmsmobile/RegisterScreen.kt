package com.example.nmsmobile

import android.util.Patterns
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

@Composable
fun RegisterScreen(
    onRegistered: () -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current

    var name by remember { mutableStateOf("") } // kept for UI (optional)
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(0.9f),
            colors = CardDefaults.cardColors(MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(6.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Create Account", style = MaterialTheme.typography.headlineSmall)

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Full Name") },
                    modifier = Modifier.fillMaxWidth()
                )

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
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = confirm,
                    onValueChange = { confirm = it },
                    label = { Text("Confirm Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )

                Button(
                    onClick = {
                        val e = email.trim()
                        when {
                            name.isBlank() || e.isBlank() || password.isBlank() || confirm.isBlank() ->
                                Toast.makeText(context, "Please fill in all fields", Toast.LENGTH_SHORT).show()

                            !Patterns.EMAIL_ADDRESS.matcher(e).matches() ->
                                Toast.makeText(context, "Please enter a valid email", Toast.LENGTH_SHORT).show()

                            password.length < 6 ->
                                Toast.makeText(context, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()

                            password != confirm ->
                                Toast.makeText(context, "Passwords do not match", Toast.LENGTH_SHORT).show()

                            else -> {
                                AuthManager.register(context, e, password)
                                Toast.makeText(context, "Account created! Please log in.", Toast.LENGTH_SHORT).show()
                                onRegistered()
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Create Account") }

                TextButton(onClick = onCancel) { Text("Back to Login") }
            }
        }
    }
}
