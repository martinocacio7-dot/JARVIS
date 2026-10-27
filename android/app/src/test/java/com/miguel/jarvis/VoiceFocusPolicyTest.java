package com.miguel.jarvis;

import org.junit.Test;
import static org.junit.Assert.*;

public class VoiceFocusPolicyTest {
    @Test public void delayedLossAfterGreetingDoesNotPauseQuestionOrStandby() {
        for (int loss : new int[]{-1,-2,-3}) {
            assertFalse(VoiceFocusPolicy.shouldPause(loss,false,false));
            assertFalse(VoiceFocusPolicy.shouldPause(loss,false,true));
            assertFalse(VoiceFocusPolicy.shouldPause(loss,true,false));
        }
        WakeConversation flow=new WakeConversation();flow.start();flow.keyword();flow.greeted();
        if(VoiceFocusPolicy.shouldPause(-2,false,false))flow.pause();
        flow.ready(1000);
        assertEquals(WakeConversation.Input.COMMAND,flow.input());
        assertFalse(flow.silenceExpired(4999));assertTrue(flow.silenceExpired(5000));
        flow.quiet();assertEquals(WakeConversation.Input.KEYWORD,flow.input());
    }
    @Test public void actualOutputInterruptionStillPauses() {
        for(int loss:new int[]{-1,-2,-3})assertTrue(VoiceFocusPolicy.shouldPause(loss,true,true));
        assertFalse(VoiceFocusPolicy.shouldPause(1,true,true));
        assertFalse(VoiceFocusPolicy.shouldPause(0,true,true));
    }
}
