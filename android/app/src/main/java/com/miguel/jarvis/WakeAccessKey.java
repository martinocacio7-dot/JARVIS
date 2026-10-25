package com.miguel.jarvis;

import android.content.Context;
import android.security.keystore.*;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

/** Credentials are encrypted with a non-exportable Android Keystore key, never logged. */
final class WakeAccessKey {
    private static final String ALIAS = "jarvis.wake.access";
    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    static void save(Context context, String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        boolean saved=context.getSharedPreferences("wake_access", 0).edit().putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).putString("ciphertext", Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP)).commit();
        if(!saved)throw new java.io.IOException("No se pudo guardar la clave cifrada");
    }
    static String load(Context context) throws Exception {
        android.content.SharedPreferences prefs=context.getSharedPreferences("wake_access",0);
        String encrypted=prefs.getString("ciphertext",null),iv=prefs.getString("iv",null);
        if(encrypted==null||iv==null)return "";
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(encrypted,Base64.NO_WRAP)),StandardCharsets.UTF_8);
    }
    static void clear(Context context) { context.getSharedPreferences("wake_access", 0).edit().clear().apply(); }
}
