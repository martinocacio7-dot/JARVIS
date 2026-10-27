package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class SpeechCompletionPolicyTest {
    @Test public void activePlaybackResetsQuietConfirmation() {
        assertEquals(0,SpeechCompletionPolicy.nextQuietChecks(true,1));
        assertEquals(1,SpeechCompletionPolicy.nextQuietChecks(false,0));
        assertEquals(2,SpeechCompletionPolicy.nextQuietChecks(false,1));
    }
    @Test public void completionHandsGreetingToFourSecondQuestionWindow() {
        WakeConversation flow=new WakeConversation();flow.start();flow.keyword();
        int checks=SpeechCompletionPolicy.nextQuietChecks(false,0);
        assertEquals(WakeConversation.Input.NONE,flow.input());
        checks=SpeechCompletionPolicy.nextQuietChecks(false,checks);
        if(checks>=2)flow.greeted();
        flow.ready(1000);assertFalse(flow.silenceExpired(4999));
        assertTrue(flow.silenceExpired(5000));flow.quiet();
        assertEquals(WakeConversation.Input.KEYWORD,flow.input());
    }
}
