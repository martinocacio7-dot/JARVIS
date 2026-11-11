package com.miguel.jarvis;
/** Short-lived topic only. Never copies saved memories, messages or notification contents. */
public final class SearchContext {
    String topic="";long until;
    public void reset(){topic="";until=0;}
    public WebSearchCommand resolve(String text,long now){
        String key=DeviceCommands.key(text);
        if(key.matches("buscalo(?: en google| en internet)?|busca eso(?: en google| en internet)?|investiga eso")){
            if(until<=now||topic.isEmpty()){reset();return WebSearchCommand.parse("busca en google");}
            return WebSearchCommand.parse("busca en google "+topic);
        }
        WebSearchCommand explicit=WebSearchCommand.parse(text);
        if(explicit!=null){if(!explicit.query.isEmpty()&&explicit.query.length()<=300){topic=explicit.query;until=now+300000;}else reset();return explicit;}
        if(key.matches("(?:que es|que son|que significa|quien es|quienes son|como funciona|por que) .+")&&key.length()<=300){topic=text.trim();until=now+300000;}else reset();
        return null;
    }
}
