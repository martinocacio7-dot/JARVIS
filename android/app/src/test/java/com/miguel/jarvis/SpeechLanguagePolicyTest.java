package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class SpeechLanguagePolicyTest {
    @Test public void choosesInstalledSpanishInsteadOfForcingEcuadorOrEnglish(){
        assertEquals("es-ES",SpeechLanguagePolicy.select(Arrays.asList("en-US","es-ES"),"es-EC"));
        assertEquals("es-MX",SpeechLanguagePolicy.select(Arrays.asList("en-US","es_MX"),"es-EC"));
        assertEquals("es-419",SpeechLanguagePolicy.select(Arrays.asList("en-US","es-419"),"es-ES"));
        assertEquals("es-MX",SpeechLanguagePolicy.select(Arrays.asList("es-ES","es-MX"),"es-MX"));
        assertNull(SpeechLanguagePolicy.select(Arrays.asList("en-US","fr-FR"),"es-EC"));
    }
    @Test public void distinguishesLanguageFromPermissionAndNeverRepreparesPausedOrSpokenTurn(){
        assertTrue(SpeechLanguagePolicy.languageError(12));assertTrue(SpeechLanguagePolicy.languageError(13));assertFalse(SpeechLanguagePolicy.languageError(9));
        assertTrue(SpeechLanguagePolicy.message(12).contains("no admite"));assertTrue(SpeechLanguagePolicy.message(13).contains("paquete"));
        WakeConversation flow=new WakeConversation();flow.start();flow.keyword();flow.greeted();flow.ready(1000);
        assertTrue(flow.reprepareLanguage());assertFalse(flow.silenceExpired(100000));flow.ready(200000);
        assertFalse(flow.silenceExpired(203999));assertTrue(flow.silenceExpired(204000));
        flow.quiet();flow.keyword();flow.greeted();flow.ready(500000);flow.speechBegan(500001);assertFalse(flow.reprepareLanguage());
        flow.pause();assertFalse(flow.reprepareLanguage());flow.stop();assertFalse(flow.reprepareLanguage());
    }
}
