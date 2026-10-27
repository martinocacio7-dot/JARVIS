package com.miguel.jarvis;

/** Focus belongs to spoken output, not to the subsequent recognition provider. */
public final class VoiceFocusPolicy {
    private VoiceFocusPolicy() {}
    public static boolean shouldPause(int change, boolean ownsFocus, boolean speaking) {
        return change < 0 && ownsFocus && speaking;
    }
}
