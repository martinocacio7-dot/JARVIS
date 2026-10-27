package com.miguel.jarvis;

import android.content.Context;
import org.json.*;
import org.vosk.*;
import org.vosk.android.SpeechService;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.Iterator;

/** Continuous local decoding. Ambient audio/transcripts are neither saved nor sent anywhere. */
final class LocalWakeDetector implements AutoCloseable {
    interface Listener { void ready(); void keyword(); void error(); }
    static final String GRAMMAR = "[\"jarvis\",\"hola\",\"gracias\",\"buenos días\",\"adiós\",\"javier\",\"carlos\",\"avisa\",\"servicio\",\"mañana\",\"quiero\",\"que hora es\",\"[unk]\"]";
    private final Model model;
    private Recognizer recognizer;
    private SpeechService capture;
    private long turn;
    LocalWakeDetector(Context context) throws Exception {
        LibVosk.setLogLevel(LogLevel.WARNINGS);
        File directory = new File(context.getNoBackupFilesDir(), "wake-model-es-0.42");
        JSONObject manifest;
        try (InputStream in = context.getAssets().open("wake-model-manifest.json")) {
            ByteArrayOutputStream data=new ByteArrayOutputStream();byte[] chunk=new byte[8192];int n;while((n=in.read(chunk))!=-1)data.write(chunk,0,n);
            manifest = new JSONObject(data.toString("UTF-8"));
        }
        JSONObject files = manifest.getJSONObject("files");
        for (Iterator<String> keys = files.keys(); keys.hasNext();) {
            if(Thread.currentThread().isInterrupted())throw new InterruptedIOException("Model preparation cancelled");
            String name = keys.next(), expected = files.getString(name);
            File target = new File(directory, name);
            if (!target.getCanonicalPath().startsWith(directory.getCanonicalPath() + File.separator)) throw new IOException("Invalid model path");
            if (target.isFile() && hash(target).equals(expected)) continue;
            if(!target.getParentFile().isDirectory()&&!target.getParentFile().mkdirs())throw new IOException("Model directory unavailable");
            File temporary = new File(target.getPath() + ".tmp");
            try {
                try (InputStream in = context.getAssets().open("wake-model/" + name); OutputStream out = new FileOutputStream(temporary)) {
                    byte[] buffer = new byte[65536];int n;
                    while ((n = in.read(buffer)) != -1) {
                        if(Thread.currentThread().isInterrupted())throw new InterruptedIOException("Model preparation cancelled");
                        out.write(buffer, 0, n);
                    }
                }
                if (!hash(temporary).equals(expected)) throw new IOException("Model checksum mismatch");
                Files.move(temporary.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } finally { temporary.delete(); }
        }
        model = new Model(directory.getPath());
    }
    private static String hash(File file) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream in=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)digest.update(buffer,0,n);}
        StringBuilder out=new StringBuilder();for(byte b:digest.digest())out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();
    }
    void start(Listener listener) throws IOException {
        stop();
        final long current=++turn;
        recognizer=new Recognizer(model,16000,GRAMMAR);recognizer.setWords(true);
        try {
            capture=new SpeechService(recognizer,16000);
            boolean started=capture.startListening(new org.vosk.android.RecognitionListener(){
                boolean ready=false,detected=false;
                boolean valid(){return turn==current&&capture!=null;}
                void confirm(){if(valid()&&!ready){ready=true;listener.ready();}}
                void result(String json){
                    if(!valid()||detected)return;
                    confirm();
                    try {
                        JSONArray words=new JSONObject(json).optJSONArray("result");
                        if(words==null)return;
                        for(int i=0;i<words.length();i++){
                            JSONObject word=words.getJSONObject(i);
                            if(WakeWordDecision.accepts(word.optString("word"),word.optDouble("conf",0))){
                                detected=true;listener.keyword();return;
                            }
                        }
                    }catch(JSONException ignored){/* Ignore incomplete recognition data. */}
                }
                public void onPartialResult(String json){confirm();}
                public void onResult(String json){result(json);}
                public void onFinalResult(String json){if(valid())listener.error();}
                public void onError(Exception error){if(valid())listener.error();}
                public void onTimeout(){if(valid())listener.error();}
            });
            if(!started)throw new IOException("Local capture did not start");
        } catch (IOException | RuntimeException error) { stop();throw error; }
    }
    void stop() {
        turn++;
        SpeechService old=capture;capture=null;
        try { if(old!=null){try{old.cancel();}finally{old.shutdown();}} }
        finally { if(recognizer!=null){recognizer.close();recognizer=null;} }
    }
    @Override public void close(){stop();model.close();}
}
