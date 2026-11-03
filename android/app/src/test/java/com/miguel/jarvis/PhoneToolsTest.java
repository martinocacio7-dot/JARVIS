package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;
public class PhoneToolsTest {
    final ZonedDateTime now=ZonedDateTime.of(2026,11,3,10,0,0,0,ZoneId.of("America/Guayaquil"));
    @Test public void localReminderDatesRespectPhoneTimezoneAndDoNotNeedServer(){
        assertTrue(PhoneReminder.isRequest("Recuérdame tomar agua en cinco minutos"));assertFalse(PhoneReminder.isRequest("Qué es un recordatorio"));
        PhoneReminder r=PhoneReminder.parse("Recuérdame tomar agua en cinco minutos",now);assertEquals("tomar agua",r.text);assertEquals(now.plusMinutes(5),r.time);
        assertEquals(now.plusDays(1).withHour(9),PhoneReminder.parse("Recuérdame estudiar mañana a las nueve de la mañana",now).time);
        assertEquals(now.plusDays(1).withHour(9),PhoneReminder.parse("Hazme un recordatorio a las 9 sobre estudiar",now).time);
        assertNull(PhoneReminder.parse("Recuérdame estudiar hoy a las 9",now).time);
        assertNull(PhoneReminder.parse("Recuérdame estudiar a las 29:99",now).time);
        assertNull(PhoneReminder.parse("Recuérdame estudiar",now).time);
        assertEquals("entregar un informe",PhoneReminder.parse("Recuérdame entregar un informe en cinco minutos",now).text);
        assertEquals(now.plusDays(1).withHour(9).withMinute(30),PhoneReminder.parse("Recuérdame estudiar mañana a las nueve y media",now).time);
        assertNull(PhoneReminder.parse("Recuérdame estudiar en una hora y media",now).time);
        assertNull(PhoneReminder.parse("Recuérdame estudiar a las nueve menos diez",now).time);
    }
    @Test public void simpleLocalMathCannotExecuteCode(){
        assertEquals("14",PhoneMath.answer("Cuánto es 2 + 3 por 4"));assertEquals("20",PhoneMath.answer("(2+3)*4"));
        assertTrue(PhoneMath.answer("2 / 0").contains("cero"));assertNull(PhoneMath.answer("process.exit()"));assertNull(PhoneMath.answer("Recuérdame estudiar"));
    }
}
