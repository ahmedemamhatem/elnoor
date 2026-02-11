#!/bin/bash

# Mobile POS Android App Build Script
# ====================================

set -e

echo "=============================================="
echo "  Mobile POS Android App Build Script"
echo "=============================================="
echo ""

# Check for required tools
check_requirements() {
    echo "[1/5] Checking requirements..."

    if [ -z "$ANDROID_HOME" ]; then
        echo "ERROR: ANDROID_HOME environment variable is not set"
        echo "Please set it to your Android SDK location"
        echo "Example: export ANDROID_HOME=/path/to/android-sdk"
        exit 1
    fi

    if ! command -v java &> /dev/null; then
        echo "ERROR: Java is not installed"
        exit 1
    fi

    echo "  - ANDROID_HOME: $ANDROID_HOME"
    echo "  - Java: $(java -version 2>&1 | head -n 1)"
    echo "  OK"
    echo ""
}

# Clean previous builds
clean_build() {
    echo "[2/5] Cleaning previous builds..."
    if [ -d "app/build" ]; then
        rm -rf app/build
    fi
    echo "  OK"
    echo ""
}

# Download Gradle wrapper if needed
setup_gradle() {
    echo "[3/5] Setting up Gradle..."

    if [ ! -f "gradlew" ]; then
        echo "  Downloading Gradle wrapper..."
        # Create gradlew script
        cat > gradlew << 'GRADLEW'
#!/bin/bash
GRADLE_VERSION=8.0
GRADLE_DIST_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
GRADLE_HOME="${HOME}/.gradle/wrapper/dists/gradle-${GRADLE_VERSION}"

if [ ! -d "$GRADLE_HOME" ]; then
    echo "Downloading Gradle ${GRADLE_VERSION}..."
    mkdir -p "$GRADLE_HOME"
    curl -L "$GRADLE_DIST_URL" -o "/tmp/gradle.zip"
    unzip -q "/tmp/gradle.zip" -d "$GRADLE_HOME"
    rm "/tmp/gradle.zip"
fi

GRADLE_BIN=$(find "$GRADLE_HOME" -name gradle -type f | head -1)
exec "$GRADLE_BIN" "$@"
GRADLEW
        chmod +x gradlew
    fi

    echo "  OK"
    echo ""
}

# Build the APK
build_apk() {
    BUILD_TYPE=${1:-debug}

    echo "[4/5] Building ${BUILD_TYPE} APK..."
    echo ""

    if [ "$BUILD_TYPE" == "release" ]; then
        ./gradlew assembleRelease --no-daemon
    else
        ./gradlew assembleDebug --no-daemon
    fi

    echo ""
    echo "  OK"
    echo ""
}

# Show result
show_result() {
    BUILD_TYPE=${1:-debug}

    echo "[5/5] Build complete!"
    echo ""
    echo "=============================================="
    echo "  APK Location:"
    echo "=============================================="

    if [ "$BUILD_TYPE" == "release" ]; then
        APK_PATH="app/build/outputs/apk/release/"
    else
        APK_PATH="app/build/outputs/apk/debug/"
    fi

    if [ -d "$APK_PATH" ]; then
        ls -lh ${APK_PATH}*.apk 2>/dev/null || echo "  No APK found"
    else
        echo "  Build directory not found: $APK_PATH"
    fi

    echo ""
    echo "=============================================="
    echo "  Installation:"
    echo "=============================================="
    echo "  adb install -r ${APK_PATH}MobilePOS_*.apk"
    echo ""
}

# Main
main() {
    BUILD_TYPE=${1:-debug}

    check_requirements
    clean_build
    setup_gradle
    build_apk $BUILD_TYPE
    show_result $BUILD_TYPE
}

# Parse arguments
case "$1" in
    release)
        main release
        ;;
    debug|"")
        main debug
        ;;
    clean)
        echo "Cleaning build files..."
        rm -rf app/build .gradle build
        echo "Done."
        ;;
    help|--help|-h)
        echo "Usage: ./build.sh [command]"
        echo ""
        echo "Commands:"
        echo "  debug    Build debug APK (default)"
        echo "  release  Build release APK"
        echo "  clean    Remove build files"
        echo "  help     Show this help"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run './build.sh help' for usage"
        exit 1
        ;;
esac
