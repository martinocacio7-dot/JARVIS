package com.miguel.jarvis;
import java.time.*;
import java.util.regex.*;
public final class PhoneReminder {
    public final String text;public final ZonedDateTime time;
    PhoneReminder(String text,ZonedDateTime time){this.text=text;this.time=time;}
    static String digits(String input){String[] words={"cero","una","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciseis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidos","veintitres","veinticuatro","veinticinco","veintiseis","veintisiete","veintiocho","veintinueve","treinta"};for(int i=words.length-1;i>=0;i--)input=input.replaceAll("\\b"+words[i]+"\\b",String.valueOf(i));return input.replaceAll("\\b(?:un|uno)\\b","1");}
    public static boolean isRequest(String text){return DeviceCommands.key(text).matches("(?:recuerdame|avisame|(?:hazme|hasme|haz|has|pon|crea)(?: un)? recordatorio).* ".trim());}
    public static String withoutFollowUp(String text){return text.replaceFirst("(?iu)\\s+(?:y\\s+)?(?:repite(?:lo)?\\s+)?cada\\s+(?:5|cinco)\\s+minutos(?:\\s+hasta\\s+que\\s+(?:lo\\s+)?marque\\s+como\\s+hecho)?[.!?]?$","");}
    public static PhoneReminder parse(String text,ZonedDateTime now){
        text=withoutFollowUp(text);
        String value=DeviceCommands.key(text).replaceFirst("^(?:recuerdame|avisame|(?:hazme|hasme|haz|has|pon|crea)(?: un)? recordatorio)(?: para| de| sobre)? ?","");
        // Preserve clock colon, which normalization would otherwise remove.
        value=java.text.Normalizer.normalize(text.toLowerCase(java.util.Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("[¿?¡!]","").replaceFirst("^jarvis[, ]+","").replaceFirst("^(?:recuerdame|avisame|(?:hazme|hasme|haz|has|pon|crea)(?: un)? recordatorio)(?: para| de| sobre)? ?","").trim();
        Matcher wordNumber=Pattern.compile("\\b(en|dentro de|a las|a la) (\\p{L}+)\\b").matcher(value);StringBuffer converted=new StringBuffer();
        while(wordNumber.find())wordNumber.appendReplacement(converted,Matcher.quoteReplacement(wordNumber.group(1)+" "+digits(wordNumber.group(2))));wordNumber.appendTail(converted);value=converted.toString();
        value=value.replaceAll("(a las? \\d{1,2}) y media", "$1:30").replaceAll("(a las? \\d{1,2}) y cuarto", "$1:15");
        if(value.matches(".*(?:horas? y|media hora|cuarto de hora).*"))return new PhoneReminder(value,null);
        Matcher relative=Pattern.compile("(?:^| )(?:(?:dentro de|en) (\\d+) (minutos?|horas?))(?: (?:para|sobre|de))?(?: |$)").matcher(value);
        if(relative.find()){if(relative.group(1).length()>6)return new PhoneReminder(value,null);int amount=Integer.parseInt(relative.group(1));long mins=amount*(relative.group(2).startsWith("hora")?60L:1);String description=(value.substring(0,relative.start())+" "+value.substring(relative.end())).trim();return new PhoneReminder(description,mins>=1&&mins<=10080?now.plusMinutes(mins):null);}
        Matcher clock=Pattern.compile("(?:a las?|a la) (\\d{1,2})(?::(\\d{2}))?(?: (am|pm|de la manana|de la tarde|de la noche))?").matcher(value);
        if(clock.find()){
            if(value.substring(clock.end()).trim().matches("^(?:y|menos) .*"))return new PhoneReminder(value,null);
            int hour=Integer.parseInt(clock.group(1)),minute=clock.group(2)==null?0:Integer.parseInt(clock.group(2));String part=clock.group(3);
            if(part!=null){if(hour<1||hour>12)return new PhoneReminder(value,null);hour=hour%12+(part.equals("am")||part.equals("de la manana")?0:12);}
            if(hour>23||minute>59)return new PhoneReminder(value,null);
            String remaining=value.substring(0,clock.start())+" "+value.substring(clock.end());
            int day=remaining.contains("pasado manana")?2:remaining.contains("manana")?1:0;
            String description=(value.substring(0,clock.start())+" "+value.substring(clock.end())).replaceAll("\\b(pasado manana|manana|hoy|sobre|para)\\b","").replaceAll("\\s+"," ").trim();
            ZonedDateTime due=now.plusDays(day).withHour(hour).withMinute(minute).withSecond(0).withNano(0);
            if(!due.isAfter(now)&&day==0&&!value.contains("hoy"))due=due.plusDays(1);
            return new PhoneReminder(description,due.isAfter(now)?due:null);
        }
        return new PhoneReminder(value,null);
    }
}
