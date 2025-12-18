package com.example.nmsmobile

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.*
import com.example.nmsmobile.ui.theme.LightGreen
import com.example.nmsmobile.ui.theme.Navy

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val appVm: AppViewModel = viewModel()

    val context = LocalContext.current
    val start = remember { if (AuthManager.isLoggedIn(context)) "dashboard" else "login" }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val title = when (currentRoute) {
        "dashboard" -> "Dashboard"
        "questionnaire" -> "Questionnaire"
        "speech" -> "Speech Task"
        "cognitive" -> "Cognitive Test"
        else -> "NeuroMind"
    }

    Scaffold(
        topBar = {
            if (currentRoute != "login" && currentRoute != "register") {
                CenterAlignedTopAppBar(
                    title = { Text(title) },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = LightGreen,
                        titleContentColor = Navy
                    )
                )
            }
        },
        bottomBar = {
            if (currentRoute != "login" && currentRoute != "register") {
                BottomNavBar(navController)
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = start,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("login") {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate("dashboard") {
                            popUpTo("login") { inclusive = true }
                        }
                    },
                    onRegisterClick = { navController.navigate("register") }
                )
            }

            composable("register") {
                RegisterScreen(
                    onRegistered = { navController.popBackStack() },
                    onCancel = { navController.popBackStack() }
                )
            }

            composable("dashboard") { DashboardScreen(navController, appVm) }
            composable("questionnaire") { QuestionnaireScreen(navController, appVm) }
            composable("speech") { SpeechTaskScreen(navController, appVm) }
            composable("cognitive") { CognitiveTestScreen(navController, appVm) }

            composable("riskResult/{score}") { backStackEntry ->
                val score = backStackEntry.arguments?.getString("score")?.toIntOrNull() ?: 0
                RiskResultScreen(navController, score)
            }

            composable("calculating/{score}") { CalculatingScreen(navController, appVm) }
        }
    }
}
