package be.infantino.fit;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Vibrator;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

/** Fin du temps de repos alors que l'app est en arrière-plan : vibration + son + notification. */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String CH = "repos";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        try {
            ((Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE)).vibrate(new long[]{0, 500, 200, 500, 200, 500}, -1);
        } catch (Exception e) { }
        try {
            Ringtone r = RingtoneManager.getRingtone(ctx, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
            if (r != null) r.play();
        } catch (Exception e) { }
        try {
            SharedPreferences p = ctx.getSharedPreferences("alarm", 0);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            Notification.Builder nb;
            if (Build.VERSION.SDK_INT >= 26) {
                Class<?> chC = Class.forName("android.app.NotificationChannel");
                Constructor<?> c = chC.getConstructor(String.class, CharSequence.class, int.class);
                Object ch = c.newInstance(CH, "Minuteur de repos", 4);
                NotificationManager.class.getMethod("createNotificationChannel", chC).invoke(nm, ch);
                nb = Notification.Builder.class.getConstructor(Context.class, String.class).newInstance(ctx, CH);
            } else {
                nb = new Notification.Builder(ctx);
                nb.setPriority(Notification.PRIORITY_HIGH);
            }
            Intent open = new Intent(ctx, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            int fl = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 23) fl |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, fl);
            nb.setSmallIcon(R.drawable.ic_notif)
              .setContentTitle(p.getString("title", "Repos terminé"))
              .setContentText(p.getString("text", "Série suivante !"))
              .setAutoCancel(true)
              .setContentIntent(pi);
            nm.notify(7, nb.build());
        } catch (Exception e) { }
    }
}
