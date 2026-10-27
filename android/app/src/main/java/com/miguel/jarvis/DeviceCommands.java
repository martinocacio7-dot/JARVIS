package com.miguel.jarvis;

import java.text.Normalizer;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.*;

public final class DeviceCommands {
    private DeviceCommands() {}
    public static String key(String text) {
        return Normalizer.normalize(text.toLowerCase(Locale.ROOT),Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("[^\\p{L}\\p{N} ]"," ").replaceAll("\\s+"," ").trim().replaceFirst("^jarvis +","").replaceFirst(" por favor$","");
    }
    public static String calendarReply(String text,ZonedDateTime now) {
        if(!key(text).matches("(?:que dia es(?: hoy)?|que dia estamos|en que dia estamos|que fecha es(?: hoy)?|cual es la fecha(?: de hoy)?|dime la fecha(?: de hoy)?|fecha de hoy|que dia de la semana es(?: hoy)?)"))return null;
        return "Hoy es "+now.format(DateTimeFormatter.ofPattern("EEEE d 'de' MMMM 'de' yyyy",new Locale("es","EC")))+".";
    }
    public static String appTarget(String text) {
        if(text.contains(":")||text.contains("/")||text.contains("\\"))return null;
        Matcher match=Pattern.compile("^(?:abre|abrir|abreme|entra a|entra en|inicia|ejecuta) (?:la (?:aplicacion|app) |el )?([\\p{L}\\p{N} ]{1,60})$").matcher(key(text));
        return match.matches()?match.group(1):null;
    }
}
