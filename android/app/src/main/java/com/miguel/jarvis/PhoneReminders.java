package com.miguel.jarvis;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
final class PhoneReminders {
    static JSONArray read(Context c)throws JSONException{return new JSONArray(c.getSharedPreferences("mobile_reminders",0).getString("items","[]"));}
    static boolean write(Context c,JSONArray items){return c.getSharedPreferences("mobile_reminders",0).edit().putString("items",items.toString()).commit();}
    static JSONObject find(JSONArray items,String id)throws JSONException{for(int i=0;i<items.length();i++)if(items.getJSONObject(i).optString("id").equals(id))return items.getJSONObject(i);return null;}
    static int maximum(Context c){int n=c.getSharedPreferences("mobile_reminders",0).getInt("followups",-1);return n==6||n==12||n==-1?n:-1;}
    static PendingIntent intent(Context c,String id,String action,long due){Intent i=new Intent(c,PhoneReminderReceiver.class).setAction(action).setData(Uri.parse("jarvis://phone-reminder/"+Uri.encode(id)+"/"+action)).putExtra("id",id).putExtra("due",due);return PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void cancel(Context c,String id){AlarmManager alarms=c.getSystemService(AlarmManager.class);alarms.cancel(intent(c,id,"deliver",0));alarms.cancel(Reminders.pending(c,id,""));c.getSystemService(NotificationManager.class).cancel("phone-"+id,1);}
    static synchronized String save(Context c,PhoneReminder r)throws Exception{
        if(r.text.isEmpty()||r.text.length()>300||r.time==null)return "¿Qué debo recordarte y cuándo? Por ejemplo: recuérdame lavar los platos a las ocho de la noche.";
        JSONArray previous=read(c),items=new JSONArray();for(int i=0;i<previous.length();i++)if(!previous.getJSONObject(i).optBoolean("completed"))items.put(previous.getJSONObject(i));if(items.length()>=200)return "Tienes 200 recordatorios locales. No he añadido otro.";
        JSONObject entry=new JSONObject().put("id",UUID.randomUUID().toString()).put("text",r.text).put("dueAt",r.time.toInstant().toString()).put("pending",true).put("completed",false).put("remaining",maximum(c));items.put(entry);
        if(!write(c,items))return "No pude confirmar el guardado del recordatorio en el teléfono.";
        String result;try{result=schedule(c,entry);}catch(Exception error){result="El dato quedó guardado, pero no pude programar el aviso en Android. Revisa las alarmas y notificaciones.";}
        return "Señor, le recordaré «"+r.text+"» el "+r.time.format(DateTimeFormatter.ofPattern("EEEE d MMMM, HH:mm",new Locale("es")))+". Repetiré cada cinco minutos "+(maximum(c)<0?"hasta que marque Hecho o Detener.":maximum(c)==12?"durante hasta una hora, salvo que marque Hecho o Detener.":"durante hasta treinta minutos, salvo que marque Hecho o Detener.")+" "+result;
    }
    static String schedule(Context c,JSONObject item)throws Exception{
        if(item.optBoolean("completed")||!item.optBoolean("pending",true))return "";long due=Instant.parse(item.getString("dueAt")).toEpochMilli();if(due<=System.currentTimeMillis())return "";
        AlarmManager alarms=c.getSystemService(AlarmManager.class);alarms.cancel(Reminders.pending(c,item.getString("id"),""));PendingIntent p=intent(c,item.getString("id"),"deliver",due);boolean exact=Build.VERSION.SDK_INT<31||alarms.canScheduleExactAlarms();
        try{if(exact)alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,p);else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,p);}catch(SecurityException error){exact=false;alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,due,p);}
        if(!c.getSystemService(NotificationManager.class).areNotificationsEnabled())return "Permite las notificaciones de JARVIS para ver los avisos.";
        return exact?"Aviso programado en Android.":"Aviso aproximado: activa Alarmas exactas en Permisos para la hora solicitada.";
    }
    static synchronized String change(Context c,String id,String action)throws Exception{
        JSONArray items=read(c);JSONObject item=find(items,id);if(item==null)return "No encontré ese recordatorio.";
        if(item.optBoolean("completed"))return "Ese recordatorio ya está marcado como hecho.";
        ReminderFollowUpPolicy.change(item,action,System.currentTimeMillis(),maximum(c));
        if(!write(c,items))return "No pude confirmar el cambio del recordatorio.";cancel(c,id);if(c.getSharedPreferences("mobile_reminders",0).getString("active","").equals(id))c.getSharedPreferences("mobile_reminders",0).edit().remove("active").remove("active_until").apply();
        if(action.equals("snooze")){schedule(c,item);return "De acuerdo, señor. Volveré a recordárselo dentro de cinco minutos.";}
        return action.equals("done")?"Listo, señor. Marqué «"+item.getString("text")+"» como hecho y detuve sus avisos.":"Detuve los avisos de «"+item.getString("text")+"». La tarea sigue pendiente.";
    }
    static synchronized String namedAction(Context c,String text)throws Exception{
        String key=DeviceCommands.key(text);java.util.regex.Matcher done=java.util.regex.Pattern.compile("^(?:marca|completa) (.+?)(?: como hecho)?$").matcher(key),stop=java.util.regex.Pattern.compile("^(?:cancela|deten) (?:el recordatorio de |los avisos de )?(.+)$").matcher(key);
        String target,action;if(done.matches()){target=done.group(1);action="done";}else if(stop.matches()){target=stop.group(1);action="stop";}else return null;
        JSONArray items=read(c);JSONObject selected=null;for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(!item.optBoolean("completed")&&DeviceCommands.key(item.getString("text")).equals(target)){if(selected!=null)return "Hay varios recordatorios con ese nombre. Usa los botones de la notificación para elegir uno.";selected=item;}}
        return selected==null?"No encontré un recordatorio con ese nombre exacto. Puedes consultar mis recordatorios.":change(c,selected.getString("id"),action);
    }
    static synchronized String followUp(Context c,String text)throws Exception{
        android.content.SharedPreferences prefs=c.getSharedPreferences("mobile_reminders",0);String active=prefs.getString("active","");String response=ReminderFollowUpPolicy.response(text);
        if(active.isEmpty()||!ReminderFollowUpPolicy.canAnswer(System.currentTimeMillis(),prefs.getLong("active_until",0)))return null;
        if(!response.isEmpty())return change(c,active,response);
        if(DeviceCommands.key(text).matches("si|no"))return "Para confirmar el recordatorio diga ya lo hice, o todavía no para aplazarlo cinco minutos. También puede usar los botones del aviso.";
        prefs.edit().remove("active").remove("active_until").apply();return null;
    }
    static synchronized String deliver(Context c,String id,long expected)throws Exception{
        JSONArray items=read(c);JSONObject item=find(items,id);if(item==null||!ReminderFollowUpPolicy.deliver(item,expected,System.currentTimeMillis()))return null;
        if(!write(c,items))return null;if(item.optBoolean("pending"))schedule(c,item);
        c.getSharedPreferences("mobile_reminders",0).edit().putString("active",id).putLong("active_until",System.currentTimeMillis()+ReminderFollowUpPolicy.REPLY_WINDOW_MS).apply();
        NotificationManager manager=c.getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel("reminders","Recordatorios de JARVIS",NotificationManager.IMPORTANCE_HIGH));
        String prompt="Señor, le recuerdo que debe "+item.getString("text")+". ¿Ya lo hizo o todavía no?";
        Notification.Builder notification=new Notification.Builder(c,"reminders").setSmallIcon(com.miguel.jarvis.R.drawable.jarvis).setContentTitle("JARVIS · Recordatorio").setContentText(prompt).setStyle(new Notification.BigTextStyle().bigText(prompt+(item.optBoolean("pending")?" Volveré a avisar en cinco minutos si no confirma.":" Terminó el seguimiento automático; la tarea sigue pendiente."))).setContentIntent(PendingIntent.getActivity(c,0,new Intent(c,NativeChatActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)).setAutoCancel(false);
        String[] actions={"done","snooze","stop"},labels={"Hecho","En 5 minutos","Detener"};for(int i=0;i<actions.length;i++)notification.addAction(new Notification.Action.Builder(null,labels[i],intent(c,id,actions[i],0)).build());
        if(manager.areNotificationsEnabled())manager.notify("phone-"+id,1,notification.build());return prompt;
    }
    static synchronized void restore(Context c){try{JSONArray items=read(c);boolean changed=false;for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(item.optBoolean("completed")||!item.optBoolean("pending",true))continue;if(!item.has("pending")&&Instant.parse(item.getString("dueAt")).toEpochMilli()<=System.currentTimeMillis()){item.put("pending",false);changed=true;continue;}if(Instant.parse(item.getString("dueAt")).toEpochMilli()<=System.currentTimeMillis()){item.put("dueAt",Instant.ofEpochMilli(System.currentTimeMillis()+15000).toString());changed=true;}}if(changed&&!write(c,items))return;for(int i=0;i<items.length();i++)schedule(c,items.getJSONObject(i));}catch(Exception ignored){}}
    static synchronized String list(Context c)throws Exception{JSONArray items=read(c);List<String> out=new ArrayList<>();for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if(!item.optBoolean("completed"))out.add(item.getString("text")+" — "+(item.optBoolean("pending",true)?Instant.parse(item.getString("dueAt")).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("d MMM, HH:mm",new Locale("es"))):"seguimiento detenido"));}return out.isEmpty()?"No tienes recordatorios locales pendientes.":"Recordatorios de este teléfono:\n"+String.join("\n",out.subList(0,Math.min(10,out.size())));}
}
