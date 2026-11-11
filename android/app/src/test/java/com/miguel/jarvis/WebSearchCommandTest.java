package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class WebSearchCommandTest {
    @Test public void explicitSearchesDoNotForwardNormalOrPrivateChat(){
        assertEquals("energia solar",WebSearchCommand.parse("Jarvis, busca en Google energía solar").query);
        assertEquals("energia solar",WebSearchCommand.parse("Busca energía solar en Google").query);
        assertEquals("",WebSearchCommand.parse("Busca en Google").query);
        assertTrue(WebSearchCommand.parse("noticias de hoy").news);
        assertEquals("ecuador",WebSearchCommand.parse("noticias sobre Ecuador").query);
        for(String text:new String[]{"¿Qué es energía solar?","Lee mis notificaciones","Recuerda que mi nombre es Miguel","Busca música de salsa","Abre WhatsApp"})assertNull(text,WebSearchCommand.parse(text));
    }
}
