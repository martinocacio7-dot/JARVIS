package com.miguel.jarvis;

/** Bounded grace only after stopping our own capture, never an automatic resume after a pause. */
public final class MicrophoneHandoff {
    public static final long GRACE_MS = 3000;
    public enum Decision { READY, WAIT, PAUSE }
    public static Decision decide(boolean occupied, boolean definiteConflict, long now, long releaseDeadline) {
        if (definiteConflict) return Decision.PAUSE;
        if (!occupied) return Decision.READY;
        return releaseDeadline > now ? Decision.WAIT : Decision.PAUSE;
    }
}
