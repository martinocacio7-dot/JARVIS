package com.miguel.jarvis;
public final class AppNamePolicy {
    private AppNamePolicy(){}
    public static String canonical(String name){
        String key=DeviceCommands.key(name);
        if(key.matches("whatsapp|whats app|wasap|wasapp|watsap|watsapp|guasap|guasa|guassa|guatsap|whasap"))return "whatsapp";
        if(key.matches("(?:whatsapp|whats app|wasap|guasa|guassa) (?:business|negocios)"))return "whatsapp business";
        if(key.equals("you tube"))return "youtube";
        return key;
    }
    public static String packageName(String name){String key=canonical(name);return key.equals("whatsapp")?"com.whatsapp":key.equals("whatsapp business")?"com.whatsapp.w4b":"";}
}
