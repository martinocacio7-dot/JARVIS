package com.miguel.jarvis;
import android.content.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.text.DateFormat;
import java.util.*;

/** Local answers and explicit, opt-in Google searches are routed here. */
final class OfflineAssistant {
    private static MobileBrain brain;private static volatile String savedSession;private static final SearchContext searchContext=new SearchContext();static String pendingReminder="";static boolean pendingMusic=false,externalAction=false;
    static final class Reply {final String text;final boolean close,privateReply;Reply(String text,boolean close,boolean privateReply){this.text=text;this.close=close;this.privateReply=privateReply;}}
    static synchronized Reply reply(Context context,String text,boolean visible)throws Exception{return new Reply(answer(context,text,visible),externalAction,DeviceCommands.notificationQuery(text));}
    static synchronized MobileBrain brain(Context context)throws Exception{if(brain==null)try(InputStream in=context.getAssets().open("mobile-brain.json");ByteArrayOutputStream bytes=new ByteArrayOutputStream()){byte[] chunk=new byte[8192];int n;while((n=in.read(chunk))!=-1)bytes.write(chunk,0,n);brain=new MobileBrain(new JSONObject(bytes.toString("UTF-8")));}return brain;}
    static synchronized void reset(Context context){savedSession=null;if(brain!=null)brain.reset();pendingReminder="";pendingMusic=false;searchContext.reset();PhoneMemory.dialogue.reset();}
    static JSONObject snapshot()throws JSONException{String saved=savedSession;return saved==null?null:new JSONObject(saved);}
    static synchronized void restore(Context context,JSONObject session){reset(context);if(session!=null)try{brain(context).restore(session);savedSession=brain.snapshot().toString();}catch(Exception ignored){if(brain!=null)brain.reset();}}
    static synchronized String answer(Context context,String text,boolean visible)throws Exception{
        externalAction=false;
        text=text.replaceFirst("(?iu)^jarvis[,\\s]+","");
        String key=DeviceCommands.key(text);android.content.SharedPreferences prefs=context.getSharedPreferences("mobile_memory",0);JSONObject memory=new JSONObject(prefs.getString("facts","{}"));
        WebSearchCommand web=searchContext.resolve(text,android.os.SystemClock.elapsedRealtime());
        String reminderFollowUp=PhoneReminders.followUp(context,text);if(reminderFollowUp!=null){PhoneMemory.dialogue.reset();return reminderFollowUp;}
        String memoryReply=PhoneMemory.answer(context,text);if(memoryReply!=null)return memoryReply;
        if(key.matches("que hora es|dime la hora|la hora|hora actual"))return "Son las "+DateFormat.getTimeInstance(DateFormat.SHORT,new Locale("es")).format(new Date())+".";
        String date=DeviceCommands.calendarReply(text,ZonedDateTime.now());if(date!=null)return date;
        if(DeviceCommands.notificationQuery(text))return NotificationReader.read(context,DeviceCommands.notificationReadQuery(text));
        if(DeviceCommands.endsConversation(text))return "De acuerdo. Cuando me necesites, di JARVIS.";
        if(key.matches("mi centro de control|centro de control|resumen de mis tareas|resumen de mi dia|que has guardado|que tareas he completado"))return LocalControl.summary(PhoneMemory.facts(context),PhoneReminders.read(context),key.equals("que tareas he completado"));
        if(key.matches("mis recordatorios|muestra mis recordatorios|mi agenda"))return PhoneReminders.list(context);
        String namedReminder=PhoneReminders.namedAction(context,text);if(namedReminder!=null)return namedReminder;
        if(PhoneReminder.isRequest(text)){String reminderText=PhoneReminder.withoutFollowUp(text);if(DeviceCommands.key(reminderText).matches(".*(?:todos los dias|todas las semanas|cada dia|cada semana|cada mes|cada lunes|cada martes|cada miercoles|cada jueves|cada viernes|cada sabado|cada domingo|diariamente|cada \\d+ (?:minutos|horas)).*"))return "Ese tipo de repetición no está disponible. Esta versión hace seguimiento cada cinco minutos después del primer aviso, hasta Hecho o Detener.";pendingReminder=reminderText;PhoneReminder reminder=PhoneReminder.parse(reminderText,ZonedDateTime.now());if(reminder.time!=null&&!reminder.text.isEmpty())pendingReminder="";return PhoneReminders.save(context,reminder);}
        if(!pendingReminder.isEmpty()&&(key.matches("(?:a las?|manana|pasado manana|hoy|en|dentro de).*")||(PhoneReminder.parse(pendingReminder,ZonedDateTime.now()).text.isEmpty()&&!key.matches("(?:que|como|cual|hola|abre|entra|cancela|olvida|no).*")))){PhoneReminder reminder=PhoneReminder.parse(pendingReminder+" "+text,ZonedDateTime.now());if(reminder.time!=null&&!reminder.text.isEmpty())pendingReminder="";return PhoneReminders.save(context,reminder);}pendingReminder="";
        java.util.regex.Matcher music=java.util.regex.Pattern.compile("^(?:pon|ponme|busca|reproduce) (?:musica|canciones)(?: (?:de|para) (.+)| (?:segun mis gustos|segun mi recomendacion|que me guste))?$").matcher(key);
        if(music.matches()||(pendingMusic&&key.matches("(?:de|para) .+"))){String query=music.matches()?music.group(1):key.replaceFirst("^(?:de|para) ","");if(query==null)query=memory.optString("musica favorita",memory.optString("musica",""));pendingMusic=query.isEmpty();if(pendingMusic)return "¿Qué artista o género prefieres? Puedes decir de salsa o para estudiar.";externalAction=true;return AppLauncher.music(context,query,visible);}pendingMusic=false;
        if(web!=null){if(GoogleSearchClient.configured(context))return GoogleSearchClient.search(context,web);externalAction=true;return AppLauncher.web(context,web,visible);}
        if(key.equals("abre google")||key.equals("abrir google")){externalAction=true;return AppLauncher.googleHome(context,visible);}
        String app=DeviceCommands.appTarget(text);if(app!=null){externalAction=true;return AppLauncher.open(context,app,visible);}
        String calculation=PhoneMath.answer(text);if(calculation!=null)return calculation;
        if(key.equals("ayuda"))return "Puedo conversar con mi conocimiento instalado, explicar programación, decir hora y fecha, calcular, guardar recuerdos y crear recordatorios del teléfono. También puedo abrir apps, buscar música y abrir búsquedas en Google o Google Noticias. Al abrir Google no leo ni verifico sus páginas. Los recordatorios tienen botones Hecho, En 5 minutos y Detener. El chat no usa Render.";
        String answer=brain(context).answer(text);savedSession=brain.snapshot().toString();return answer;
    }
}
