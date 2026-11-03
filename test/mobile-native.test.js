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

test('la edición mínima no declara acceso a notificaciones ni componentes web heredados',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 assert.doesNotMatch(manifest,/BIND_NOTIFICATION_LISTENER_SERVICE|NotificationListenerService|\.NotificationReader|\.MainActivity|android.permission.(?:READ_SMS|RECEIVE_SMS|INTERNET)/);
 assert.doesNotMatch(await java('NotificationReader'),/extends NotificationListenerService|getActiveNotifications|Settings\.Secure/);
 assert.doesNotMatch(await java('NativeChatActivity'),/ACTION_NOTIFICATION_LISTENER_SETTINGS/);
});
