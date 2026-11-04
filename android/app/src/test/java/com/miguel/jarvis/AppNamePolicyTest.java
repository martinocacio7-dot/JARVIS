package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class AppNamePolicyTest {
    @Test public void recognizesDictatedWhatsAppNamesAndExplicitRequests(){
        for(String name:new String[]{"guassa","guasap","wasap","Whats App","WhatsApp"})assertEquals("whatsapp",DeviceCommands.appTarget("Jarvis ingresa a "+name));
        assertEquals("whatsapp",DeviceCommands.appTarget("Puedes abrir mi WhatsApp por favor"));
        assertEquals("whatsapp",DeviceCommands.appTarget("ingresa al guassa"));
        assertEquals("com.whatsapp",AppNamePolicy.packageName("guassa"));
        assertEquals("com.whatsapp.w4b",AppNamePolicy.packageName("wasap business"));
    }
    @Test public void neverTurnsQuestionsOrNegationsIntoLaunches(){
        assertNull(DeviceCommands.appTarget("No ingreses a guassa"));assertNull(DeviceCommands.appTarget("Cómo entrar a WhatsApp"));assertNull(DeviceCommands.appTarget("Puedes explicar WhatsApp"));
        assertEquals("guasapeando",AppNamePolicy.canonical("guasapeando"));
    }
}
