package com.miguel.jarvis;
import java.util.regex.*;
/** Explicit memory commands and one short clarification; never learns from arbitrary chat. */
public final class MemoryConversation {
    public record Command(String action,String label,String value){}
    String pending="";long until;
    public void reset(){pending="";until=0;}
    public Command parse(String input,long now){
        String text=input.trim().replaceFirst("(?iu)^jarvis[,\\s]+","").replaceFirst("^[¿¡]+","").replaceFirst("[.!?¿]+$","");String key=DeviceCommands.key(text);
        Command explicit=direct(text,key);
        if(explicit!=null){reset();if(explicit.action.equals("clarify")&&!explicit.label.isEmpty()){pending=explicit.label;until=now+120000;}return explicit;}
        if(!pending.isEmpty()&&until>now&&WebSearchCommand.parse(input)==null&&!DeviceCommands.notificationQuery(input)&&!PhoneReminder.isRequest(input)&&!key.matches("(?:que|como|cual|quien|cuando|donde|por que|abre|abrir|entra|ingresa|pon|busca|investiga|reproduce|recuerdame|haz|has|hasme|hazme|avisa|avisame|borra|elimina|marca|completa|lee|leeme|mis|mi agenda|olvida|cancela|no|si|hola|gracias|continua|repite|retoma|retomemos|termina|ya|todavia|aun|hecho|listo|crea|creame|programa|agrega|anade|anota|muestra|apaga|enciende|manda|envia|modifica|edita|cambia|mueve|reprograma|actualiza|guarda|acuerdate|la hora|hora|hora actual|fecha|noticias|notificaciones|ayuda|en resumen|mas facil|dame un ejemplo|centro de control|resumen de mis tareas|resumen de mi dia)(?: .*|$)")){
            String label=pending;reset();return new Command("write",label,text.replaceFirst("(?iu)^es\\s+",""));
        }
        reset();return null;
    }
    Command direct(String text,String key){
        if(key.matches("mis recuerdos|muestra mis recuerdos|que recuerdas de mi|que sabes de mi|que tienes guardado en tu memoria"))return new Command("read","","");
        if(key.matches("como me llamo|cual es mi nombre"))return new Command("read","nombre","");
        if(key.matches("borra mis recuerdos|olvida mis recuerdos|borra tu memoria guardada"))return new Command("clear","","");
        Matcher read=Pattern.compile("^(?:cual es mi|que recuerdas sobre|que recuerdas de|como se llama mi) (.+)$").matcher(key);if(read.matches())return new Command("read",read.group(1),"");
        Matcher forget=Pattern.compile("^(?:olvida el recuerdo|borra el recuerdo|olvida de tu memoria) (.+)$").matcher(key);if(forget.matches())return new Command("delete",forget.group(1),"");
        Matcher save=Pattern.compile("(?iu)^(?:recuerda|guarda en tu memoria|acu[eé]rdate de)\\s+(?:que\\s+)?(.+)$").matcher(text);if(!save.matches())return null;
        String value=save.group(1);Matcher name=Pattern.compile("(?iu)^me llamo\\s+(.+)$").matcher(value);if(name.matches())return new Command("write","nombre",name.group(1));
        Matcher pair=Pattern.compile("(?iu)^(?:mi\\s+)?(.{1,80}?)\\s+(?:es|son|:)\\s*(.*)$").matcher(value);if(pair.matches())return new Command(pair.group(2).isBlank()?"clarify":"write",DeviceCommands.key(pair.group(1)),pair.group(2));
        Matcher label=Pattern.compile("(?iu)^mi\\s+(.{1,80})$").matcher(value);return new Command("clarify",label.matches()?DeviceCommands.key(label.group(1)):"","");
    }
}
