package com.miguel.jarvis;
import java.util.*;
/** Counts visible notification entries, never infers unread message totals. */
public final class NotificationCounts {
    public static final class Entry {
        final String label;final boolean excluded;
        public Entry(String label,boolean excluded){this.label=label;this.excluded=excluded;}
    }
    public static String summarize(List<Entry> entries){
        Map<String,Integer> counts=new TreeMap<>();int total=0;
        for(Entry entry:entries)if(!entry.excluded){String label=entry.label.replaceAll("[\\p{Cntrl}]"," ");label=label.substring(0,Math.min(64,label.length()));counts.put(label,counts.getOrDefault(label,0)+1);total++;}
        if(total==0)return "No hay notificaciones de otras aplicaciones para resumir. No cuento avisos permanentes ni resúmenes de grupos.";
        List<String> parts=new ArrayList<>();int shown=0;
        for(Map.Entry<String,Integer> item:counts.entrySet()){if(shown++==10)break;parts.add(item.getValue()+" de "+item.getKey());}
        return "Tienes "+total+" notificaciones: "+String.join(", ",parts)+(counts.size()>10?", y otras aplicaciones":"")+". Cuento notificaciones visibles; no el número exacto de mensajes sin leer.";
    }
}
