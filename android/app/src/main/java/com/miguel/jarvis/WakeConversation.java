package com.miguel.jarvis;

/** Platform-independent conversation timing, shared by the Android service and JVM tests. */
public final class WakeConversation {
    public static final long WAIT_MS = 4000;
    private static final java.util.regex.Pattern NAME = java.util.regex.Pattern.compile("(?:^|[^\\p{L}\\p{N}])jarv[ií]s(?=$|[^\\p{L}\\p{N}])", java.util.regex.Pattern.CASE_INSENSITIVE | java.util.regex.Pattern.UNICODE_CASE);
    public static String afterName(String text) {
        if (text == null) return null;
        java.util.regex.Matcher match = NAME.matcher(text);
        return match.find() ? text.substring(match.end()).replaceFirst("^[\\s,.:;!?¡¿-]+", "").trim() : null;
    }
    public enum State { STOPPED, WAKE, GREETING, COMMAND, THINKING, REPLY, PAUSED }
    public enum Input { NONE, KEYWORD, COMMAND }
    public Input input() { return state == State.WAKE ? Input.KEYWORD : state == State.COMMAND ? Input.COMMAND : Input.NONE; }
    private State state = State.STOPPED;
    private long deadline;
    private boolean speech;
    public State state() { return state; }
    public void start() { state = State.WAKE; deadline = 0; speech = false; }
    public boolean keyword() { if (state != State.WAKE) return false; state = State.GREETING; return true; }
    public boolean greeted() { if (state != State.GREETING) return false; state = State.COMMAND; deadline = 0; speech = false; return true; }
    public void ready(long now) { if (state == State.COMMAND && deadline == 0) deadline = now + WAIT_MS; }
    public boolean speechBegan(long now) { if (state != State.COMMAND || deadline == 0 || now >= deadline) return false; speech = true; return true; }
    public boolean silenceExpired(long now) { return state == State.COMMAND && deadline != 0 && !speech && now >= deadline; }
    public boolean command(String text, long now) {
        if (state != State.COMMAND || text == null || text.trim().isEmpty() || silenceExpired(now)) return false;
        state = State.THINKING; return true;
    }
    public boolean answer() { if (state != State.THINKING) return false; state = State.REPLY; return true; }
    public void quiet() { if (state != State.PAUSED && state != State.STOPPED) start(); }
    public void pause() { state = State.PAUSED; deadline = 0; speech = false; }
    public void stop() { state = State.STOPPED; deadline = 0; speech = false; }
}
