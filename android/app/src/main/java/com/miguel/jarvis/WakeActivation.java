package com.miguel.jarvis;

/** One explicit activation continues across system permission dialogs without extra taps. */
public final class WakeActivation {
    public enum Step { IDLE, FOREGROUND, MICROPHONE, NOTIFICATIONS, APP_NOTIFICATIONS, CHANNEL, LOGIN, START }
    private boolean requested;
    public void begin() { requested = true; }
    public void cancel() { requested = false; }
    public boolean requested() { return requested; }
    public Step next(boolean visible, boolean microphone, boolean notifications, boolean appNotifications, boolean channel, boolean login) {
        if (!requested) return Step.IDLE;
        if (!visible) return Step.FOREGROUND;
        if (!microphone) return Step.MICROPHONE;
        if (!notifications) return Step.NOTIFICATIONS;
        if (!appNotifications) return Step.APP_NOTIFICATIONS;
        if (!channel) return Step.CHANNEL;
        if (!login) return Step.LOGIN;
        return Step.START;
    }
    public boolean start() { if (!requested) return false; requested = false; return true; }
    public void permissionResult(boolean granted) { if (!granted) cancel(); }
}
