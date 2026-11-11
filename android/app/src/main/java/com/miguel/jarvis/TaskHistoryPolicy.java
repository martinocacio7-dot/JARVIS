package com.miguel.jarvis;
import org.json.*;
/** Keep every pending item, plus the most recent fifty user-completed records. */
public final class TaskHistoryPolicy {
    private TaskHistoryPolicy(){}
    public static JSONArray retain(JSONArray input)throws JSONException{int completed=0;JSONArray result=new JSONArray();for(int i=input.length()-1;i>=0;i--){JSONObject item=input.getJSONObject(i);if(item.optBoolean("completed")&&++completed>50)continue;result.put(item);}JSONArray ordered=new JSONArray();for(int i=result.length()-1;i>=0;i--)ordered.put(result.getJSONObject(i));return ordered;}
    public static String state(JSONObject item){return item.optBoolean("completed")?"Marcado como hecho por ti":item.optBoolean("pending",true)?"Pendiente · aviso solicitado":"Pendiente · avisos detenidos";}
}
