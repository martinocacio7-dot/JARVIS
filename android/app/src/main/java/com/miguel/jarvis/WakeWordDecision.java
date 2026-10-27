package com.miguel.jarvis;
/** Only final word hypotheses with sufficient acoustic confidence may activate the assistant. */
public final class WakeWordDecision {
    private WakeWordDecision() {}
    public static boolean accepts(String word,double confidence) {
        return "jarvis".equalsIgnoreCase(word) && Double.isFinite(confidence) && confidence>=0.85 && confidence<=1;
    }
}
