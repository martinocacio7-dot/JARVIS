package com.miguel.jarvis;
import java.util.regex.*;
/** Explicit searches only; normal chat and private notifications are never sent to Google. */
public final class WebSearchCommand {
    public final String query;public final boolean news;public boolean home;
    private WebSearchCommand(String query,boolean news){this.query=query;this.news=news;}
    public static WebSearchCommand homepage(){WebSearchCommand command=new WebSearchCommand("",false);command.home=true;return command;}
    public static WebSearchCommand parse(String text){
        String key=DeviceCommands.key(text);
        if(key.matches("(?:abre |muestra |dime |lee )?(?:las )?noticias(?: de hoy)?"))return new WebSearchCommand("",true);
        Matcher news=Pattern.compile("^(?:busca |muestra |dime |lee )?(?:las )?noticias (?:sobre|de) (.+)$").matcher(key);
        if(news.matches())return new WebSearchCommand(news.group(1),true);
        Matcher search=Pattern.compile("^(?:busca|buscar|investiga|consulta|buscame)(?: (?:en google|en internet|en la web))?(?: sobre)? (.+)$").matcher(key);
        if(!search.matches()||key.matches(".* (?:musica|canciones)(?: .*)?"))return null;
        String query=search.group(1).replaceFirst(" (?:en google|en internet|en la web)$","");
        if(query.equals("en google")||query.equals("en internet")||query.equals("en la web"))query="";
        return new WebSearchCommand(query,false);
    }
}
