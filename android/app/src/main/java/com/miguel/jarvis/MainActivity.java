package com.miguel.jarvis;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.speech.*;
import android.speech.tts.*;
import android.webkit.*;
import android.widget.*;
import android.view.ViewGroup;
import android.view.View;
import org.json.*;
import java.util.*;
import java.io.*;
import java.lang.ref.WeakReference;

public final class MainActivity extends Activity {
    static WeakReference<MainActivity> active=new WeakReference<>(null);
    String sessionUser,sessionPassword;
    final WakeActivation activation=new WakeActivation();
    boolean activationDialog=false;
    int activationRequest=0;
    Button backgroundButton; TextView backgroundStatusView;
    static final String HOME="https://jarvis-privado-rmkm.onrender.com";
    WebView web; SpeechRecognizer recognition; TextToSpeech tts;
    volatile boolean trusted=false, foreground=false, windowFocused=false, ttsReady=false;
    AudioManager audio;
    AudioFocusRequest audioFocus;
    volatile int audioLease=0;
    int nextAudioLease=0;
    volatile long speechStoppedAt=0;
    AudioManager.AudioRecordingCallback recordings;
    int speechId=-1, pendingSpeech=-1; ValueCallback<Uri[]> files;
    byte[] download; String downloadName; TextView status;
    boolean allowed(String url) {
        if (url==null) return false;
        Uri uri=Uri.parse(url); return "https".equals(uri.getScheme()) && "jarvis-privado-rmkm.onrender.com".equals(uri.getHost()) && (uri.getPort()==-1 || uri.getPort()==443) && uri.getUserInfo()==null;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);removeLegacyWakeKey();active=new WeakReference<>(this);if(state!=null&&state.getBoolean("wakeActivationRequested",false)){activation.begin();activationRequest=state.getInt("wakeActivationRequest",0);}
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(11,14,19));root.setFitsSystemWindows(true);
        int buttonHeight=Math.round(48*getResources().getDisplayMetrics().density);
        LinearLayout bar=new LinearLayout(this);
        Button reload=new Button(this);reload.setText("JARVIS ↻");reload.setOnClickListener(v->web.loadUrl(HOME));bar.addView(reload,new LinearLayout.LayoutParams(0,buttonHeight,1));
        Button permissions=new Button(this);permissions.setText("Permisos");permissions.setOnClickListener(v->permissions());bar.addView(permissions,new LinearLayout.LayoutParams(0,buttonHeight,1));
        backgroundButton=new Button(this);backgroundButton.setText("Activar JARVIS");backgroundButton.setOnClickListener(v->backgroundMode());bar.addView(backgroundButton,new LinearLayout.LayoutParams(0,buttonHeight,1));
        for(int i=0;i<bar.getChildCount();i++){Button control=(Button)bar.getChildAt(i);control.setTextSize(11);control.setAllCaps(false);control.setMaxLines(2);control.setTextColor(Color.rgb(224,218,255));control.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(30,25,46)));}
        root.addView(bar);status=new TextView(this);status.setTextColor(Color.LTGRAY);status.setTextSize(12);status.setText("Conectando a tu JARVIS privado…");root.addView(status);
        backgroundStatusView=new TextView(this);backgroundStatusView.setTextColor(Color.rgb(155,190,255));backgroundStatusView.setTextSize(14);backgroundStatusView.setPadding(12,8,12,8);root.addView(backgroundStatusView);renderBackgroundStatus();
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));setContentView(root);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(false);settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.addJavascriptInterface(new Device(),"JarvisAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){trusted=allowed(url);status.setText("Conectando…");}
            @Override public void onPageFinished(WebView view,String url){trusted=allowed(url);status.setText(trusted?"JARVIS "+BuildConfig.VERSION_NAME+" · Detector local · Privado":"Página no disponible");emit("background-mode",0,String.valueOf(WakeService.running));renderBackgroundStatus();}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if (allowed(request.getUrl().toString())) return false;
                if (request.isForMainFrame() && "https".equals(request.getUrl().getScheme())) { try { startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl())); } catch (Exception ignored) {} }
                return true;
            }
            @Override public void onReceivedHttpAuthRequest(WebView view,HttpAuthHandler handler,String host,String realm){
                if (!trusted || !"jarvis-privado-rmkm.onrender.com".equals(host)) {handler.cancel();return;}
                LinearLayout fields=new LinearLayout(MainActivity.this);fields.setOrientation(LinearLayout.VERTICAL);
                EditText user=new EditText(MainActivity.this);user.setHint("Usuario de JARVIS");user.setSingleLine(true);user.setText("jarvis");fields.addView(user);
                EditText password=new EditText(MainActivity.this);password.setHint("Contraseña privada");password.setInputType(129);fields.addView(password);
                new AlertDialog.Builder(MainActivity.this).setTitle("Entrar a JARVIS").setView(fields).setPositiveButton("Entrar",(d,w)->{sessionUser=user.getText().toString();sessionPassword=password.getText().toString();handler.proceed(sessionUser,sessionPassword);password.setText("");}).setNegativeButton("Cancelar",(d,w)->handler.cancel()).setOnCancelListener(d->handler.cancel()).show();
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!trusted)return false;if(files!=null)files.onReceiveValue(null);files=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
                try {startActivityForResult(intent,3);}catch(Exception error){files.onReceiveValue(null);files=null;}return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();} // Native speech bridge handles microphone permission.
        });
        tts=new TextToSpeech(this,result->{ttsReady=result==TextToSpeech.SUCCESS;if(ttsReady){tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());tts.setLanguage(new Locale("es","EC"));tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){}public void onDone(String id){emit("tts-end",Integer.parseInt(id),"");}public void onError(String id){emit("tts-error",Integer.parseInt(id),"");}});emit("voices",0,"");}});
        audio=getSystemService(AudioManager.class);
        AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
        audioFocus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attributes).setOnAudioFocusChangeListener(change->{if(change<0)pauseAudio("JARVIS se ha detenido porque otra aplicación necesita el audio.");},new Handler(getMainLooper())).build();
        recordings=new AudioManager.AudioRecordingCallback(){@Override public void onRecordingConfigChanged(List<AudioRecordingConfiguration> configurations){
            if(!foreground || (recognition==null && audioLease==0))return;
            for(AudioRecordingConfiguration config:configurations) {
                // MIC may belong to the recognition provider itself; do not infer ownership from it.
                if(RecordingPolicy.interrupts(config.getClientAudioSource(), Build.VERSION.SDK_INT>=29 && config.isClientSilenced())){pauseAudio("JARVIS se ha detenido al detectar una grabación. Vuelve a activarlo cuando termines.");return;}
            }
        }};
        audio.registerAudioRecordingCallback(recordings,new Handler(getMainLooper()));
        web.loadUrl(HOME);
    }
    static void backgroundModeChanged(boolean enabled){MainActivity activity=active.get();if(activity!=null)activity.emit("background-mode",0,String.valueOf(enabled));}
    static void backgroundReply(String command,String reply){MainActivity activity=active.get();if(activity!=null&&activity.foreground)try{activity.emit("background-reply",0,new JSONObject().put("command",command).put("reply",reply).toString());}catch(JSONException ignored){}}
    static void backgroundStatusChanged(){MainActivity activity=active.get();if(activity!=null)activity.runOnUiThread(()->activity.renderBackgroundStatus());}
    void renderBackgroundStatus(){
        emit("wake-status",0,WakeService.status);
        if(backgroundStatusView!=null)backgroundStatusView.setText("Escucha fuera de la app: "+WakeService.status+"\n"+WakeService.statusText);
        if(backgroundButton!=null)backgroundButton.setText(WakeService.running||activation.requested()||"PREPARANDO".equals(WakeService.status)?"Apagar JARVIS":"Activar JARVIS");
    }
    void activationFailed(String message){activation.cancel();activationRequest=0;activationDialog=false;WakeService.report("ERROR",message);}
    void backgroundMode(){
        if(WakeService.running||activation.requested()||"PREPARANDO".equals(WakeService.status)){activation.cancel();activationRequest=0;stopService(new Intent(this,WakeService.class));WakeService.report("INACTIVO","Escucha apagada. Pulsa Activar JARVIS cuando quieras usarla.");return;}
        if(activationDialog)return;activationDialog=true;
        new AlertDialog.Builder(this).setTitle("Activar JARVIS por voz").setMessage("Al activarlo una vez podrás decir JARVIS desde otra aplicación. Mantendrá el micrófono activo y una notificación para pausarlo o apagarlo. El nombre se detecta localmente con Vosk y un modelo español incluido en el APK, sin cuenta ni AccessKey. Después del saludo, el dictado de la pregunta usa el proveedor Android y puede enviarle audio. Mantener la escucha fuera de la app consume batería. Pausa la escucha antes de grabar vídeos. El acceso privado se guarda cifrado con Android Keystore solo para consultar tu servidor en este modo.").setNegativeButton("Cancelar",(d,w)->activationDialog=false).setOnCancelListener(d->activationDialog=false).setPositiveButton("Activar",(d,w)->{activationDialog=false;activation.begin();WakeService.report("PREPARANDO","Comprobando permisos y acceso privado…");new Handler(getMainLooper()).postDelayed(()->continueActivation(),250);}).show();
    }
    void continueActivation(){
        if(!activation.requested()||activationDialog||activationRequest!=0)return;
        boolean login=false;
        try{if(sessionUser!=null&&sessionPassword!=null)PrivateLogin.save(this,sessionUser,sessionPassword);PrivateLogin.authorization(this);login=true;}catch(Exception ignored){}
        NotificationManager notices=getSystemService(NotificationManager.class);NotificationChannel channel=notices.getNotificationChannel("jarvis_listening");
        WakeActivation.Step step=activation.next(foreground&&windowFocused,checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED,Build.VERSION.SDK_INT<33||checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED,notices.areNotificationsEnabled(),channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE,login);
        switch(step){
            case MICROPHONE:activationRequest=5;WakeService.report("PERMISO PENDIENTE","Permite el micrófono en el diálogo de Android. La activación continuará sola.");requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},5);break;
            case NOTIFICATIONS:if(Build.VERSION.SDK_INT>=33){activationRequest=6;WakeService.report("PERMISO PENDIENTE","Permite las notificaciones para ver Pausar y Apagar. La activación continuará sola.");requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},6);}break;
            case APP_NOTIFICATIONS:activationRequest=7;WakeService.report("PERMISO PENDIENTE","Activa las notificaciones de JARVIS en Ajustes y vuelve a la app.");startActivityForResult(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()),7);break;
            case CHANNEL:activationRequest=8;WakeService.report("PERMISO PENDIENTE","Activa la notificación de escucha en Ajustes y vuelve a la app.");startActivityForResult(new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()).putExtra(Settings.EXTRA_CHANNEL_ID,"jarvis_listening"),8);break;
            case LOGIN:backgroundLogin();break;
            case START:launchBackgroundService();break;
            default:break;
        }
    }
    void launchBackgroundService(){
        if(!activation.start())return;
        try{
            final long attempt=++WakeService.activationAttempt;WakeService.listeningConfirmed=false;
            WakeService.report("PREPARANDO","Iniciando escucha. Espera la notificación de JARVIS…");
            pauseAudio("El modo de segundo plano controla la escucha.");startForegroundService(new Intent(this,WakeService.class));
            new Handler(getMainLooper()).postDelayed(()->{
                if(attempt==WakeService.activationAttempt&&!WakeService.listeningConfirmed&&"PREPARANDO".equals(WakeService.status)){
                    activationFailed(WakeService.running?"No terminó la preparación del detector o de la voz. Comprueba espacio libre y una voz española instalada; copia el diagnóstico desde Permisos.":"Android no confirmó el inicio. Revisa micrófono, notificaciones y la batería de JARVIS en Ajustes.");
                    stopService(new Intent(this,WakeService.class));
                }
            },45000);
        }catch(Exception error){activationFailed(error instanceof SecurityException?"Android rechazó el inicio del micrófono. Revisa sus permisos y activa este modo con JARVIS abierto.":"Android no permitió iniciar la escucha. Abre JARVIS, revisa sus permisos y vuelve a activar.");}
    }
    void backgroundLogin(){
        if(activationDialog)return;activationDialog=true;WakeService.report("ACCESO PENDIENTE","Introduce el usuario y contraseña de tu JARVIS privado en el teléfono.");
        LinearLayout fields=new LinearLayout(this);fields.setOrientation(LinearLayout.VERTICAL);
        EditText user=new EditText(this);user.setSingleLine(true);user.setText("jarvis");user.setHint("Usuario de JARVIS");fields.addView(user);
        EditText password=new EditText(this);password.setHint("Contraseña de JARVIS");password.setInputType(129);fields.addView(password);
        new AlertDialog.Builder(this).setTitle("Acceso privado para activar JARVIS").setView(fields).setNegativeButton("Cancelar",(d,w)->activationFailed("Activación cancelada antes de guardar el acceso.")).setOnCancelListener(d->activationFailed("Activación cancelada.")).setPositiveButton("Guardar cifrado y activar",(d,w)->{
            activationDialog=false;
            try{PrivateLogin.save(this,user.getText().toString(),password.getText().toString());password.setText("");new Handler(getMainLooper()).postDelayed(()->continueActivation(),250);}
            catch(Exception error){activationFailed("No se pudo guardar el acceso cifrado en este teléfono.");}
        }).show();
    }
    void removeLegacyWakeKey(){
        getSharedPreferences("wake_access",0).edit().clear().apply();
        try{java.security.KeyStore store=java.security.KeyStore.getInstance("AndroidKeyStore");store.load(null);if(store.containsAlias("jarvis.wake.access"))store.deleteEntry("jarvis.wake.access");}catch(Exception ignored){}
    }
    void localDetectorInfo(){
        new AlertDialog.Builder(this).setTitle("Detector local · sin cuenta")
            .setMessage("Esta versión incluye Vosk y un modelo español. No necesita AccessKey ni una cuenta externa para detectar JARVIS. La primera activación prepara los archivos en este teléfono y puede tardar unos segundos. Di JARVIS y espera el saludo antes de tu petición. La pregunta posterior usa el dictado Android y puede necesitar Internet. Pausa JARVIS antes de grabar vídeos. La detección depende de la pronunciación, el ruido y el micrófono.")
            .setPositiveButton("Entendido",null).show();
    }
    void permissions(){
        new AlertDialog.Builder(this).setTitle("Permisos de JARVIS").setItems(new String[]{"Micrófono", "Permitir avisos de recordatorios", "Alarmas y recordatorios a la hora exacta", "Instalar o configurar voz en español", "Privacidad", "Olvidar acceso del modo Fuera de app", "Detector local · sin cuenta", "Copiar diagnóstico de voz", "Segundo plano y batería"},(d,which)->{
            if(which==0)requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},1);
            if(which==1){if(Build.VERSION.SDK_INT>=33)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},2);else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));}
            if(which==2 && Build.VERSION.SDK_INT>=31)startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));
            if(which==3){try{startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));}catch(Exception error){new AlertDialog.Builder(this).setMessage("Abre Ajustes → Idioma y entrada → Síntesis de voz e instala una voz en español.").setPositiveButton("Entendido",null).show();}}
            if(which==4)new AlertDialog.Builder(this).setMessage("Esta versión consulta la hora en el teléfono y no puede leer las notificaciones de otras aplicaciones. El detector local del nombre utiliza Vosk con un modelo español incluido; no requiere cuenta, clave ni Internet para detectar el nombre. Después del saludo, el dictado depende del servicio Android y puede usar Internet o enviar audio a ese proveedor. Los pendientes se guardan en tu base de datos y se sincronizan con los avisos del teléfono al abrir o actualizar la app. La escucha de la pantalla se detiene al salir. El modo Fuera de app solo funciona si lo activas; mantiene una notificación para pausarlo y apagarlo. Si fuerzas la detención de la app, abre JARVIS para restaurar sus avisos.").setPositiveButton("Entendido",null).show();
            if(which==6)localDetectorInfo();
            if(which==8)new AlertDialog.Builder(this).setTitle("JARVIS fuera de la app")
                .setMessage("Activa JARVIS con la app abierta y espera ESCUCHANDO y la notificación. Después puedes salir con Inicio. Si el teléfono lo detiene, abre los ajustes de JARVIS y permite batería Sin restricciones o actividad en segundo plano; algunos fabricantes también ofrecen Inicio automático. La escucha mantiene la CPU activa y consume batería. Pausa antes de grabar vídeos. Forzar detención o reiniciar el teléfono apaga la escucha.")
                .setNegativeButton("Cerrar",null).setPositiveButton("Abrir ajustes",(dialog,button)->startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())))).show();
            if(which==7){android.content.ClipboardManager clipboard=getSystemService(android.content.ClipboardManager.class);clipboard.setPrimaryClip(ClipData.newPlainText("Diagnóstico JARVIS",WakeService.diagnostic()));Toast.makeText(this,"Diagnóstico copiado: versión y estados, sin claves ni conversaciones",Toast.LENGTH_LONG).show();}
            if(which==5){activation.cancel();activationRequest=0;WakeService.report("INACTIVO","Acceso cifrado eliminado. Escucha apagada.");stopService(new Intent(this,WakeService.class));PrivateLogin.clear(this);sessionUser=null;sessionPassword=null;Toast.makeText(this,"Acceso cifrado del modo Fuera de app eliminado",Toast.LENGTH_LONG).show();}
        }).show();
    }
    void emit(String type,int id,String text){runOnUiThread(()->{if(web==null||!trusted)return;try{JSONObject event=new JSONObject().put("type",type).put("id",id).put("text",text);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('jarvis:android',{detail:"+event+"}));",null);}catch(Exception ignored){}});}
    void endSpeech(){if(recognition!=null){recognition.destroy();recognition=null;speechStoppedAt=android.os.SystemClock.elapsedRealtime();}speechId=-1;}
    boolean audioBusy(boolean forSpeech){
        if(audio==null)return true;
        if(audio.getMode()==AudioManager.MODE_IN_CALL || audio.getMode()==AudioManager.MODE_IN_COMMUNICATION)return true;
        for(AudioRecordingConfiguration config:audio.getActiveRecordingConfigurations()) {
            if(!forSpeech && config.getClientAudioSource()==MediaRecorder.AudioSource.VOICE_RECOGNITION && android.os.SystemClock.elapsedRealtime()-speechStoppedAt<700)continue;
            return true;
        }
        return false;
    }
    synchronized int beginAudio(){
        if(WakeService.running || !trusted || !foreground || !windowFocused || audioBusy(false))return -1;
        if(audio.requestAudioFocus(audioFocus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED)return -1;
        audioLease=++nextAudioLease;return audioLease;
    }
    synchronized void finishAudio(int lease){if(lease==audioLease && audioLease!=0){audioLease=0;audio.abandonAudioFocusRequest(audioFocus);}}
    void pauseAudio(String message){
        endSpeech();if(tts!=null)tts.stop();finishAudio(audioLease);emit("audio-interrupted",0,message);
    }
    void startSpeech(int id){
        if(WakeService.running){emit("error",id,"audio-busy");return;}
        if(!foreground||!trusted||!windowFocused){emit("error",id,"audio-busy");return;}
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){pendingSpeech=id;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},1);return;}
        if(!SpeechRecognizer.isRecognitionAvailable(this)){emit("error",id,"service-not-allowed");return;}
        if(audioBusy(true)){emit("error",id,"audio-busy");return;}
        endSpeech();speechId=id;recognition=SpeechRecognizer.createSpeechRecognizer(this);
        recognition.setRecognitionListener(new RecognitionListener(){
            boolean ended=false;
            void finish(){if(ended)return;ended=true;if(speechId==id)endSpeech();emit("end",id,"");}
            public void onReadyForSpeech(Bundle b){emit("start",id,"");}public void onBeginningOfSpeech(){emit("speech",id,"");} public void onRmsChanged(float r){} public void onBufferReceived(byte[] b){} public void onEndOfSpeech(){} public void onEvent(int e,Bundle b){}
            public void onPartialResults(Bundle b){}
            public void onResults(Bundle b){ArrayList<String> results=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);if(results!=null&&!results.isEmpty())emit("result",id,results.get(0));finish();}
            public void onError(int error){if(ended)return;emit("error",id,error==SpeechRecognizer.ERROR_NO_MATCH||error==SpeechRecognizer.ERROR_SPEECH_TIMEOUT?"no-speech":error==SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS?"not-allowed":"network");finish();}
        });
        Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,"es-EC").putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
        recognition.startListening(intent);
    }
    final class Device {
        @JavascriptInterface public void activateWake(){runOnUiThread(()->{if(!trusted||!foreground)return;if(WakeService.running){if("PAUSADO".equals(WakeService.status))startService(new Intent(MainActivity.this,WakeService.class).setAction(WakeService.RESUME));}else backgroundMode();});}
        @JavascriptInterface public int appVersion(){return BuildConfig.VERSION_CODE;}
        @JavascriptInterface public boolean backgroundMode(){return WakeService.running;}
        @JavascriptInterface public int beginPlayback(){return beginAudio();}
        @JavascriptInterface public void endPlayback(int lease){finishAudio(lease);}
        @JavascriptInterface public void startRecognition(int id){runOnUiThread(()->startSpeech(id));}
        @JavascriptInterface public void stopRecognition(int id){runOnUiThread(()->{if(speechId==id&&recognition!=null)recognition.stopListening();});}
        @JavascriptInterface public void abortRecognition(int id){runOnUiThread(()->{if(speechId==id){endSpeech();emit("end",id,"");}});}
        @JavascriptInterface public String notifications(){return trusted&&foreground?"Esta versión de JARVIS no puede leer notificaciones de otras aplicaciones. Conserva la hora, la voz y los avisos de tus recordatorios.":"Abre JARVIS para consultar notificaciones.";}
        @JavascriptInterface public String syncReminders(String json){if(!trusted||!foreground)return "Abre JARVIS para sincronizar avisos.";try{return Reminders.sync(MainActivity.this,json);}catch(Exception error){return "No se pudieron programar los avisos en Android. Actualiza los pendientes.";}}
        @JavascriptInterface public String voices(){JSONArray result=new JSONArray();try{if(ttsReady&&tts.getVoices()!=null)for(Voice voice:tts.getVoices())if(voice.getLocale().getLanguage().equals("es")&&!voice.isNetworkConnectionRequired())result.put(new JSONObject().put("name",voice.getName()).put("voiceURI",voice.getName()).put("lang",voice.getLocale().toLanguageTag()).put("localService",true));}catch(Exception ignored){}return result.toString();}
        @JavascriptInterface public void speak(String text,String name,int id){runOnUiThread(()->{if(!trusted||!foreground||!ttsReady){emit("tts-error",id,"");return;}if(tts.getVoices()!=null)for(Voice voice:tts.getVoices())if(voice.getName().equals(name)&&!voice.isNetworkConnectionRequired())tts.setVoice(voice);if(tts.speak(text.substring(0,Math.min(4000,text.length())),TextToSpeech.QUEUE_FLUSH,null,String.valueOf(id))==TextToSpeech.ERROR)emit("tts-error",id,"");});}
        @JavascriptInterface public void stopSpeaking(){runOnUiThread(()->{if(tts!=null)tts.stop();});}
        @JavascriptInterface public void saveFile(String name,String mime,String data){if(!trusted||!foreground||data.length()>28000000)return;runOnUiThread(()->{if(download!=null){Toast.makeText(MainActivity.this,"Termina de guardar el archivo anterior.",Toast.LENGTH_SHORT).show();return;}try{download=android.util.Base64.decode(data,android.util.Base64.DEFAULT);downloadName=name.replaceAll("[^\\p{L}\\p{N}._ -]","_");startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE,downloadName),4);}catch(Exception error){download=null;}});}
    }
    @Override public void onRequestPermissionsResult(int request,String[] names,int[] grants){super.onRequestPermissionsResult(request,names,grants);if(request==5||request==6){activationRequest=0;boolean granted=grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED;activation.permissionResult(granted);if(granted)new Handler(getMainLooper()).postDelayed(()->continueActivation(),250);else activationFailed(request==5?"No se permitió el micrófono. Sin ese permiso JARVIS no puede oír su nombre.":"No se permitieron las notificaciones. Actívalas para poder pausar y apagar la escucha.");return;}if(request==1&&pendingSpeech!=-1){int id=pendingSpeech;pendingSpeech=-1;if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)startSpeech(id);else emit("error",id,"not-allowed");}if(request==2)Reminders.restore(this);}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==7||request==8){activationRequest=0;NotificationManager notices=getSystemService(NotificationManager.class);NotificationChannel channel=notices.getNotificationChannel("jarvis_listening");if(!notices.areNotificationsEnabled()||(channel!=null&&channel.getImportance()==NotificationManager.IMPORTANCE_NONE))activationFailed("La notificación de escucha sigue bloqueada. Actívala en Ajustes para continuar.");else new Handler(getMainLooper()).postDelayed(()->continueActivation(),250);return;}if(request==3&&files!=null){Uri[] chosen=null;if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){chosen=new Uri[data.getClipData().getItemCount()];for(int i=0;i<chosen.length;i++)chosen[i]=data.getClipData().getItemAt(i).getUri();}else if(data.getData()!=null)chosen=new Uri[]{data.getData()};}files.onReceiveValue(chosen);files=null;}if(request==4){if(result==RESULT_OK&&data!=null&&download!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(download);Toast.makeText(this,"Archivo guardado",Toast.LENGTH_SHORT).show();}catch(Exception error){Toast.makeText(this,"No se pudo guardar el archivo",Toast.LENGTH_SHORT).show();}download=null;}}
    @Override public void onWindowFocusChanged(boolean hasFocus){
        super.onWindowFocusChanged(hasFocus);windowFocused=hasFocus;if(hasFocus&&activation.requested())new Handler(getMainLooper()).post(()->continueActivation());
        if(!hasFocus && (recognition!=null || audioLease!=0 || pendingSpeech!=-1)) {
            pendingSpeech=-1;
            pauseAudio("JARVIS se ha detenido al cambiar de ventana para liberar el micrófono. Vuelve a activarlo cuando termines.");
        }
    }
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putBoolean("wakeActivationRequested",activation.requested());out.putInt("wakeActivationRequest",activationRequest);}
    @Override protected void onResume(){super.onResume();foreground=true;renderBackgroundStatus();if(activation.requested())new Handler(getMainLooper()).post(()->continueActivation());Reminders.restore(this);}
    @Override protected void onPause(){foreground=false;pendingSpeech=-1;endSpeech();if(tts!=null)tts.stop();finishAudio(audioLease);if(web!=null)web.evaluateJavascript("document.dispatchEvent(new Event('jarvis:android-pause'));",null);super.onPause();}
    @Override protected void onDestroy(){if(active.get()==this)active.clear();if(audio!=null&&recordings!=null)audio.unregisterAudioRecordingCallback(recordings);finishAudio(audioLease);endSpeech();if(tts!=null)tts.shutdown();if(files!=null)files.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("JarvisAndroid");web.destroy();web=null;}super.onDestroy();}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
