package com.miguel.jarvis;
import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
final class PhoneReminders {
    static String save(Context context,PhoneReminder reminder)throws Exception{
        if(reminder.text.isEmpty()||reminder.text.length()>300||reminder.time==null)return "¿Qué debo recordarte y cuándo? Por ejemplo: recuérdame tomar agua en cinco minutos, o recuérdame estudiar mañana a las nueve.";
        JSONArray items=new JSONArray(context.getSharedPreferences("mobile_reminders",0).getString("items","[]"));
        if(items.length()>=200)return "Tienes 200 recordatorios locales. Revisa tu agenda antes de añadir otro.";
        JSONObject entry=new JSONObject().put("id",UUID.randomUUID().toString()).put("text",reminder.text).put("dueAt",reminder.time.toInstant().toString());
        items.put(entry);if(!context.getSharedPreferences("mobile_reminders",0).edit().putString("items",items.toString()).commit())return "No pude confirmar el guardado del recordatorio en el teléfono.";
        String scheduled=schedule(context,entry);
        return "Guardé «"+reminder.text+"» para "+reminder.time.format(DateTimeFormatter.ofPattern("EEEE d MMMM, HH:mm",new Locale("es")))+" en la zona horaria del teléfono. "+scheduled;
    }
    static String schedule(Context context,JSONObject item)throws Exception{
        AlarmManager alarms=context.getSystemService(AlarmManager.class);long due=Instant.parse(item.getString("dueAt")).toEpochMilli();if(due<=System.currentTimeMillis())return "";
        PendingIntent pending=Reminders.pending(context,item.getString("id"),item.getString("text"));boolean exact=Build.VERSION.SDK_INT<31||alarms.canScheduleExactAlarms();
        try{if(exact)alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,pending);else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,pending);}catch(SecurityException error){alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,pending);exact=false;}
        if(!context.getSystemService(NotificationManager.class).areNotificationsEnabled())return "El aviso está bloqueado: permite las notificaciones de JARVIS.";
        return exact?"Aviso programado en Android.":"Aviso aproximado: permite Alarmas y recordatorios para la hora exacta.";
    }
    static void restore(Context context){try{JSONArray items=new JSONArray(context.getSharedPreferences("mobile_reminders",0).getString("items","[]"));for(int i=0;i<items.length();i++)schedule(context,items.getJSONObject(i));}catch(Exception ignored){}}
    static String list(Context context)throws Exception{JSONArray items=new JSONArray(context.getSharedPreferences("mobile_reminders",0).getString("items","[]"));List<String> out=new ArrayList<>();for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(Instant.parse(item.getString("dueAt")).isAfter(Instant.now()))out.add(item.getString("text")+" — "+Instant.parse(item.getString("dueAt")).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("d MMM, HH:mm",new Locale("es"))));}return out.isEmpty()?"No tienes recordatorios locales pendientes.":"Recordatorios de este teléfono:\n"+String.join("\n",out.subList(0,Math.min(10,out.size())));}
}
