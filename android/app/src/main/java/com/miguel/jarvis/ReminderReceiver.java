package com.miguel.jarvis;
import android.app.*;
import android.content.*;
import android.os.Build;
import android.content.pm.PackageManager;

public final class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel("reminders","Recordatorios de JARVIS",NotificationManager.IMPORTANCE_HIGH));
        if (Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return;
        String text=intent.getStringExtra("text"); if (text==null) return;
        PendingIntent open=PendingIntent.getActivity(context,0,new Intent(context,MainActivity.class),PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification=new Notification.Builder(context,"reminders").setSmallIcon(com.miguel.jarvis.R.drawable.jarvis).setContentTitle("JARVIS · Recordatorio").setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(open).setAutoCancel(true).build();
        manager.notify(intent.getDataString(),1,notification);
    }
}
