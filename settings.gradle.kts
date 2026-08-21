pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // NewPipeExtractor no se publica en Maven Central, se distribuye via JitPack.
        maven("https://jitpack.io")
    }
}

rootProject.name = "YTCarPlayer"
include(":app")
