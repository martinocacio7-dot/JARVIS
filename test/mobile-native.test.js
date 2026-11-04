import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const java=name=>readFile(new URL(`../android/app/src/main/java/com/miguel/jarvis/${name}.java`,import.meta.url),'utf8');
test('el lanzador y servicio móvil no ejecutan el chat a través de Render ni WebView',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/android.permission.INTERNET/);
 assert.match(manifest,/<activity android:name="\.NativeChatActivity"[\s\S]*?android.intent.category.LAUNCHER/);
 for(const name of ['NativeChatActivity','OfflineAssistant','MobileBrain','WakeService'])assert.doesNotMatch(await java(name),/new WebView|\.loadUrl\(|openConnection\(|MainActivity\.HOME|api\/chat|PrivateLogin\.authorization/);
 assert.match(await java('WakeService'),/OfflineAssistant.reply/);
 assert.match(await java('NativeChatActivity'),/NativeSphere/);
});

test('el lector es una edición explícita; la edición reducida no contiene su implementación',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/android.permission.(?:READ_SMS|RECEIVE_SMS|INTERNET)|\.MainActivity/);
 assert.match(manifest,/android.permission.BIND_NOTIFICATION_LISTENER_SERVICE/);
 const full=await readFile(new URL('../android/app/src/withNotifications/java/com/miguel/jarvis/NotificationReader.java',import.meta.url),'utf8');
 const reduced=await readFile(new URL('../android/app/src/withoutNotifications/java/com/miguel/jarvis/NotificationReader.java',import.meta.url),'utf8');
 assert.match(full,/extends NotificationListenerService/);assert.doesNotMatch(full,/onNotificationPosted|openConnection|FileOutputStream/);
 assert.doesNotMatch(reduced,/extends NotificationListenerService|getActiveNotifications|Settings\.Secure/);
 assert.doesNotMatch(await java('ReminderVoiceService'),/createSpeechRecognizer|createOnDeviceSpeechRecognizer|new AudioRecord/);
});
