package com.miguel.jarvis;
import android.content.*;
import android.os.Build;
public final class PhoneReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){String id=intent.getStringExtra("id"),action=intent.getAction();if(id==null||!id.matches("[a-zA-Z0-9-]{1,80}")||action==null)return;try{
        if(!action.equals("deliver")){if(action.matches("done|snooze|stop")){PhoneReminders.change(context,id,action);NativeChatActivity.refresh();}return;}
        String text=PhoneReminders.deliver(context,id,intent.getLongExtra("due",-1));if(text==null)return;
        if(WakeService.running&&WakeService.voiceReady&&!WakeService.status.equals("PAUSADO")){context.startService(new Intent(context,WakeService.class).setAction(WakeService.REMINDER).putExtra("text",text));return;}
        if(!ReminderVoiceService.allowed(context))return;
        try{Intent voice=new Intent(context,ReminderVoiceService.class).putExtra("text",text);if(Build.VERSION.SDK_INT>=26)context.startForegroundService(voice);else context.startService(voice);}catch(RuntimeException unavailable){/* The actionable notification remains when Android disallows background speech. */}
    }catch(Exception ignored){/* Never announce success when the state change was not confirmed. */}}
}
