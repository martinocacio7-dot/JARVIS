package com.miguel.jarvis;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import android.speech.*;
import android.speech.tts.*;
import org.json.*;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.text.DateFormat;
import java.util.*;
import java.util.concurrent.*;

/** Explicitly enabled microphone foreground service. No notification-reading access. */
public final class WakeService extends Service {
    static final String STOP="com.miguel.jarvis.STOP_WAKE", PAUSE="com.miguel.jarvis.PAUSE_WAKE", RESUME="com.miguel.jarvis.RESUME_WAKE";
    static volatile boolean running=false,listeningConfirmed=false;
    static volatile long activationAttempt=0;
    static volatile String status="INACTIVO",statusText="Pulsa Activar JARVIS y completa los permisos para escuchar el nombre.";
    static void report(String value,String detail){status=value;statusText=detail;MainActivity.backgroundStatusChanged();}
    private static final int NOTICE=20;
    final WakeConversation flow=new WakeConversation();
    final Handler main=new Handler(Looper.getMainLooper());
    final ExecutorService worker=Executors.newSingleThreadExecutor();
    SpeechRecognizer recognizer; TextToSpeech tts; AudioManager audio; AudioFocusRequest focus;
    AudioManager.AudioRecordingCallback recordings;
    boolean ready=false, initialized=false, speaking=false, pendingStart=false, focused=false, startupFatal=false, recordingMonitorRegistered=false;
    int voiceSequence=0;
    volatile int generation=0;
    Runnable afterSpeech;
    volatile HttpsURLConnection connection;
    JSONArray history=new JSONArray();

    @Override public void onCreate(){
        super.onCreate();try{audio=getSystemService(AudioManager.class);
        AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
        focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attributes).setOnAudioFocusChangeListener(change->{if(change<0)pause("Audio ocupado. Escucha pausada; toca Retomar al terminar.");},main).build();
        recordings=new AudioManager.AudioRecordingCallback(){@Override public void onRecordingConfigChanged(List<AudioRecordingConfiguration> configs){
            if(flow.state()==WakeConversation.State.PAUSED || flow.state()==WakeConversation.State.STOPPED)return;
            for(AudioRecordingConfiguration config:configs) {
                if(config.getClientAudioSource()!=MediaRecorder.AudioSource.VOICE_RECOGNITION || (Build.VERSION.SDK_INT>=29 && config.isClientSilenced())) {pause("Grabación detectada. Micrófono liberado; toca Retomar al terminar.");return;}
            }
        }};
        audio.registerAudioRecordingCallback(recordings,main);recordingMonitorRegistered=true;
        tts=new TextToSpeech(this,result->{
            initialized=true;
            if(result!=TextToSpeech.SUCCESS){pause("No se pudo iniciar la voz. Configúrala en JARVIS.");return;}
            Voice selected=null;if(tts.getVoices()!=null)for(Voice voice:tts.getVoices())if(voice.getLocale().getLanguage().equals("es")&&!voice.isNetworkConnectionRequired()){selected=voice;break;}
            if(selected==null){pause("Instala una voz española desde Permisos de JARVIS.");return;}
            tts.setVoice(selected);tts.setAudioAttributes(attributes);ready=true;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                public void onStart(String id){}
                public void onDone(String id){main.post(()->speechDone(id));}
                public void onError(String id){main.post(()->{if(id.equals(String.valueOf(voiceSequence)))pause("No se pudo reproducir la voz. Revisa la síntesis de voz.");});}
            });
            if(pendingStart){pendingStart=false;activate();}
        });
        }catch(Exception error){startupFatal=true;report("ERROR","Android no pudo preparar el audio. Revisa los permisos de micrófono y el motor de voz desde Permisos.");stopSelf();}
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(startupFatal){stopSelf();return START_NOT_STICKY;}
        if(intent!=null&&STOP.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        try{
            if(Build.VERSION.SDK_INT>=29)startForeground(NOTICE,notification("Preparando escucha…"),ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            else startForeground(NOTICE,notification("Preparando escucha…"));
        }catch(Exception error){report("ERROR",error instanceof SecurityException?"Android rechazó el micrófono en segundo plano. Revisa permisos y vuelve a activar con JARVIS abierto.":"Android no pudo mostrar la notificación de escucha. Revisa las notificaciones de JARVIS en Ajustes.");stopSelf();return START_NOT_STICKY;}
        boolean firstStart=!running;running=true;MainActivity.backgroundModeChanged(true);
        if(firstStart)watchPermissions();
        if(intent!=null&&PAUSE.equals(intent.getAction()))pause("Escucha pausada. Toca Retomar para escuchar JARVIS.");
        else if(ready)activate();
        else if(initialized)pause("Apaga la escucha, instala una voz española en JARVIS y vuelve a activarla.");
        else {pendingStart=true;flow.pause();}
        return START_NOT_STICKY; // No microphone restart after force-stop, reboot or process death.
    }
    void watchPermissions(){
        if(!running)return;
        NotificationManager notices=getSystemService(NotificationManager.class);NotificationChannel channel=notices.getNotificationChannel("jarvis_listening");
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED || (Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) || !notices.areNotificationsEnabled() || (channel!=null&&channel.getImportance()==NotificationManager.IMPORTANCE_NONE)){stopSelf();return;}
        main.postDelayed(()->watchPermissions(),1000);
    }
    Notification notification(String text){
        NotificationManager notices=getSystemService(NotificationManager.class);
        notices.createNotificationChannel(new NotificationChannel("jarvis_listening","Escucha de JARVIS",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        boolean paused=flow.state()==WakeConversation.State.PAUSED;
        PendingIntent toggle=PendingIntent.getService(this,1,new Intent(this,WakeService.class).setAction(paused?RESUME:PAUSE),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop=PendingIntent.getService(this,2,new Intent(this,WakeService.class).setAction(STOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(this,"jarvis_listening").setSmallIcon(com.miguel.jarvis.R.drawable.jarvis).setContentTitle(paused?"JARVIS · Escucha pausada":"JARVIS · Micrófono en segundo plano").setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE).addAction(new Notification.Action.Builder(null,paused?"Retomar":"Pausar",toggle).build()).addAction(new Notification.Action.Builder(null,"Apagar",stop).build()).build();
    }
    void notice(String text){if(running)getSystemService(NotificationManager.class).notify(NOTICE,notification(text));}
    void destroyRecognizer(){SpeechRecognizer old=recognizer;recognizer=null;if(old!=null)old.destroy();}
    void releaseFocus(){if(focused){focused=false;audio.abandonAudioFocusRequest(focus);}}
    void resetAudio(){voiceSequence++;afterSpeech=null;speaking=false;destroyRecognizer();if(tts!=null)tts.stop();releaseFocus();}
    boolean occupied(){
        if(audio.getMode()==AudioManager.MODE_IN_CALL||audio.getMode()==AudioManager.MODE_IN_COMMUNICATION)return true;
        return !audio.getActiveRecordingConfigurations().isEmpty();
    }
    void activate(){
        if(!running||!ready)return;
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){pause("Falta permitir el micrófono. Abre JARVIS → Permisos.");return;}
        if(!SpeechRecognizer.isRecognitionAvailable(this)){pause("Este teléfono no tiene un servicio de reconocimiento de voz disponible.");return;}
        generation++;resetAudio();flow.start();report("PREPARANDO","Iniciando reconocimiento de voz…");notice("Di JARVIS. Pausa esta escucha antes de grabar un vídeo.");main.postDelayed(()->listen(),700);
    }
    void pause(String message){
        pendingStart=false;generation++;flow.pause();report("PAUSADO",message);resetAudio();HttpsURLConnection current=connection;if(current!=null)current.disconnect();notice(message);
    }
    void returnToWake(){
        if(flow.state()==WakeConversation.State.PAUSED||flow.state()==WakeConversation.State.STOPPED)return;
        generation++;resetAudio();flow.quiet();report("PREPARANDO","Volviendo a esperar el nombre JARVIS…");notice("Di JARVIS. Pausa esta escucha antes de grabar un vídeo.");
        int expected=generation;main.postDelayed(()->{if(expected==generation)listen();},900);
    }
    void listen(){
        WakeConversation.State state=flow.state();
        if(!running||!ready||speaking||recognizer!=null||(state!=WakeConversation.State.WAKE&&state!=WakeConversation.State.COMMAND))return;
        if(flow.silenceExpired(SystemClock.elapsedRealtime())){returnToWake();return;}
        if(occupied()){pause("El micrófono está ocupado. Retoma la escucha cuando termines de grabar.");return;}
        final SpeechRecognizer current=SpeechRecognizer.createSpeechRecognizer(this);recognizer=current;
        final boolean[] listeningReady={false};
        main.postDelayed(()->{if(recognizer==current&&!listeningReady[0])pause("El micrófono no se preparó a tiempo. Toca Retomar para volver a intentar.");},10000);
        current.setRecognitionListener(new RecognitionListener(){
            boolean begun=false;
            boolean valid(){return recognizer==current;}
            public void onReadyForSpeech(Bundle data){
                if(!valid())return;listeningReady[0]=true;listeningConfirmed=true;report(flow.state()==WakeConversation.State.WAKE?"ESCUCHANDO":"ESPERANDO PETICIÓN",flow.state()==WakeConversation.State.WAKE?"Di JARVIS. La notificación permite pausar y apagar la escucha.":"Sí, dígame, señor. Espero hasta cuatro segundos por tu petición.");
                if(flow.state()==WakeConversation.State.COMMAND){flow.ready(SystemClock.elapsedRealtime());scheduleSilenceCheck(generation);}
            }
            public void onBeginningOfSpeech(){if(valid()&&flow.state()==WakeConversation.State.COMMAND){begun=flow.speechBegan(SystemClock.elapsedRealtime());if(begun){int expected=generation;main.postDelayed(()->{if(expected==generation&&recognizer==current)returnToWake();},30000);}}}
            public void onRmsChanged(float value){}public void onBufferReceived(byte[] value){}public void onEndOfSpeech(){}public void onPartialResults(Bundle value){}public void onEvent(int type,Bundle value){}
            public void onResults(Bundle data){
                if(!valid())return;ArrayList<String> values=data.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);String text=values==null||values.isEmpty()?"":values.get(0).trim();destroyRecognizer();
                if(flow.state()==WakeConversation.State.WAKE){
                    final String trailing=WakeConversation.afterName(text);if(trailing==null){returnToWake();return;}
                    if(!flow.keyword())return;
                    say("Sí, dígame, señor.",()->{
                        if(!flow.greeted())return;
                        if(!trailing.isEmpty()){flow.ready(SystemClock.elapsedRealtime());if(flow.command(trailing,SystemClock.elapsedRealtime()))answer(trailing);}
                        else{notice("Dígame: espero hasta cuatro segundos por tu petición.");main.postDelayed(()->listen(),450);}
                    });
                }else if(flow.command(text,SystemClock.elapsedRealtime()))answer(text);else returnToWake();
            }
            public void onError(int error){
                if(!valid())return;destroyRecognizer();
                if(error==SpeechRecognizer.ERROR_NO_MATCH||error==SpeechRecognizer.ERROR_SPEECH_TIMEOUT){
                    if(flow.state()==WakeConversation.State.COMMAND&&!flow.silenceExpired(SystemClock.elapsedRealtime())&&!begun){int expected=generation;main.postDelayed(()->{if(expected==generation)listen();},300);}else returnToWake();
                }else pause("El reconocimiento se detuvo. Revisa Internet y permisos; toca Retomar para intentar de nuevo.");
            }
        });
        Intent request=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,"es-EC").putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
        try{current.startListening(request);}catch(Exception error){pause("No se pudo iniciar el micrófono. Abre JARVIS para revisar permisos.");}
    }
    void scheduleSilenceCheck(int expected){
        main.postDelayed(()->{
            if(expected!=generation||flow.state()!=WakeConversation.State.COMMAND)return;
            if(flow.silenceExpired(SystemClock.elapsedRealtime()))returnToWake();
            else scheduleSilenceCheck(expected);
        },100);
    }
    void say(String text,Runnable done){
        destroyRecognizer();releaseFocus();
        if(!running||!ready||flow.state()==WakeConversation.State.PAUSED||flow.state()==WakeConversation.State.STOPPED)return;
        // A recently stopped recognition provider may release its VOICE_RECOGNITION session asynchronously.
        for(AudioRecordingConfiguration config:audio.getActiveRecordingConfigurations())if(config.getClientAudioSource()!=MediaRecorder.AudioSource.VOICE_RECOGNITION){pause("Grabación detectada. Voz y escucha pausadas.");return;}
        if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){pause("Otra aplicación necesita el audio. Escucha pausada.");return;}
        report("RESPONDIENDO","JARVIS está hablando; después volverá a escuchar.");focused=true;speaking=true;afterSpeech=done;int sequence=++voiceSequence;
        if(tts.speak(text.substring(0,Math.min(4000,text.length())),TextToSpeech.QUEUE_FLUSH,null,String.valueOf(sequence))==TextToSpeech.ERROR){pause("No se pudo reproducir la voz.");return;}
        main.postDelayed(()->{if(sequence==voiceSequence&&speaking)pause("La reproducción tardó demasiado. Escucha pausada.");},180000);
    }
    void speechDone(String id){
        if(!id.equals(String.valueOf(voiceSequence))||!speaking)return;
        speaking=false;releaseFocus();Runnable done=afterSpeech;afterSpeech=null;if(done!=null)done.run();
    }
    void answer(String command){
        report("CONSULTANDO","Preparando la respuesta a tu petición…");notice("Consultando tu petición…");final int expected=generation;
        String key=Normalizer.normalize(command.toLowerCase(Locale.ROOT),Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("[^a-z0-9 ]","").trim();
        if(key.matches("(?:que hora es|dime la hora|la hora|hora actual)")){finishAnswer(command,"Son las "+DateFormat.getTimeInstance(DateFormat.SHORT,new Locale("es")).format(new Date())+".",expected);return;}
        if(key.contains("notificacion")){finishAnswer(command,"Esta versión no puede leer las notificaciones de otras aplicaciones.",expected);return;}
        worker.execute(()->{
            try{
                if(expected!=generation)return;
                JSONArray messages=new JSONArray(history.toString());messages.put(new JSONObject().put("role","user").put("content",command));
                JSONObject response=request("/api/chat",new JSONObject().put("messages",messages));String reply=response.getString("reply");
                if(response.optBoolean("openTasks")){
                    if(expected!=generation)return;
                    JSONObject tasks=request("/api/tasks",null);String alarms=Reminders.sync(this,tasks.getJSONArray("items").toString());
                    reply=reply.replace("Esta web no emite alarmas automáticas; puedes exportarlo a tu calendario para usar sus avisos.",alarms);
                }
                final String result=reply;main.post(()->finishAnswer(command,result,expected));
            }catch(Exception error){main.post(()->{if(expected==generation&&flow.state()==WakeConversation.State.THINKING)finishAnswer(command,"No pude confirmar la respuesta. Revisa la conexión y tu acceso privado en JARVIS. No he reintentado la petición.",expected);});}
        });
    }
    void finishAnswer(String command,String text,int expected){
        if(expected!=generation||!flow.answer())return;
        try{history.put(new JSONObject().put("role","user").put("content",command));history.put(new JSONObject().put("role","assistant").put("content",text));while(history.length()>12)history.remove(0);}catch(JSONException ignored){}
        MainActivity.backgroundReply(command,text);
        say(text,()->returnToWake());
    }
    JSONObject request(String path,JSONObject body)throws Exception{
        HttpsURLConnection current=(HttpsURLConnection)new URL(MainActivity.HOME+path).openConnection();connection=current;
        try{
            current.setInstanceFollowRedirects(false);current.setConnectTimeout(15000);current.setReadTimeout(45000);current.setRequestProperty("Authorization",PrivateLogin.authorization(this));current.setRequestProperty("Accept","application/json");
            if(body!=null){current.setRequestMethod("POST");current.setDoOutput(true);current.setRequestProperty("Content-Type","application/json");try(OutputStream out=current.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}}
            if(current.getResponseCode()!=200)throw new IOException("Private server request was not confirmed");
            try(InputStream in=current.getInputStream();ByteArrayOutputStream data=new ByteArrayOutputStream()){
                byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(data.size()+n>1000000)throw new IOException("Response too large");data.write(buffer,0,n);}return new JSONObject(data.toString(StandardCharsets.UTF_8.name()));
            }
        }finally{if(connection==current)connection=null;current.disconnect();}
    }
    @Override public void onDestroy(){
        running=false;if(!"ERROR".equals(status))report("INACTIVO","Escucha apagada. Pulsa Activar JARVIS para volver a escuchar.");MainActivity.backgroundModeChanged(false);generation++;flow.stop();main.removeCallbacksAndMessages(null);resetAudio();if(recordingMonitorRegistered)audio.unregisterAudioRecordingCallback(recordings);if(tts!=null)tts.shutdown();HttpsURLConnection current=connection;if(current!=null)current.disconnect();worker.shutdownNow();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
