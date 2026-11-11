package com.miguel.jarvis;
import org.json.*;
import java.net.URI;

/** Extracts only attributed search snippets. Does not claim to read or verify pages. */
public final class GoogleEvidence {
    private GoogleEvidence(){}
    static String clean(String value,int length){String clean=value.replaceAll("[\\p{Cntrl}\\p{Cf}]"," ").replaceAll("\\s+"," ").trim();return clean.substring(0,Math.min(length,clean.length()));}
    public static String spoken(String text){return text.startsWith("Esto es lo que muestran los fragmentos de Google:")?text.replaceAll("(?m)^https://\\S+$","Enlace de la fuente en pantalla."):text;}
    public static String answer(JSONObject response){
        JSONArray items=response.optJSONArray("items");StringBuilder out=new StringBuilder();int found=0;
        if(items!=null)for(int i=0;i<items.length()&&found<3;i++){
            JSONObject item=items.optJSONObject(i);if(item==null)continue;String link=item.optString("link"),title=clean(item.optString("title"),160),snippet=clean(item.optString("snippet"),600);
            try{URI uri=new URI(link);if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||link.length()>2000)continue;}catch(Exception invalid){continue;}
            if(title.isEmpty()||snippet.isEmpty())continue;
            out.append("\n\n").append(++found).append(". ").append(title).append("\n").append(snippet).append("\n").append(link);
        }
        return found==0?"Google no devolvió fragmentos utilizables para esa búsqueda. Prueba con un tema más concreto.":"Esto es lo que muestran los fragmentos de Google:"+out+"\n\nSon extractos del buscador: no he leído las páginas completas, contrastado sus afirmaciones ni confirmado que estén actualizadas.";
    }
}
