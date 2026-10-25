package com.miguel.jarvis;

/** Recording sources alone cannot identify another app: some speech providers use MIC. */
public final class RecordingPolicy {
    private RecordingPolicy() {}
    public static boolean interrupts(int source, boolean silenced) {
        // Android AudioSource: CAMCORDER=5, VOICE_COMMUNICATION=7.
        return silenced || source == 5 || source == 7;
    }
}
