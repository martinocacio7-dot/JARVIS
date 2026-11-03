package com.miguel.jarvis;
import android.app.*;
import android.content.*;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.*;
import java.util.*;

/** Explicit opt-in. Reads current counts on request; no text, database or network. */
public final class NotificationReader extends NotificationListenerService {
    private static volatile NotificationReader connected;
    @Override public void onListenerConnected(){connected=this;}
    @Override public void onListenerDisconnected(){if(connected==this)connected=null;}
    @Override public void onDestroy(){if(connected==this)connected=null;super.onDestroy();}
    static boolean allowed(Context context){
        ComponentName component=new ComponentName(context,NotificationReader.class);
        if(Build.VERSION.SDK_INT>=27)return context.getSystemService(NotificationManager.class).isNotificationListenerAccessGranted(component);
        String enabled=Settings.Secure.getString(context.getContentResolver(),"enabled_notification_listeners");
        if(enabled!=null)for(String value:enabled.split(":"))if(component.equals(ComponentName.unflattenFromString(value)))return true;
        return false;
    }
    static String summary(Context context){
        if(!allowed(context))return "Para resumir avisos, abre JARVIS → Permisos → Resumen de notificaciones y autoriza el acceso en Android. Es opcional.";
        NotificationReader service=connected;
        if(service==null)return "El acceso está autorizado, pero Android todavía no conectó el lector de notificaciones. Espera unos segundos y vuelve a preguntar.";
        try{
            StatusBarNotification[] active=service.getActiveNotifications();
            if(active==null)return "Android no devolvió las notificaciones. Vuelve a preguntar cuando el lector esté conectado.";
            List<NotificationCounts.Entry> entries=new ArrayList<>();
            for(StatusBarNotification sbn:active){
                Notification n=sbn.getNotification();String pkg=sbn.getPackageName();
                boolean exclude=pkg.equals(context.getPackageName())||(n.flags&(Notification.FLAG_ONGOING_EVENT|Notification.FLAG_GROUP_SUMMARY))!=0;
                if(exclude)continue;
                String label=pkg;
                try{label=context.getPackageManager().getApplicationLabel(context.getPackageManager().getApplicationInfo(pkg,0)).toString();}catch(Exception ignored){
                    if(pkg.equals("com.android.chrome"))label="Chrome";
                    if(pkg.equals("com.whatsapp"))label="WhatsApp";
                }
                entries.add(new NotificationCounts.Entry(label,false));
            }
            return NotificationCounts.summarize(entries);
        }catch(SecurityException error){return "Android retiró el acceso a las notificaciones. Revisa el permiso de JARVIS.";}
        catch(RuntimeException error){return "No pude consultar las notificaciones. No he confirmado ningún número.";}
    }
}
