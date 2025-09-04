plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.altrii.recovery"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.altrii.recovery"
    minSdk = 26
    targetSdk = 34
    versionCode = 1
    versionName = "0.1.0"
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
  kotlinOptions { jvmTarget = "17" }
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")

  // QR scanner
  implementation("com.journeyapps:zxing-android-embedded:4.3.0")
  implementation("com.google.zxing:core:3.5.3")

  // Networking + JSON + coroutines
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("org.json:json:20240303")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
