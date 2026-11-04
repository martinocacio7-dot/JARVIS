package com.miguel.jarvis;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import android.speech.tts.*;
import java.util.*;
/** Speaks a requested alarm without opening a microphone. Subject to Android FGS rules. */
public final class ReminderVoiceService extends Service {
    TextToSpeech voice;AudioManager audio;AudioFocusRequest focus;boolean ready,failed,speaking,focused,received;PowerManager.WakeLock cpu;final Handler main=new Handler(Looper.getMainLooper());final ArrayDeque<String> queue=new ArrayDeque<>();int sequence;
    static boolean allowed(Context c){try{
        NotificationManager n=c.getSystemService(NotificationManager.class);AudioManager a=c.getSystemService(AudioManager.class);
        if(!n.areNotificationsEnabled()||n.getCurrentInterruptionFilter()!=NotificationManager.INTERRUPTION_FILTER_ALL||a.getRingerMode()!=AudioManager.RINGER_MODE_NORMAL||a.getMode()!=AudioManager.MODE_NORMAL)return false;
        if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return false;
        for(AudioRecordingConfiguration recording:a.getActiveRecordingConfigurations())if(RecordingPolicy.interrupts(recording.getClientAudioSource(),Build.VERSION.SDK_INT>=29&&recording.isClientSilenced()))return false;
        return true;
    }catch(RuntimeException unavailable){return false;}}
    @Override public void onCreate(){super.onCreate();NotificationManager n=getSystemService(NotificationManager.class);n.createNotificationChannel(new NotificationChannel("reminder_voice","Recordatorio hablado",NotificationManager.IMPORTANCE_LOW));Notification notice=new Notification.Builder(this,"reminder_voice").setSmallIcon(com.miguel.jarvis.R.drawable.jarvis).setContentTitle("JARVIS · Recordatorio hablado").setContentText("Leyendo un aviso que programaste. No se activa el micrófono.").build();try{if(Build.VERSION.SDK_INT>=29)startForeground(204,notice,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(204,notice);}catch(RuntimeException error){failed=true;stopSelf();return;}
        if(!allowed(this)){failed=true;stopSelf();return;}
        cpu=getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"JARVIS:reminder");cpu.acquire(45000);
        audio=getSystemService(AudioManager.class);AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attributes).setOnAudioFocusChangeListener(change->{if(change<0)stopSelf();},main).build();
        voice=new TextToSpeech(this,result->{if(result!=TextToSpeech.SUCCESS){stopSelf();return;}Voice selected=null;if(voice.getVoices()!=null)for(Voice v:voice.getVoices())if(v.getLocale().getLanguage().equals("es")&&!v.isNetworkConnectionRequired()){selected=v;break;}if(selected==null){stopSelf();return;}voice.setVoice(selected);voice.setAudioAttributes(attributes);voice.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){}public void onDone(String id){main.post(()->{if(id.equals(String.valueOf(sequence))){speaking=false;next();}});}public void onError(String id){main.post(()->stopSelf());}});ready=true;next();});
        main.postDelayed(this::stopSelf,40000);watchAudio();
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){if(failed)return START_NOT_STICKY;received=true;String text=intent==null?null:intent.getStringExtra("text");if(text!=null&&text.length()<=700&&queue.size()<5)queue.add(text);if(ready)next();return START_NOT_STICKY;}
    void next(){if(!ready||speaking)return;if(queue.isEmpty()){if(received)stopSelf();return;}if(!allowed(this)){stopSelf();return;}if(!focused){if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){stopSelf();return;}focused=true;}speaking=true;if(voice.speak(queue.removeFirst(),TextToSpeech.QUEUE_FLUSH,null,String.valueOf(++sequence))==TextToSpeech.ERROR)stopSelf();}
    void watchAudio(){if(!allowed(this)){stopSelf();return;}main.postDelayed(this::watchAudio,500);}
    @Override public void onDestroy(){main.removeCallbacksAndMessages(null);if(voice!=null){voice.stop();voice.shutdown();}if(focused)audio.abandonAudioFocusRequest(focus);if(cpu!=null&&cpu.isHeld())cpu.release();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
