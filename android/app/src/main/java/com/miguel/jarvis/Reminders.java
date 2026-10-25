package com.miguel.jarvis;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.content.pm.PackageManager;
import org.json.*;
import java.time.Instant;

final class Reminders {
    static PendingIntent pending(Context context, String id, String text) {
        Intent intent = new Intent(context, ReminderReceiver.class).setData(Uri.parse("jarvis://reminder/" + Uri.encode(id))).putExtra("text", text);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static String sync(Context context, String json) throws Exception {
        JSONArray next = new JSONArray(json);
        if (next.length() > 200) throw new IllegalArgumentException("Demasiados recordatorios");
        // Validate completely before replacing any scheduled alarm.
        for (int i=0;i<next.length();i++) {
            JSONObject item=next.getJSONObject(i);
            if (!item.getString("id").matches("[a-zA-Z0-9-]{1,80}") || item.getString("text").length()>300) throw new IllegalArgumentException("Recordatorio inválido");
            if ("reminder".equals(item.getString("kind"))) Instant.parse(item.getString("dueAt"));
            item.getBoolean("completed");
        }
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        JSONArray previous = new JSONArray(context.getSharedPreferences("reminders", 0).getString("items", "[]"));
        for (int i=0;i<previous.length();i++) { JSONObject item=previous.getJSONObject(i); alarms.cancel(pending(context,item.getString("id"),"")); }
        context.getSharedPreferences("reminders", 0).edit().putString("items", json).apply();
        int count=0; boolean exact=Build.VERSION.SDK_INT<31 || alarms.canScheduleExactAlarms();
        for (int i=0;i<next.length();i++) {
            JSONObject item=next.getJSONObject(i);
            if (!"reminder".equals(item.getString("kind")) || item.getBoolean("completed")) continue;
            long when=Instant.parse(item.getString("dueAt")).toEpochMilli(); if (when<=System.currentTimeMillis()) continue;
            PendingIntent alarm=pending(context,item.getString("id"),item.getString("text"));
            try {
                if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,alarm);
                else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,alarm);
            } catch (SecurityException error) { exact=false; alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,alarm); }
            count++;
        }
        if (count>0 && !context.getSystemService(NotificationManager.class).areNotificationsEnabled()) return "Recordatorios guardados, pero las notificaciones de JARVIS están bloqueadas. Actívalas en Permisos.";
        if (count==0) return "Agenda sincronizada en Android.";
        if (Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return "Recordatorios guardados, pero falta permitir las notificaciones de JARVIS en Permisos para ver los avisos.";
        return count + (exact ? " avisos programados en Android." : " avisos aproximados programados. Para la hora exacta activa Alarmas y recordatorios en Permisos.");
    }
    static void restore(Context context) {
        try { sync(context,context.getSharedPreferences("reminders",0).getString("items","[]")); } catch (Exception ignored) {}
    }
}
