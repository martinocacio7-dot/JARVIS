package com.miguel.jarvis;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.speech.*;
import android.speech.tts.*;
import android.webkit.*;
import android.widget.*;
import android.view.ViewGroup;
import org.json.*;
import java.util.*;
import java.io.*;

public final class MainActivity extends Activity {
    static final String HOME="https://jarvis-privado-rmkm.onrender.com";
    WebView web; SpeechRecognizer recognition; TextToSpeech tts;
    volatile boolean trusted=false, foreground=false, ttsReady=false;
    int speechId=-1, pendingSpeech=-1; ValueCallback<Uri[]> files;
    byte[] download; String downloadName; TextView status;
    boolean allowed(String url) {
        if (url==null) return false;
        Uri uri=Uri.parse(url); return "https".equals(uri.getScheme()) && "jarvis-privado-rmkm.onrender.com".equals(uri.getHost()) && (uri.getPort()==-1 || uri.getPort()==443) && uri.getUserInfo()==null;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(11,14,19));root.setFitsSystemWindows(true);
        int buttonHeight=Math.round(48*getResources().getDisplayMetrics().density);
        LinearLayout bar=new LinearLayout(this);
        Button reload=new Button(this);reload.setText("JARVIS ↻");reload.setOnClickListener(v->web.loadUrl(HOME));bar.addView(reload,new LinearLayout.LayoutParams(0,buttonHeight,1));
        Button permissions=new Button(this);permissions.setText("Permisos");permissions.setOnClickListener(v->permissions());bar.addView(permissions,new LinearLayout.LayoutParams(0,buttonHeight,1));
        root.addView(bar);status=new TextView(this);status.setTextColor(Color.LTGRAY);status.setTextSize(12);status.setText("Conectando a tu JARVIS privado…");root.addView(status);
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));setContentView(root);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(false);settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.addJavascriptInterface(new Device(),"JarvisAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){trusted=allowed(url);status.setText("Conectando…");}
            @Override public void onPageFinished(WebView view,String url){trusted=allowed(url);status.setText(trusted?"Privado · Escucha solo con la app abierta":"Página no disponible");}
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
                new AlertDialog.Builder(MainActivity.this).setTitle("Entrar a JARVIS").setView(fields).setPositiveButton("Entrar",(d,w)->{handler.proceed(user.getText().toString(),password.getText().toString());password.setText("");}).setNegativeButton("Cancelar",(d,w)->handler.cancel()).setOnCancelListener(d->handler.cancel()).show();
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
        tts=new TextToSpeech(this,result->{ttsReady=result==TextToSpeech.SUCCESS;if(ttsReady){tts.setLanguage(new Locale("es","EC"));tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){}public void onDone(String id){emit("tts-end",Integer.parseInt(id),"");}public void onError(String id){emit("tts-error",Integer.parseInt(id),"");}});emit("voices",0,"");}});
        web.loadUrl(HOME);
    }
    void permissions(){
        new AlertDialog.Builder(this).setTitle("Permisos de JARVIS").setItems(new String[]{"Micrófono", "Permitir avisos de recordatorios", "Alarmas y recordatorios a la hora exacta", "Privacidad"},(d,which)->{
            if(which==0)requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},1);
            if(which==1){if(Build.VERSION.SDK_INT>=33)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},2);else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));}
            if(which==2 && Build.VERSION.SDK_INT>=31)startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));
            if(which==3)new AlertDialog.Builder(this).setMessage("Esta versión consulta la hora en el teléfono y no puede leer las notificaciones de otras aplicaciones. El reconocimiento de voz depende del servicio Android y puede usar Internet. Los pendientes se guardan en tu base de datos y se sincronizan con los avisos del teléfono al abrir o actualizar la app. La escucha se detiene al salir. Si fuerzas la detención de la app, abre JARVIS para restaurar sus avisos.").setPositiveButton("Entendido",null).show();
        }).show();
    }
    void emit(String type,int id,String text){runOnUiThread(()->{if(web==null||!trusted)return;try{JSONObject event=new JSONObject().put("type",type).put("id",id).put("text",text);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('jarvis:android',{detail:"+event+"}));",null);}catch(Exception ignored){}});}
    void endSpeech(){if(recognition!=null){recognition.destroy();recognition=null;}speechId=-1;}
    void startSpeech(int id){
        if(!foreground||!trusted)return;
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){pendingSpeech=id;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},1);return;}
        if(!SpeechRecognizer.isRecognitionAvailable(this)){emit("error",id,"service-not-allowed");return;}
        endSpeech();speechId=id;recognition=SpeechRecognizer.createSpeechRecognizer(this);
        recognition.setRecognitionListener(new RecognitionListener(){
            boolean ended=false;
            void finish(){if(ended)return;ended=true;if(speechId==id)endSpeech();emit("end",id,"");}
            public void onReadyForSpeech(Bundle b){emit("start",id,"");}public void onBeginningOfSpeech(){} public void onRmsChanged(float r){} public void onBufferReceived(byte[] b){} public void onEndOfSpeech(){} public void onEvent(int e,Bundle b){}
            public void onPartialResults(Bundle b){}
            public void onResults(Bundle b){ArrayList<String> results=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);if(results!=null&&!results.isEmpty())emit("result",id,results.get(0));finish();}
            public void onError(int error){if(ended)return;emit("error",id,error==SpeechRecognizer.ERROR_NO_MATCH||error==SpeechRecognizer.ERROR_SPEECH_TIMEOUT?"no-speech":error==SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS?"not-allowed":"network");finish();}
        });
        Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,"es-EC").putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
        recognition.startListening(intent);
    }
    final class Device {
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
    @Override public void onRequestPermissionsResult(int request,String[] names,int[] grants){super.onRequestPermissionsResult(request,names,grants);if(request==1&&pendingSpeech!=-1){int id=pendingSpeech;pendingSpeech=-1;if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)startSpeech(id);else emit("error",id,"not-allowed");}if(request==2)Reminders.restore(this);}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==3&&files!=null){Uri[] chosen=null;if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){chosen=new Uri[data.getClipData().getItemCount()];for(int i=0;i<chosen.length;i++)chosen[i]=data.getClipData().getItemAt(i).getUri();}else if(data.getData()!=null)chosen=new Uri[]{data.getData()};}files.onReceiveValue(chosen);files=null;}if(request==4){if(result==RESULT_OK&&data!=null&&download!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(download);Toast.makeText(this,"Archivo guardado",Toast.LENGTH_SHORT).show();}catch(Exception error){Toast.makeText(this,"No se pudo guardar el archivo",Toast.LENGTH_SHORT).show();}download=null;}}
    @Override protected void onResume(){super.onResume();foreground=true;Reminders.restore(this);}
    @Override protected void onPause(){foreground=false;pendingSpeech=-1;endSpeech();if(tts!=null)tts.stop();if(web!=null)web.evaluateJavascript("document.dispatchEvent(new Event('jarvis:android-pause'));",null);super.onPause();}
    @Override protected void onDestroy(){endSpeech();if(tts!=null)tts.shutdown();if(files!=null)files.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("JarvisAndroid");web.destroy();web=null;}super.onDestroy();}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
