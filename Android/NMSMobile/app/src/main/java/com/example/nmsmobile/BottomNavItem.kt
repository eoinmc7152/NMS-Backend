package com.example.nmsmobile

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.List
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(
    val route: String,
    val icon: ImageVector,
    val label: String
) {
    object Dashboard : BottomNavItem("dashboard", Icons.Default.Home, "Home")
    object Questionnaire : BottomNavItem("questionnaire", Icons.Default.List, "Questionnaire")
    object Speech : BottomNavItem("speech", Icons.Default.Mic, "Speech")
    object Cognitive : BottomNavItem("cognitive", Icons.Default.Psychology, "Cognitive")
}
