package com.miguel.jarvis;

/** Presentation only: never starts, restarts or owns a microphone. */
public final class AssistantScene {
    public enum Mode { IDLE, PREPARING, LISTENING, THINKING, SPEAKING, PAUSED, ERROR }
    private AssistantScene(){}
    public static Mode resolve(boolean busy,boolean speaking,boolean dictating,boolean running,String status){
        if(speaking)return Mode.SPEAKING;
        if(running&&"PAUSADO".equals(status))return Mode.PAUSED;
        if(running&&"ERROR".equals(status))return Mode.ERROR;
        if(busy)return Mode.THINKING;
        if(dictating)return Mode.LISTENING;
        if(!running)return Mode.IDLE;
        if("RESPONDIENDO".equals(status))return Mode.SPEAKING;
        if("CONSULTANDO".equals(status))return Mode.THINKING;
        if("ESCUCHANDO".equals(status)||"ESPERANDO PETICIÓN".equals(status))return Mode.LISTENING;
        return Mode.PREPARING;
    }
    public static String label(Mode mode){return switch(mode){
        case IDLE->"EN REPOSO";case PREPARING->"PREPARANDO";case LISTENING->"ESCUCHANDO";
        case THINKING->"PENSANDO";case SPEAKING->"RESPONDIENDO";case PAUSED->"PAUSADO";case ERROR->"REVISAR AUDIO";};}
    public static boolean animated(Mode mode){return mode==Mode.PREPARING||mode==Mode.LISTENING||mode==Mode.THINKING||mode==Mode.SPEAKING;}
}
