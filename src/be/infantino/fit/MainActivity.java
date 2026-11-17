package be.infantino.fit;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.media.AudioManager;
import android.media.ToneGenerator;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;

public class MainActivity extends Activity {
    private static final int REQ_EXPORT = 11;
    private static final int REQ_IMPORT = 12;
    private static final int REQ_FILE = 13;

    private WebView web;
    private String pendingExport;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 21) {
            w.setStatusBarColor(Color.parseColor("#0e0f13"));
            w.setNavigationBarColor(Color.parseColor("#0e0f13"));
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0e0f13"));
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith("file:")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                try { startActivityForResult(Intent.createChooser(i, "Choisir une photo"), REQ_FILE); }
                catch (Exception e) { fileCallback = null; return false; }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        if (Build.VERSION.SDK_INT >= 33) {
            try { requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1); } catch (Exception e) { }
        }
        web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.handleBack?window.handleBack():false", new ValueCallback<String>() {
            public void onReceiveValue(String v) {
                if (!"true".equals(v)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.onAppPause&&window.onAppPause()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.evaluateJavascript("window.onAppResume&&window.onAppResume()", null);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_FILE) {
            if (fileCallback != null) {
                Uri[] r = null;
                if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
                fileCallback.onReceiveValue(r);
                fileCallback = null;
            }
            return;
        }
        if (res != RESULT_OK || data == null || data.getData() == null) { pendingExport = null; return; }
        Uri uri = data.getData();
        if (req == REQ_EXPORT && pendingExport != null) {
            try {
                OutputStream os = getContentResolver().openOutputStream(uri, "wt");
                os.write(pendingExport.getBytes("UTF-8"));
                os.close();
                js("window.toast&&toast('Fichier enregistré ✔')");
            } catch (Exception e) {
                js("window.toast&&toast('Erreur export')");
            }
            pendingExport = null;
        } else if (req == REQ_IMPORT) {
            try {
                InputStream is = getContentResolver().openInputStream(uri);
                String txt = readAll(is);
                js("window.onImport&&window.onImport(" + quote(txt) + ")");
            } catch (Exception e) {
                js("window.toast&&toast('Erreur import')");
            }
        }
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() { public void run() { web.evaluateJavascript(code, null); } });
    }

    static String readAll(InputStream is) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
        is.close();
        return bo.toString("UTF-8");
    }

    static String quote(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 16);
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                case ' ': sb.append("\\u2028"); break;
                case ' ': sb.append("\\u2029"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c);
            }
        }
        sb.append('"');
        return sb.toString();
    }

    private PendingIntent alarmIntent() {
        Intent i = new Intent(this, AlarmReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(this, 42, i, flags);
    }

    class Bridge {
        @JavascriptInterface
        public void saveData(String json) {
            try {
                File tmp = new File(getFilesDir(), "data.json.tmp");
                FileOutputStream fo = new FileOutputStream(tmp);
                fo.write(json.getBytes("UTF-8"));
                fo.getFD().sync();
                fo.close();
                tmp.renameTo(new File(getFilesDir(), "data.json"));
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public String loadData() {
            try {
                File f = new File(getFilesDir(), "data.json");
                if (!f.exists()) return "";
                return readAll(new FileInputStream(f));
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public void exportFile(String name, String mime, String content) {
            pendingExport = content;
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType(mime);
            i.putExtra(Intent.EXTRA_TITLE, name);
            startActivityForResult(i, REQ_EXPORT);
        }

        @JavascriptInterface
        public void importFile() {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            startActivityForResult(i, REQ_IMPORT);
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, title));
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try { ((Vibrator) getSystemService(Context.VIBRATOR_SERVICE)).vibrate(new long[]{0, ms, 150, ms}, -1); } catch (Exception e) { }
        }

        @JavascriptInterface
        public void beep() {
            try {
                final ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100);
                tg.startTone(ToneGenerator.TONE_PROP_BEEP2, 600);
                web.postDelayed(new Runnable() { public void run() { tg.release(); } }, 1200);
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        @JavascriptInterface
        public void scheduleAlarm(double epochMs, String title, String text) {
            try {
                getSharedPreferences("alarm", 0).edit().putString("title", title).putString("text", text).apply();
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                PendingIntent pi = alarmIntent();
                long t = (long) epochMs;
                boolean exact = true;
                if (Build.VERSION.SDK_INT >= 31) {
                    try {
                        Method m = AlarmManager.class.getMethod("canScheduleExactAlarms");
                        exact = (Boolean) m.invoke(am);
                    } catch (Exception e) { exact = false; }
                }
                if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void cancelAlarm() {
            try {
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                am.cancel(alarmIntent());
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public String version() { return "1.0"; }
    }
}
