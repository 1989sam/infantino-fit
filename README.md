# Infantino-Fit 1.0

Application Android de suivi musculation (hors ligne), style Hevy.

## Contenu
- `assets/www/` : l'application (HTML/CSS/JS) — `app.js` (logique), `program.js` (programme J1–J5), `db.js` (873 exercices)
- `src/` : code Android (WebView, sauvegarde fichier, export/import, vibration, alarme de fin de repos)
- `keystore.jks` : clé de signature (mot de passe : infantino). **À conserver** : sans elle, une mise à jour
  oblige à désinstaller l'app (et donc à restaurer une sauvegarde .json).
- `tools/` : génération de la base d'exercices et du logo

## Recompiler (Ubuntu)
    sudo apt install dalvik-exchange aapt apksigner zipalign android-sdk-platform-23 webp librsvg2-bin
    git clone --depth 1 https://github.com/yuhonas/free-exercise-db
    # photos : convertir free-exercise-db/exercises/*/*.jpg en assets/www/img/<id>/<n>.webp (360 px)
    python3 tools/build_db.py free-exercise-db assets/www/db.js
    ./build.sh   # -> build/infantino-fit.apk

Photos et descriptions : Free Exercise DB (domaine public / Unlicense).
