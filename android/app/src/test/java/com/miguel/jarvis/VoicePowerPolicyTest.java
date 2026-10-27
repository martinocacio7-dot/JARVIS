package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class VoicePowerPolicyTest {
    @Test public void keepsCpuDuringNameGreetingQuestionAndAnswerOnlyWhenEnabled(){
        for(WakeConversation.State state:new WakeConversation.State[]{WakeConversation.State.WAKE,WakeConversation.State.GREETING,WakeConversation.State.COMMAND,WakeConversation.State.THINKING,WakeConversation.State.REPLY}){
            assertTrue(VoicePowerPolicy.active(true,state));
            assertFalse(VoicePowerPolicy.active(false,state));
        }
        assertFalse(VoicePowerPolicy.active(true,WakeConversation.State.PAUSED));
        assertFalse(VoicePowerPolicy.active(true,WakeConversation.State.STOPPED));
    }
    @Test public void timeoutReturnsToStandbyWithoutStoppingServiceAndPauseReleasesCpu(){
        WakeConversation flow=new WakeConversation();flow.start();
        assertTrue(VoicePowerPolicy.active(true,flow.state()));
        flow.keyword();assertEquals(WakeConversation.Input.NONE,flow.input());
        flow.greeted();flow.ready(1000);
        assertFalse(flow.silenceExpired(4999));assertTrue(flow.silenceExpired(5000));
        flow.quiet();
        assertEquals(WakeConversation.Input.KEYWORD,flow.input());
        assertTrue(VoicePowerPolicy.active(true,flow.state()));
        flow.pause();assertFalse(VoicePowerPolicy.active(true,flow.state()));
        flow.quiet();assertEquals(WakeConversation.Input.NONE,flow.input());
        flow.stop();assertFalse(VoicePowerPolicy.active(false,flow.state()));
    }
}
