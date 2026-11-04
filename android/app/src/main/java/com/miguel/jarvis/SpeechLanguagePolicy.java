package com.miguel.jarvis;
import java.util.*;
/** Language availability is separate from permission, microphone gain and TTS. */
public final class SpeechLanguagePolicy {
    private SpeechLanguagePolicy() {}
    public static boolean languageError(int code){return code==12||code==13;}
    public static String select(List<String> available,String preferred){
        if(available==null)return null;
        List<String> spanish=new ArrayList<>();for(String tag:available)if(tag!=null&&tag.replace('_','-').toLowerCase(Locale.ROOT).matches("es(?:-.*)?"))spanish.add(tag.replace('_','-'));
        for(String candidate:new String[]{preferred,"es-ES","es-MX","es","es-EC"})for(String tag:spanish)if(tag.equalsIgnoreCase(candidate))return tag;
        return spanish.isEmpty()?null:spanish.get(0);
    }
    public static String message(int code){return code==12?"El motor de dictado Android no admite el español solicitado. Revisa Permisos → Idioma del dictado Android y selecciona un proveedor con español. No es un fallo del detector JARVIS ni del permiso del micrófono.":"El español solicitado no está disponible ahora; puede faltar su paquete de dictado. Revisa Permisos → Idioma del dictado Android y descarga español en ese proveedor. Instalar una voz de lectura no instala el dictado.";}
}
