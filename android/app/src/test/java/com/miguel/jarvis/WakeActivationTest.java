package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class WakeActivationTest {
    @Test public void oneActivationContinuesAfterBothPermissionsAndLogin() {
        WakeActivation flow=new WakeActivation();flow.begin();
        assertEquals(WakeActivation.Step.MICROPHONE,flow.next(true,false,false,true,true,false));
        flow.permissionResult(true);assertEquals(WakeActivation.Step.NOTIFICATIONS,flow.next(true,true,false,true,true,false));
        flow.permissionResult(true);assertEquals(WakeActivation.Step.LOGIN,flow.next(true,true,true,true,true,false));
        assertEquals(WakeActivation.Step.START,flow.next(true,true,true,true,true,true));assertTrue(flow.start());assertFalse(flow.start());
        assertEquals(WakeActivation.Step.IDLE,flow.next(true,true,true,true,true,true));
    }
    @Test public void denialAndCancellationNeverStartMicOrLoopPermissions() {
        WakeActivation flow=new WakeActivation();flow.begin();flow.permissionResult(false);
        assertFalse(flow.requested());assertFalse(flow.start());assertEquals(WakeActivation.Step.IDLE,flow.next(true,false,false,false,false,false));
        flow.begin();flow.cancel();assertFalse(flow.start());
    }
    @Test public void waitsForVisibleActivityAndRequiresVisibleNotificationChannel() {
        WakeActivation flow=new WakeActivation();flow.begin();
        assertEquals(WakeActivation.Step.FOREGROUND,flow.next(false,true,true,true,true,true));
        assertEquals(WakeActivation.Step.APP_NOTIFICATIONS,flow.next(true,true,true,false,false,true));
        assertEquals(WakeActivation.Step.CHANNEL,flow.next(true,true,true,true,false,true));
        assertEquals(WakeActivation.Step.START,flow.next(true,true,true,true,true,true));
    }
}
