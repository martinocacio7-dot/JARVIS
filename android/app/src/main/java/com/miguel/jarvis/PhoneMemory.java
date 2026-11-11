package com.miguel.jarvis;
import android.content.Context;
import org.json.*;
import java.time.Instant;
import java.util.*;
final class PhoneMemory {
    static final MemoryConversation dialogue=new MemoryConversation();
    static JSONObject facts(Context c)throws JSONException{return new JSONObject(c.getSharedPreferences("mobile_memory",0).getString("facts","{}"));}
    static synchronized String answer(Context c,String text)throws Exception{
        MemoryConversation.Command cmd=dialogue.parse(text,android.os.SystemClock.elapsedRealtime());if(cmd==null)return null;
        if(cmd.action().equals("clarify"))return cmd.label().isEmpty()?"¿Qué dato quieres guardar? Di recuerda que mi objetivo es aprender Python.":"¿Qué valor guardo para «"+cmd.label()+"»? Puedes responder es aprender Python. Todavía no guardé nada.";
        android.content.SharedPreferences prefs=c.getSharedPreferences("mobile_memory",0);JSONObject facts=facts(c),updated=new JSONObject(prefs.getString("updated","{}"));
        String label=cmd.label(),value=cmd.value();
        if(cmd.action().equals("read")){
            if(!label.isEmpty())return facts.has(label)?"Según lo que me pediste guardar, "+label+": "+facts.getString(label)+". Este dato viene de ti; no lo he verificado por otra fuente.":"No tengo ese dato guardado. Di recuerda que mi "+label+" es seguido de su valor.";
            List<String> list=new ArrayList<>();Iterator<String> keys=facts.keys();while(keys.hasNext()&&list.size()<10){String k=keys.next();list.add(k+": "+facts.getString(k));}return list.isEmpty()?"No hay recuerdos guardados en este teléfono.":"Datos que me pediste guardar ("+facts.length()+" en total):\n"+String.join("\n",list)+"\nFuente: tú. No se verifican automáticamente.";
        }
        String result;
        if(cmd.action().equals("write")){
            if(label.isEmpty()||label.length()>80||value.isBlank()||value.length()>400||value.matches("(?s).*[\\p{Cntrl}].*")||(!facts.has(label)&&facts.length()>=50))return "Usa una etiqueta de hasta 80 caracteres y un dato de hasta 400 en una sola línea. Puedo guardar 50 recuerdos.";
            result=(facts.has(label)?"Actualicé ":"Guardé ")+label+": "+value+" en este teléfono. Puedes decir olvida el recuerdo "+label+".";
            facts.put(label,value);updated.put(label,Instant.now().toString());
        }else if(cmd.action().equals("clear")){facts=new JSONObject();updated=new JSONObject();result="Borré los recuerdos guardados. Los chats y recordatorios siguen separados.";}
        else {if(!facts.has(label))return "No encontré ese recuerdo exacto. No borré nada.";facts.remove(label);updated.remove(label);result="Borré el recuerdo "+label+".";}
        if(!prefs.edit().putString("facts",facts.toString()).putString("updated",updated.toString()).commit())return "No pude confirmar el cambio de memoria. Consulta mis recuerdos antes de repetirlo.";
        return result;
    }
}
