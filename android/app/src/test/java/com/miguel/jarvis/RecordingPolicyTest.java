package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class RecordingPolicyTest {
    @Test public void speechProviderMayUseMicWithoutPausingItself(){
        assertFalse(RecordingPolicy.interrupts(1,false));
        assertFalse(RecordingPolicy.interrupts(6,false));
    }
    @Test public void staleSilencedCaptureGetsOnlyBoundedHandoffGrace(){
        assertFalse(RecordingPolicy.interrupts(6,true,1000,3000));
        assertFalse(RecordingPolicy.interrupts(1,true,2999,3000));
        assertTrue(RecordingPolicy.interrupts(6,true,3000,3000));
        assertTrue(RecordingPolicy.interrupts(1,true,4000,3000));
        assertTrue(RecordingPolicy.interrupts(5,false,1000,3000));
        assertTrue(RecordingPolicy.interrupts(7,false,1000,3000));
        assertFalse(RecordingPolicy.interrupts(6,false,4000,3000));
    }
    @Test public void cameraCallsAndSilencedRecognitionPause(){
        assertTrue(RecordingPolicy.interrupts(5,false));
        assertTrue(RecordingPolicy.interrupts(7,false));
        assertTrue(RecordingPolicy.interrupts(1,true));
        assertTrue(RecordingPolicy.interrupts(6,true));
    }
}
