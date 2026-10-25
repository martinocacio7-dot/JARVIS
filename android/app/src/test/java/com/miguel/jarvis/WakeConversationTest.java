package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class WakeConversationTest {
    @Test public void ignoresAmbientSpeechUntilNameAndPreservesOptionalCommand() {
        assertNull(WakeConversation.afterName("qué hora es"));assertNull(WakeConversation.afterName("superjarvis"));
        assertEquals("",WakeConversation.afterName("JARVIS"));assertEquals("qué hora es",WakeConversation.afterName("Oye, Jarvís, qué hora es"));
    }
    @Test public void waitsFourSecondsAfterReadyThenReturnsSilentlyToKeyword() {
        WakeConversation flow=new WakeConversation();flow.start();
        assertFalse(flow.command("hora",0));assertTrue(flow.keyword());
        assertFalse(flow.keyword());assertTrue(flow.greeted());
        assertFalse(flow.silenceExpired(100000));flow.ready(100000);
        assertFalse(flow.silenceExpired(103999));assertTrue(flow.silenceExpired(104000));
        assertFalse(flow.command("tarde",104000));flow.quiet();assertEquals(WakeConversation.State.WAKE,flow.state());assertTrue(flow.keyword());
    }
    @Test public void speechBeforeDeadlineCanFinishAfterFourSeconds() {
        WakeConversation flow=new WakeConversation();flow.start();flow.keyword();flow.greeted();flow.ready(1000);
        assertTrue(flow.speechBegan(4999));assertFalse(flow.silenceExpired(7000));
        assertTrue(flow.command("recuérdame tomar agua mañana a las nueve",7000));assertTrue(flow.answer());flow.quiet();assertEquals(WakeConversation.State.WAKE,flow.state());
    }
    @Test public void recorderPauseAndStopRejectStaleSpeechAndGreetingCallbacks() {
        WakeConversation flow=new WakeConversation();flow.start();flow.keyword();flow.pause();
        assertFalse(flow.greeted());assertFalse(flow.command("hola",0));flow.quiet();assertEquals(WakeConversation.State.PAUSED,flow.state());
        flow.start();flow.keyword();flow.greeted();flow.ready(100);flow.stop();assertFalse(flow.command("hola",101));assertFalse(flow.answer());flow.quiet();assertEquals(WakeConversation.State.STOPPED,flow.state());
    }
}
