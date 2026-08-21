plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.fprimomo.ytcar"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.fprimomo.ytcar"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")

    // Android Auto: Car App Library. La categoria "navigation" es la unica que
    // recibe una Surface de dibujo libre (pensada para mapas); la reutilizamos
    // para pintar el video. Ver README para el disclaimer completo.
    implementation("androidx.car.app:app:1.4.0")

    // Reproduccion de video/audio
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")

    // Buscador y extraccion de streams de YouTube sin API key oficial
    implementation("com.github.TeamNewPipe:NewPipeExtractor:v0.24.4")

    // HTTP client usado por el Downloader del extractor
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Miniaturas en la lista de resultados (telefono)
    implementation("io.coil-kt:coil:2.6.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
