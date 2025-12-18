package com.example.nmsmobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = GreenDark,          // header/footer, main buttons
    onPrimary = Color.White,

    secondary = Navy,
    onSecondary = Color.White,

    background = SoftBlue,
    onBackground = Navy,

    surface = Color.White,
    onSurface = Navy,

    primaryContainer = LightGreen,
    onPrimaryContainer = Navy,

    secondaryContainer = Mint,
    onSecondaryContainer = Navy,

    error = Color(0xFFB3261E),
    onError = Color.White
)

// optional if you ever want dark mode
private val DarkColorScheme = darkColorScheme(
    primary = GreenDark,
    onPrimary = Color.White,
    background = Navy,
    onBackground = Color.White,
    surface = Navy,
    onSurface = Color.White
)

@Composable
fun NMSMobileTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colors,
        typography = Typography,
        content = content
    )
}
