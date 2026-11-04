package com.miguel.jarvis;
import android.content.Context;
/** This edition deliberately has no notification listener or special access. */
final class NotificationReader {
    private NotificationReader() {}
    static String read(Context context,boolean contents){return summary(context);}
    static String summary(Context context){return "Esta edición no accede a las notificaciones de otras aplicaciones. Conserva los avisos de tus recordatorios locales.";}
}
