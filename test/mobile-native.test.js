import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const java=name=>readFile(new URL(`../android/app/src/main/java/com/miguel/jarvis/${name}.java`,import.meta.url),'utf8');
test('el lanzador y servicio móvil no ejecutan el chat a través de Render ni WebView',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.match(manifest,/android.permission.INTERNET/); // Explicit Google queries now have their own opt-in transport.
 assert.match(manifest,/<activity android:name="\.NativeChatActivity"[\s\S]*?android.intent.category.LAUNCHER/);
 for(const name of ['NativeChatActivity','OfflineAssistant','MobileBrain','WakeService'])assert.doesNotMatch(await java(name),/new WebView|\.loadUrl\(|openConnection\(|MainActivity\.HOME|api\/chat|PrivateLogin\.authorization/);
 assert.match(await java('WakeService'),/OfflineAssistant.reply/);
 assert.match(await java('NativeChatActivity'),/NativeSphere/);
});

test('el lector es una edición explícita; la edición reducida no contiene su implementación',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/android.permission.(?:READ_SMS|RECEIVE_SMS)|\.MainActivity/);
 assert.match(manifest,/android.permission.BIND_NOTIFICATION_LISTENER_SERVICE/);
 const full=await readFile(new URL('../android/app/src/withNotifications/java/com/miguel/jarvis/NotificationReader.java',import.meta.url),'utf8');
 const reduced=await readFile(new URL('../android/app/src/withoutNotifications/java/com/miguel/jarvis/NotificationReader.java',import.meta.url),'utf8');
 assert.match(full,/extends NotificationListenerService/);assert.doesNotMatch(full,/onNotificationPosted|openConnection|FileOutputStream/);
 assert.doesNotMatch(reduced,/extends NotificationListenerService|getActiveNotifications|Settings\.Secure/);
 assert.doesNotMatch(await java('ReminderVoiceService'),/createSpeechRecognizer|createOnDeviceSpeechRecognizer|new AudioRecord/);
});

test('la red móvil se limita al adaptador optativo de Google, sin conversación ni notificaciones',async()=>{
 const transport=await java('GoogleSearchClient');assert.match(transport,/www.googleapis.com/);assert.match(transport,/setInstanceFollowRedirects\(false\)/);assert.match(transport,/131072/);assert.doesNotMatch(transport,/mobile_chats|mobile_memory|NotificationReader|WakeService|api\/chat/);
 assert.match(await java('OfflineAssistant'),/GoogleSearchClient.configured\(context\)/);
});
