package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;

public class DeviceCommandsTest {
    @Test public void dateUsesPhoneZoneEvenAcrossUtcDayBoundary() {
        ZonedDateTime now=Instant.parse("2026-10-27T02:30:00Z").atZone(ZoneId.of("America/Guayaquil"));
        assertEquals("Hoy es lunes 26 de octubre de 2026.",DeviceCommands.calendarReply("Jarvis, ¿qué día es hoy?",now));
        assertEquals("Hoy es lunes 26 de octubre de 2026.",DeviceCommands.calendarReply("Dime la fecha por favor",now));
        assertNull(DeviceCommands.calendarReply("Qué día entrego el informe",now));
    }
    @Test public void openingRequiresExplicitLaunchCommand() {
        assertEquals("whatsapp",DeviceCommands.appTarget("Jarvis entra a WhatsApp"));
        assertEquals("camara",DeviceCommands.appTarget("Ábreme la aplicación cámara, por favor"));
        assertNull(DeviceCommands.appTarget("No abras WhatsApp"));
        assertNull(DeviceCommands.appTarget("Dime cómo abrir WhatsApp"));
        assertNull(DeviceCommands.appTarget("abre https://example.com"));
    }
}
