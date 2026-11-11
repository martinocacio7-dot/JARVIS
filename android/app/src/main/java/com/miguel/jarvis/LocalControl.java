package com.miguel.jarvis;
import org.json.*;
import java.util.*;
public final class LocalControl {
    private LocalControl(){}
    public static String summary(JSONObject memories,JSONArray tasks,boolean completedOnly)throws JSONException{
        int completed=0,active=0,stopped=0;List<String> lines=new ArrayList<>();
        for(int i=0;i<tasks.length();i++){JSONObject task=tasks.getJSONObject(i);boolean done=task.optBoolean("completed");if(done)completed++;else {active++;if(!task.optBoolean("pending",true))stopped++;}if(done==completedOnly&&lines.size()<5)lines.add("• "+task.getString("text")+" — "+TaskHistoryPolicy.state(task));}
        return "Registros de este teléfono: "+memories.length()+" recuerdos, "+active+" pendientes y "+completed+" marcados como hechos."+(stopped>0?" "+stopped+" pendientes tienen los avisos detenidos.":"")+(lines.isEmpty()?"":"\n"+String.join("\n",lines))+"\nSon estados guardados en JARVIS, no comprobaciones de tareas realizadas fuera de la aplicación.";
    }
}
