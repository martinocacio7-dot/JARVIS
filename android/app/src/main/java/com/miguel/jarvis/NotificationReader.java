package com.miguel.jarvis;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;

public final class NotificationReader extends NotificationListenerService {
    private static volatile NotificationReader active;
    @Override public void onListenerConnected() { active = this; }
    @Override public void onListenerDisconnected() { active = null; }
    @Override public void onDestroy() { if (active == this) active = null; super.onDestroy(); }
    static String summary() {
        NotificationReader service = active;
        if (service == null) return "Activa el acceso a notificaciones en el menú Permisos de JARVIS. Si ya lo activaste, espera unos segundos y vuelve a preguntar.";
        try {
            StatusBarNotification[] entries = service.getActiveNotifications();
            StringBuilder result = new StringBuilder(); int count = 0;
            for (StatusBarNotification entry : entries) {
                if (entry.getPackageName().equals(service.getPackageName()) || (entry.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) continue;
                if (++count > 5) continue;
                CharSequence title = entry.getNotification().extras.getCharSequence(Notification.EXTRA_TITLE, "Sin título");
                CharSequence text = entry.getNotification().extras.getCharSequence(Notification.EXTRA_TEXT, "");
                String app = entry.getPackageName();
                try { app = service.getPackageManager().getApplicationLabel(service.getPackageManager().getApplicationInfo(app, 0)).toString(); } catch (Exception ignored) {}
                String line = app + ": " + title + ". " + text;
                result.append("\n").append(line.substring(0, Math.min(240, line.length())));
            }
            return count == 0 ? "No tienes notificaciones visibles de otras aplicaciones." : "Tienes " + count + " notificaciones. " + (count > 5 ? "Leo las primeras cinco. " : "") + result;
        } catch (SecurityException error) { return "Android no permite leer tus notificaciones. Revisa el permiso de JARVIS."; }
    }
}
