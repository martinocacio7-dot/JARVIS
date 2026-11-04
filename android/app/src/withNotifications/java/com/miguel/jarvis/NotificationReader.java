package com.miguel.jarvis;
import android.app.*;
import android.content.*;
import android.os.*;
import android.provider.Settings;
import android.service.notification.*;
import java.util.*;
/** Optional edition: query current notifications only on a user's request. No storage/network. */
public final class NotificationReader extends NotificationListenerService {
    private static volatile NotificationReader connected;
    @Override public void onListenerConnected(){connected=this;}
    @Override public void onListenerDisconnected(){if(connected==this)connected=null;}
    @Override public void onDestroy(){if(connected==this)connected=null;super.onDestroy();}
    static boolean allowed(Context c){ComponentName name=new ComponentName(c,NotificationReader.class);if(Build.VERSION.SDK_INT>=27)return c.getSystemService(NotificationManager.class).isNotificationListenerAccessGranted(name);String enabled=Settings.Secure.getString(c.getContentResolver(),"enabled_notification_listeners");if(enabled!=null)for(String part:enabled.split(":"))if(name.equals(ComponentName.unflattenFromString(part)))return true;return false;}
    static String summary(Context c){return read(c,false);}
    static String read(Context c,boolean contents){
        if(!allowed(c))return "Autoriza el lector opcional en Permisos → Notificaciones de otras apps. Android debe conceder ese acceso; puedo guiarte, no activarlo por mi cuenta.";
        NotificationReader service=connected;if(service==null)return "El lector todavía no está conectado. Espera unos segundos y vuelve a preguntar.";
        try{StatusBarNotification[] active=service.getActiveNotifications();if(active==null)return "Android no devolvió los avisos; no he confirmado ningún número.";Arrays.sort(active,(a,b)->Long.compare(b.getPostTime(),a.getPostTime()));List<NotificationCounts.Entry> entries=new ArrayList<>();
            for(StatusBarNotification item:active){Notification n=item.getNotification();String pkg=item.getPackageName();if(pkg.equals(c.getPackageName())||(n.flags&(Notification.FLAG_ONGOING_EVENT|Notification.FLAG_GROUP_SUMMARY))!=0)continue;String label=pkg;try{label=c.getPackageManager().getApplicationLabel(c.getPackageManager().getApplicationInfo(pkg,0)).toString();}catch(Exception ignored){if(pkg.equals("com.whatsapp"))label="WhatsApp";else if(pkg.equals("com.android.chrome"))label="Chrome";}String title="",text="";if(contents&&n.extras!=null){CharSequence t=n.extras.getCharSequence(Notification.EXTRA_TITLE),v=n.extras.getCharSequence(Notification.EXTRA_TEXT);title=t==null?"":t.toString();text=v==null?"":v.toString();}entries.add(new NotificationCounts.Entry(label,false,title,text));}
            return contents?NotificationCounts.readContents(entries):NotificationCounts.summarize(entries);
        }catch(SecurityException error){return "Android retiró el acceso a los avisos. Revisa el permiso del lector opcional.";}catch(RuntimeException error){return "No pude consultar los avisos; no he confirmado su contenido.";}
    }
}
