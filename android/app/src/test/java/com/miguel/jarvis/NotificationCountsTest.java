package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class NotificationCountsTest {
    @Test public void countsEntriesPerAppExcludingGroupsAndOngoing(){
        String summary=NotificationCounts.summarize(Arrays.asList(new NotificationCounts.Entry("WhatsApp",false),new NotificationCounts.Entry("WhatsApp",false),new NotificationCounts.Entry("Chrome",false),new NotificationCounts.Entry("WhatsApp",true),new NotificationCounts.Entry("JARVIS",true)));
        assertTrue(summary.contains("Tienes 3 notificaciones"));assertTrue(summary.contains("2 de WhatsApp"));assertTrue(summary.contains("1 de Chrome"));assertFalse(summary.contains("de JARVIS"));
        assertTrue(summary.contains("no el número exacto de mensajes"));
    }
    @Test public void emptyAndRequestsDoNotGuessCounts(){
        assertTrue(NotificationCounts.summarize(Collections.emptyList()).startsWith("No hay"));
        assertTrue(DeviceCommands.notificationQuery("Jarvis cuántas notificaciones tengo"));
        assertTrue(DeviceCommands.notificationQuery("Lee mis notificaciones"));
        assertFalse(DeviceCommands.notificationQuery("Cómo funcionan las notificaciones en Android"));
    }
}
