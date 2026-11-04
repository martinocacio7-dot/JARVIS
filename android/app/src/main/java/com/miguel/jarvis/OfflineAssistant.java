package com.miguel.jarvis;
import android.content.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.text.DateFormat;
import java.util.*;

/** All mobile answers are evaluated here, without a network transport. */
final class OfflineAssistant {
    private static MobileBrain brain;static String pendingReminder="";static boolean pendingMusic=false,externalAction=false;
    static final class Reply {final String text;final boolean close,privateReply;Reply(String text,boolean close,boolean privateReply){this.text=text;this.close=close;this.privateReply=privateReply;}}
    static synchronized Reply reply(Context context,String text,boolean visible)throws Exception{return new Reply(answer(context,text,visible),externalAction,DeviceCommands.notificationQuery(text));}
    static synchronized MobileBrain brain(Context context)throws Exception{if(brain==null)try(InputStream in=context.getAssets().open("mobile-brain.json");ByteArrayOutputStream bytes=new ByteArrayOutputStream()){byte[] chunk=new byte[8192];int n;while((n=in.read(chunk))!=-1)bytes.write(chunk,0,n);brain=new MobileBrain(new JSONObject(bytes.toString("UTF-8")));}return brain;}
    static synchronized void reset(Context context){if(brain!=null)brain.reset();pendingReminder="";pendingMusic=false;}
    static synchronized String answer(Context context,String text,boolean visible)throws Exception{
        externalAction=false;
        text=text.replaceFirst("(?iu)^jarvis[,\\s]+","");
        String key=DeviceCommands.key(text);android.content.SharedPreferences prefs=context.getSharedPreferences("mobile_memory",0);JSONObject memory=new JSONObject(prefs.getString("facts","{}"));
        String reminderFollowUp=PhoneReminders.followUp(context,text);if(reminderFollowUp!=null)return reminderFollowUp;
        if(key.matches("que hora es|dime la hora|la hora|hora actual"))return "Son las "+DateFormat.getTimeInstance(DateFormat.SHORT,new Locale("es")).format(new Date())+".";
        String date=DeviceCommands.calendarReply(text,ZonedDateTime.now());if(date!=null)return date;
        if(DeviceCommands.notificationQuery(text))return NotificationReader.read(context,DeviceCommands.notificationReadQuery(text));
        if(DeviceCommands.endsConversation(text))return "De acuerdo. Cuando me necesites, di JARVIS.";
        if(key.startsWith("recuerda que ")){String value=text.replaceFirst("(?iu)^recuerda que\\s+","");String[] parts=value.split("(?iu)\\s+es\\s+",2);if(DeviceCommands.key(value).startsWith("me llamo ")){parts=new String[]{"nombre",value.replaceFirst("(?iu)^me llamo\\s+","")};}if(parts.length!=2)return "Dime el dato con una etiqueta: recuerda que mi objetivo es aprender Python.";String label=DeviceCommands.key(parts[0]).replaceFirst("^mi ","");if(label.length()>80||parts[1].length()>400||(!memory.has(label)&&memory.length()>=50))return "Usa una etiqueta de hasta 80 caracteres y un dato de hasta 400. Puedo guardar 50 recuerdos.";memory.put(label,parts[1]);if(!prefs.edit().putString("facts",memory.toString()).commit())return "No pude confirmar el guardado del recuerdo.";return "Guardé "+label+": "+parts[1]+" en este teléfono.";}
        if(key.startsWith("olvida el recuerdo ")||key.equals("borra mis recuerdos")){if(key.equals("borra mis recuerdos"))memory=new JSONObject();else memory.remove(key.substring("olvida el recuerdo ".length()));if(!prefs.edit().putString("facts",memory.toString()).commit())return "No pude confirmar el borrado.";return "Memoria local actualizada.";}
        if(key.matches("como me llamo|cual es mi nombre"))return memory.has("nombre")?"Me pediste recordar que te llamas "+memory.getString("nombre")+".":"Dime recuerda que me llamo seguido de tu nombre para guardarlo en este teléfono.";
        if(key.matches("mis recuerdos|que recuerdas de mi")){List<String> list=new ArrayList<>();Iterator<String> keys=memory.keys();while(keys.hasNext()&&list.size()<10){String label=keys.next();list.add(label+": "+memory.getString(label));}return list.isEmpty()?"No hay recuerdos guardados en este teléfono.":"Según lo que me pediste guardar:\n"+String.join("\n",list);}
        if(key.startsWith("cual es mi ")){String label=key.substring("cual es mi ".length());return memory.has(label)?memory.getString(label):"No tengo ese dato guardado en este teléfono.";}
        if(key.matches("mis recordatorios|muestra mis recordatorios|mi agenda"))return PhoneReminders.list(context);
        String namedReminder=PhoneReminders.namedAction(context,text);if(namedReminder!=null)return namedReminder;
        if(PhoneReminder.isRequest(text)){String reminderText=PhoneReminder.withoutFollowUp(text);if(DeviceCommands.key(reminderText).matches(".*(?:todos los dias|todas las semanas|cada dia|cada semana|cada mes|cada lunes|cada martes|cada miercoles|cada jueves|cada viernes|cada sabado|cada domingo|diariamente|cada \\d+ (?:minutos|horas)).*"))return "Ese tipo de repetición no está disponible. Esta versión hace seguimiento cada cinco minutos después del primer aviso, hasta Hecho o Detener.";pendingReminder=reminderText;PhoneReminder reminder=PhoneReminder.parse(reminderText,ZonedDateTime.now());if(reminder.time!=null&&!reminder.text.isEmpty())pendingReminder="";return PhoneReminders.save(context,reminder);}
        if(!pendingReminder.isEmpty()&&(key.matches("(?:a las?|manana|pasado manana|hoy|en|dentro de).*")||(PhoneReminder.parse(pendingReminder,ZonedDateTime.now()).text.isEmpty()&&!key.matches("(?:que|como|cual|hola|abre|entra|cancela|olvida|no).*")))){PhoneReminder reminder=PhoneReminder.parse(pendingReminder+" "+text,ZonedDateTime.now());if(reminder.time!=null&&!reminder.text.isEmpty())pendingReminder="";return PhoneReminders.save(context,reminder);}pendingReminder="";
        java.util.regex.Matcher music=java.util.regex.Pattern.compile("^(?:pon|ponme|busca|reproduce) (?:musica|canciones)(?: (?:de|para) (.+)| (?:segun mis gustos|segun mi recomendacion|que me guste))?$").matcher(key);
        if(music.matches()||(pendingMusic&&key.matches("(?:de|para) .+"))){String query=music.matches()?music.group(1):key.replaceFirst("^(?:de|para) ","");if(query==null)query=memory.optString("musica favorita",memory.optString("musica",""));pendingMusic=query.isEmpty();if(pendingMusic)return "¿Qué artista o género prefieres? Puedes decir de salsa o para estudiar.";externalAction=true;return AppLauncher.music(context,query,visible);}pendingMusic=false;
        String app=DeviceCommands.appTarget(text);if(app!=null){externalAction=true;return AppLauncher.open(context,app,visible);}
        String calculation=PhoneMath.answer(text);if(calculation!=null)return calculation;
        if(key.equals("ayuda"))return "Puedo conversar con mi conocimiento instalado, explicar programación, decir hora y fecha, calcular, guardar recuerdos y crear recordatorios del teléfono. También puedo abrir apps y buscar música. Los recordatorios tienen botones Hecho, En 5 minutos y Detener. El chat no usa Render.";
        return brain(context).answer(text);
    }
}
