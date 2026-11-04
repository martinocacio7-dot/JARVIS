package com.miguel.jarvis;
public final class ReminderFollowUpPolicy {
    public static final long INTERVAL_MS=300000L,REPLY_WINDOW_MS=120000L;
    private ReminderFollowUpPolicy(){}
    public static int afterDelivery(int remaining){return remaining<0?-1:Math.max(0,remaining-1);}
    public static boolean hasNext(int remaining){return remaining!=0;}
    public static boolean deliver(org.json.JSONObject item,long expected,long now)throws org.json.JSONException {
        if(item.optBoolean("completed")||!item.optBoolean("pending",true)||java.time.Instant.parse(item.getString("dueAt")).toEpochMilli()!=expected||now<expected)return false;
        int remaining=item.optInt("remaining",0);item.put("pending",false);
        if(hasNext(remaining))item.put("pending",true).put("remaining",afterDelivery(remaining)).put("dueAt",java.time.Instant.ofEpochMilli(now+INTERVAL_MS).toString());
        return true;
    }
    public static boolean change(org.json.JSONObject item,String action,long now,int budget)throws org.json.JSONException{
        if(item.optBoolean("completed"))return false;
        if(action.equals("done"))item.put("completed",true).put("pending",false);
        else if(action.equals("stop"))item.put("pending",false);
        else if(action.equals("snooze"))item.put("pending",true).put("remaining",budget).put("dueAt",java.time.Instant.ofEpochMilli(now+INTERVAL_MS).toString());
        else throw new IllegalArgumentException("Acción de recordatorio no válida");
        return true;
    }
    public static String response(String text){String key=DeviceCommands.key(text);if(key.matches("ya lo hice|si ya lo hice|hecho|listo|ya termine"))return "done";if(key.matches("todavia no|aun no|no todavia|no lo he hecho|en cinco minutos|en 5 minutos"))return "snooze";if(key.matches("deten los avisos|no me lo recuerdes mas|cancela este recordatorio|deja de recordarmelo"))return "stop";return "";}
    public static boolean canAnswer(long now,long until){return until>now;}
}
