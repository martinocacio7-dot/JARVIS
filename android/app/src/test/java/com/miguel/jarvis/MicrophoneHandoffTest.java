package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class MicrophoneHandoffTest {
    @Test public void waitsForOwnCaptureToReleaseThenStartsWithoutPausing() {
        long start=1000,deadline=start+MicrophoneHandoff.GRACE_MS;
        assertEquals(MicrophoneHandoff.Decision.WAIT,MicrophoneHandoff.decide(true,false,start+900,deadline));
        assertEquals(MicrophoneHandoff.Decision.WAIT,MicrophoneHandoff.decide(true,false,deadline-1,deadline));
        assertEquals(MicrophoneHandoff.Decision.READY,MicrophoneHandoff.decide(false,false,deadline-1,deadline));
    }
    @Test public void boundedWaitNeverBecomesAnInfiniteRetryOrAutomaticRecorderResume() {
        assertEquals(MicrophoneHandoff.Decision.PAUSE,MicrophoneHandoff.decide(true,false,4000,4000));
        assertEquals(MicrophoneHandoff.Decision.PAUSE,MicrophoneHandoff.decide(true,false,1000,0));
        assertEquals(MicrophoneHandoff.Decision.PAUSE,MicrophoneHandoff.decide(true,true,1000,4000));
        assertEquals(MicrophoneHandoff.Decision.PAUSE,MicrophoneHandoff.decide(false,true,1000,4000));
    }
}
