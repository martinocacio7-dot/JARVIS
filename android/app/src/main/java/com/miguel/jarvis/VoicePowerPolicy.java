package com.miguel.jarvis;
/** CPU stays awake only during an explicitly enabled, unpaused voice session. */
public final class VoicePowerPolicy {
    private VoicePowerPolicy() {}
    public static boolean active(boolean running, WakeConversation.State state) {
        return running && state != WakeConversation.State.PAUSED && state != WakeConversation.State.STOPPED;
    }
}
