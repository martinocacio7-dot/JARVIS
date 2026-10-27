package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;

public class ContinuousConversationTest {
    @Test public void followUpNeedsNoNameAndGivesEightSecondsAfterReady() {
        WakeConversation f=new WakeConversation();f.start();f.keyword();f.greeted();f.ready(1000);
        assertEquals(4000,f.waitingMillis());assertTrue(f.command("hora",2000));f.answer();
        assertEquals(WakeConversation.Input.NONE,f.input());assertTrue(f.followUp());
        assertEquals(WakeConversation.Input.COMMAND,f.input());assertFalse(f.silenceExpired(500000));
        f.ready(600000);assertFalse(f.silenceExpired(607999));assertTrue(f.silenceExpired(608000));
        f.quiet();assertEquals(WakeConversation.Input.KEYWORD,f.input());assertEquals(4000,f.waitingMillis());
    }
    @Test public void multipleTurnsKeepNewDeadlineAndNeverOpenMicDuringReply() {
        WakeConversation f=new WakeConversation();f.start();f.keyword();f.greeted();
        for(int i=0;i<4;i++) {
            long now=1000+i*20000;f.ready(now);assertTrue(f.speechBegan(now+100));
            assertTrue(f.command("pregunta",now+200));assertFalse(f.followUp());
            assertTrue(f.answer());assertEquals(WakeConversation.Input.NONE,f.input());
            assertTrue(f.followUp());assertEquals(0,f.remainingSilence(now+300));
        }
    }
    @Test public void pauseAndStopDuringReplyCannotRestartFollowUp() {
        WakeConversation f=new WakeConversation();f.start();f.keyword();f.greeted();f.command("hola",0);f.answer();
        f.pause();assertFalse(f.followUp());assertFalse(f.requestRepeat());
        f.stop();assertFalse(f.followUp());assertEquals(WakeConversation.Input.NONE,f.input());
    }
    @Test public void misunderstoodSpeechCanAskForRepeatButNotWhilePaused() {
        WakeConversation f=new WakeConversation();f.start();f.keyword();f.greeted();
        assertTrue(f.requestRepeat());assertEquals(WakeConversation.Input.NONE,f.input());
        assertTrue(f.followUp());f.ready(100);assertFalse(f.silenceExpired(8099));
        f.pause();assertFalse(f.requestRepeat());assertFalse(f.followUp());
    }
    @Test public void exactClosingPhraseDoesNotMistakeQuestionForGoodbye() {
        assertTrue(DeviceCommands.endsConversation("Gracias, eso es todo"));
        assertTrue(DeviceCommands.endsConversation("Jarvis termina la conversación"));
        assertFalse(DeviceCommands.endsConversation("Gracias pero explícame otra cosa"));
        assertFalse(DeviceCommands.endsConversation("Cómo se dice gracias en inglés"));
    }
}
