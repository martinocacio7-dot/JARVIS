package com.miguel.jarvis;
import android.content.*;
import android.os.*;
import android.speech.*;
import java.util.function.*;

/** Bounded support discovery before capture, guarded against late callbacks. */
final class SpanishRecognition {
    static Intent request(String language,boolean offline){return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,language).putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1).putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,offline);}
    static void start(Context context,SpeechRecognizer recognizer,boolean local,String override,BooleanSupplier active,BiConsumer<String,Boolean> selected,Consumer<Intent> begin){
        Handler handler=new Handler(Looper.getMainLooper());boolean[] started={false};
        BiConsumer<String,Boolean> launch=(language,offline)->{if(started[0]||!active.getAsBoolean())return;started[0]=true;selected.accept(language,offline);begin.accept(request(language,offline));};
        if(override!=null&&!override.isEmpty()){launch.accept(override,local);return;}
        String saved=context.getSharedPreferences("speech_languages",0).getString(local?"local":"default","es-ES");
        if(android.os.Build.VERSION.SDK_INT>=33){
            try{recognizer.checkRecognitionSupport(request(saved,true),context.getMainExecutor(),new RecognitionSupportCallback(){
                public void onSupportResult(RecognitionSupport support){String language=SpeechLanguagePolicy.select(support.getInstalledOnDeviceLanguages(),saved);if(language!=null){launch.accept(language,true);return;}if(!local){language=SpeechLanguagePolicy.select(support.getOnlineLanguages(),saved);if(language!=null){launch.accept(language,false);return;}}launch.accept("es-ES",true);}
                public void onError(int code){launch.accept("es-ES",true);}
            });}catch(RuntimeException error){launch.accept("es-ES",true);}
            handler.postDelayed(()->launch.accept("es-ES",true),2000);
        }else launch.accept("es-ES",true);
    }
    static void remember(Context context,boolean local,String language){context.getSharedPreferences("speech_languages",0).edit().putString(local?"local":"default",language).apply();}
}
