package com.miguel.jarvis;

/** Require two consecutive quiet observations after the current utterance started. */
public final class SpeechCompletionPolicy {
    private SpeechCompletionPolicy() {}
    public static int nextQuietChecks(boolean engineSpeaking,int previous) {
        return engineSpeaking?0:previous+1;
    }
}
