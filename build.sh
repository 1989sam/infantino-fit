#!/bin/bash
# Compile Infantino-Fit sans Gradle : aapt + javac + dx + zipalign + apksigner
set -e
cd "$(dirname "$0")"
SDK=/usr/lib/android-sdk/platforms/android-23/android.jar
[ -f "$SDK" ] || SDK=$(ls /usr/lib/android-sdk/platforms/*/android.jar | head -1)
rm -rf build && mkdir -p build/gen build/classes
aapt package -f -m -J build/gen -M AndroidManifest.xml -S res -I "$SDK"
javac -nowarn --release 8 -encoding UTF-8 -cp "$SDK" -d build/classes $(find src build/gen -name '*.java') 2>&1 | grep -v 'bootstrap\|obsolete\|^warning\|^3 warnings\|^1 warning' || true
dalvik-exchange --dex --min-sdk-version=24 --output=build/classes.dex build/classes
aapt package -f -M AndroidManifest.xml -S res -A assets -I "$SDK" -0 webp -0 png -F build/unsigned.apk
(cd build && cp classes.dex classes.dex.tmp && mv classes.dex.tmp classes.dex && aapt add unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 build/unsigned.apk build/aligned.apk
[ -f keystore.jks ] || keytool -genkeypair -keystore keystore.jks -storepass infantino -keypass infantino \
  -alias infantino -keyalg RSA -keysize 2048 -validity 20000 -dname "CN=Samuel Infantino, O=Infantino, C=BE" 2>/dev/null
apksigner sign --ks keystore.jks --ks-pass pass:infantino --key-pass pass:infantino --ks-key-alias infantino \
  --out build/infantino-fit.apk build/aligned.apk
apksigner verify build/infantino-fit.apk && ls -la build/infantino-fit.apk
