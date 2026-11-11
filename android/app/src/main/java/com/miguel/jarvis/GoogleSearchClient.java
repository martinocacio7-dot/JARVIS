package com.miguel.jarvis;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Opt-in search transport. Fixed HTTPS host; never sends chat history, recordings or notifications. */
final class GoogleSearchClient {
    static long windowStart;static int queries;
    static synchronized boolean reserve(){long now=android.os.SystemClock.elapsedRealtime();if(now-windowStart>=60000){windowStart=now;queries=0;}return queries++<10;}
    static final String PREFS="google_search";
    static boolean configured(Context context){SharedPreferences p=context.getSharedPreferences(PREFS,0);return !p.getString("key","").isEmpty()&&!p.getString("engine","").isEmpty();}
    static String search(Context context,WebSearchCommand command){
        if(!command.news&&command.query.isEmpty())return "¿Qué tema quieres buscar en Google?";
        if(command.query.length()>300)return "Usa una búsqueda de hasta 300 caracteres.";
        SharedPreferences prefs=context.getSharedPreferences(PREFS,0);String key=prefs.getString("key",""),engine=prefs.getString("engine","");
        if(key.isEmpty()||engine.isEmpty())return "Configura Búsqueda de Google desde Permisos o usa Abrir Google para consultar el navegador. No he realizado la búsqueda.";
        if(!reserve())return "Espera un minuto antes de otra consulta de Google. No se realizó esta búsqueda.";
        String query=command.news?"noticias "+(command.query.isEmpty()?"Ecuador hoy":command.query):command.query;
        HttpURLConnection connection=null;
        try{
            Uri url=new Uri.Builder().scheme("https").authority("www.googleapis.com").path("customsearch/v1").appendQueryParameter("key",key).appendQueryParameter("cx",engine).appendQueryParameter("q",query).appendQueryParameter("num","3").appendQueryParameter("hl","es").build();
            connection=(HttpURLConnection)new URL(url.toString()).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(6000);connection.setReadTimeout(8000);connection.setUseCaches(false);
            int status=connection.getResponseCode();
            if(status==429||status==403)return "Google no permitió la consulta. Revisa la clave, el motor, el acceso de tu cuenta y su cuota en Permisos. No se ha verificado ninguna fuente.";
            if(status!=200)return "Google no pudo completar la búsqueda. Puedes intentarlo después o pedir Abrir Google.";
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();long deadline=android.os.SystemClock.elapsedRealtime()+10000;
            try(InputStream stream=connection.getInputStream()){byte[] chunk=new byte[4096];int n;while((n=stream.read(chunk))!=-1){if(bytes.size()+n>131072||android.os.SystemClock.elapsedRealtime()>deadline)throw new IOException("Response limit");bytes.write(chunk,0,n);}}
            return GoogleEvidence.answer(new JSONObject(bytes.toString(StandardCharsets.UTF_8.name())));
        }catch(Exception unavailable){return "No pude consultar Google. El chat y las acciones locales siguen disponibles. Revisa Internet y la configuración o pide Abrir Google.";}
        finally{if(connection!=null)connection.disconnect();}
    }
}
