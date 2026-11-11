package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class MemoryConversationTest {
    @Test public void onlyExplicitRequestsAndImmediateClarificationProduceWrites(){
        MemoryConversation memory=new MemoryConversation();assertNull(memory.parse("Me llamo Miguel",1));
        assertEquals("nombre",memory.parse("Recuerda que me llamo Miguel",2).label());
        assertEquals("objetivo",memory.parse("Recuerda que mi objetivo",10).label());
        MemoryConversation.Command filled=memory.parse("Es aprender Python",20);assertEquals("write",filled.action());assertEquals("aprender Python",filled.value());
        memory.parse("Recuerda que mi objetivo",100);assertNull(memory.parse("Abre WhatsApp",110));assertNull(memory.parse("aprender JavaScript",120));
        memory.parse("Recuerda que mi objetivo",1000);assertNull(memory.parse("es aprender SQL",121000));
        memory.parse("Recuerda que mi objetivo",200000);assertNull(memory.parse("Lee mis notificaciones",200010));assertNull(memory.parse("ya lo hice",200020));
        for(String request:new String[]{"La hora","Noticias de hoy","notificaciones","Crea un recordatorio","Agrega leche a mi lista","Muestra mi agenda","Cambia mi recordatorio"}){memory.parse("Recuerda que mi objetivo",250000);assertNull(memory.parse(request,250010));assertNull(memory.parse("es aprender Python",250020));}
        assertEquals("read",memory.parse("Cuál es mi objetivo",300000).action());
    }
}
