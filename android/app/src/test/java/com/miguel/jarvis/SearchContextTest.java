package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class SearchContextTest {
    @Test public void followsAnExplicitRequestButExpiresAndNeverCopiesPrivateActions(){
        SearchContext context=new SearchContext();assertNull(context.resolve("¿Qué es la energía solar?",1000));
        assertEquals("que es la energia solar",context.resolve("Búscalo en Google",2000).query);
        assertEquals("",context.resolve("Busca eso",301000).query);
        context.resolve("Qué significa aesthetic",400000);context.resolve("Lee mis notificaciones",400100);
        assertEquals("",context.resolve("Búscalo",400200).query);
        context.resolve("Qué significa aesthetic",500000);context.reset();assertEquals("",context.resolve("Busca eso",500100).query);
    }
}
