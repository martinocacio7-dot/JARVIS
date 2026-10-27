package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class WakeWordDecisionTest {
    @Test public void onlyFinalExactNameWithHighConfidenceCanActivate(){
        assertTrue(WakeWordDecision.accepts("jarvis",.85));
        assertTrue(WakeWordDecision.accepts("JARVIS",1));
        for(String word:new String[]{"javier","gracias","[unk]","superjarvis","jarvisito",""}){
            assertFalse(WakeWordDecision.accepts(word,1));
        }
    }
    @Test public void rejectsUncertainOrInvalidScores(){
        for(double score:new double[]{.849,0,-1,1.1,Double.NaN,Double.POSITIVE_INFINITY}){
            assertFalse(WakeWordDecision.accepts("jarvis",score));
        }
        assertFalse(WakeWordDecision.accepts(null,1));
    }
}
