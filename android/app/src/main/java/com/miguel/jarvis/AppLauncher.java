package com.miguel.jarvis;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.os.Build;
import android.net.Uri;
import java.util.*;

/** Resolve only installed launcher activities; background opening requires the user's tap. */
final class AppLauncher {
    static String music(Context context,String query,boolean foreground){
        if(query==null||query.trim().isEmpty()||query.length()>140)return "Dime un artista, género o ambiente para buscar música.";
        Uri url=new Uri.Builder().scheme("https").authority("www.youtube.com").path("results").appendQueryParameter("search_query",query+" música").build();
        Intent intent=new Intent(Intent.ACTION_VIEW,url).setPackage("com.google.android.youtube").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if(intent.resolveActivity(context.getPackageManager())==null)intent.setPackage(null);
        if(intent.resolveActivity(context.getPackageManager())==null)return "No encontré YouTube ni un navegador para abrir la búsqueda.";
        try{
            if(foreground){context.startActivity(intent);return "Solicité abrir YouTube con música de «"+query+"». Elige un resultado para reproducir; no he confirmado reproducción automática.";}
            NotificationManager manager=context.getSystemService(NotificationManager.class);
            if(!manager.areNotificationsEnabled()||(Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED))return "Permite las notificaciones de JARVIS o vuelve a la app para abrir YouTube.";
            manager.createNotificationChannel(new NotificationChannel("jarvis_open_apps","Abrir aplicaciones",NotificationManager.IMPORTANCE_DEFAULT));
            if(manager.getNotificationChannel("jarvis_open_apps").getImportance()==NotificationManager.IMPORTANCE_NONE)return "Activa el canal Abrir aplicaciones en los ajustes de notificaciones de JARVIS.";
            PendingIntent tap=PendingIntent.getActivity(context,23,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            manager.notify(23,new Notification.Builder(context,"jarvis_open_apps").setSmallIcon(com.miguel.jarvis.R.drawable.jarvis).setContentTitle("Música en YouTube").setContentText("Toca para buscar «"+query+"» y elegir qué reproducir.").setContentIntent(tap).setAutoCancel(true).build());
            return "Toca la notificación de JARVIS para buscar «"+query+"» en YouTube y elegir una canción. No he confirmado reproducción automática.";
        }catch(RuntimeException error){return "Android no permitió abrir la búsqueda de música.";}
    }
    static String open(Context context,String target,boolean foreground) {
        if(target==null||target.length()>60)return "Dime el nombre de la aplicación que quieres abrir.";
        PackageManager pm=context.getPackageManager();
        List<ResolveInfo> matches=new ArrayList<>();Set<String> packages=new HashSet<>();
        String wanted=DeviceCommands.key(target);
        String alias=wanted.equals("camara")?"camera":wanted.equals("ajustes")?"settings":wanted.equals("mapas")?"maps":wanted.equals("calculadora")?"calculator":wanted;
        for(ResolveInfo info:pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER),0)) {
            String label=DeviceCommands.key(info.loadLabel(pm).toString());
            if((label.equals(wanted)||label.equals(alias))&&packages.add(info.activityInfo.packageName))matches.add(info);
        }
        if(matches.isEmpty())return "No encontré una aplicación instalada con el nombre «"+target+"». Dime su nombre tal como aparece en tu teléfono.";
        if(matches.size()>1)return "Hay varias aplicaciones llamadas «"+target+"». Ábrela desde el teléfono para elegir la correcta.";
        ResolveInfo info=matches.get(0);String label=info.loadLabel(pm).toString();
        Intent launch=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setComponent(new ComponentName(info.activityInfo.packageName,info.activityInfo.name)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            if(foreground){context.startActivity(launch);return "He solicitado abrir "+label+".";}
            NotificationManager manager=context.getSystemService(NotificationManager.class);
            if(!manager.areNotificationsEnabled()||(Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED))return "Para abrir "+label+" desde otra app, permite las notificaciones de JARVIS o vuelve a JARVIS y pídemelo allí.";
            manager.createNotificationChannel(new NotificationChannel("jarvis_open_apps","Abrir aplicaciones",NotificationManager.IMPORTANCE_DEFAULT));
            if(manager.getNotificationChannel("jarvis_open_apps").getImportance()==NotificationManager.IMPORTANCE_NONE)return "Permite el canal Abrir aplicaciones en las notificaciones de JARVIS para abrir "+label+" desde otra app.";
            PendingIntent tap=PendingIntent.getActivity(context,22,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            manager.notify(22,new Notification.Builder(context,"jarvis_open_apps").setSmallIcon(com.miguel.jarvis.R.drawable.jarvis).setContentTitle("Abrir "+label).setContentText("Toca para abrir la aplicación que pediste a JARVIS.").setContentIntent(tap).setAutoCancel(true).build());
            return "Toca la notificación de JARVIS para abrir "+label+". Android requiere ese toque cuando estoy en segundo plano.";
        }catch(RuntimeException error){return "Android no permitió abrir "+label+". No se ha confirmado la apertura.";}
    }
}
