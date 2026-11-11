package com.miguel.jarvis;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class GoogleEvidenceTest {
    @Test public void attributesSnippetsWithoutClaimingVerification()throws Exception{
        JSONArray items=new JSONArray();for(int i=0;i<5;i++)items.put(new JSONObject().put("title","Título "+i).put("snippet","Explicación breve").put("link","https://example.org/fuente-"+i));
        String answer=GoogleEvidence.answer(new JSONObject().put("items",items));
        assertTrue(answer.contains("https://example.org/fuente-2"));assertFalse(answer.contains("fuente-3"));
        assertTrue(answer.contains("no he leído las páginas completas"));assertTrue(answer.contains("fragmentos de Google"));assertTrue(answer.contains("Título 0"));assertFalse(GoogleEvidence.spoken(answer).contains("https://"));assertEquals("Hola, señor.",GoogleEvidence.spoken("Hola, señor."));
        assertEquals("Texto limpio",GoogleEvidence.clean("Texto\n  limpio",100));
    }
    @Test public void rejectsUnsafeAndIncompleteSourcesAndBoundsUntrustedText()throws Exception{
        JSONArray items=new JSONArray();for(String link:new String[]{"javascript:alert(1)","https://user:pass@example.org/","http://example.org","file:///tmp/a"})items.put(new JSONObject().put("title","x").put("snippet","x").put("link",link));
        assertTrue(GoogleEvidence.answer(new JSONObject().put("items",items)).contains("no devolvió fragmentos utilizables"));
        items.put(new JSONObject().put("title","a".repeat(200)).put("snippet","s".repeat(900)).put("link","https://example.org"));
        String answer=GoogleEvidence.answer(new JSONObject().put("items",items));assertFalse(answer.contains("a".repeat(161)));assertFalse(answer.contains("s".repeat(601)));
        assertTrue(GoogleEvidence.answer(new JSONObject()).contains("no devolvió"));
    }
}
