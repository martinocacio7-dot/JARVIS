package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class RecordingPolicyTest {
    @Test public void speechProviderMayUseMicWithoutPausingItself(){
        assertFalse(RecordingPolicy.interrupts(1,false));
        assertFalse(RecordingPolicy.interrupts(6,false));
    }
    @Test public void cameraCallsAndSilencedRecognitionPause(){
        assertTrue(RecordingPolicy.interrupts(5,false));
        assertTrue(RecordingPolicy.interrupts(7,false));
        assertTrue(RecordingPolicy.interrupts(1,true));
        assertTrue(RecordingPolicy.interrupts(6,true));
    }
}
