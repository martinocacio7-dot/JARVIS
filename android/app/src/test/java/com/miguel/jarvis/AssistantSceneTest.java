package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
public class AssistantSceneTest {
    @Test public void realStateOwnsAnimationAndPauseWinsOverStaleRequest(){
        assertEquals(AssistantScene.Mode.IDLE,AssistantScene.resolve(false,false,false,false,"RESPONDIENDO"));
        assertEquals(AssistantScene.Mode.PAUSED,AssistantScene.resolve(true,false,false,true,"PAUSADO"));
        assertEquals(AssistantScene.Mode.ERROR,AssistantScene.resolve(true,false,false,true,"ERROR"));
        assertEquals(AssistantScene.Mode.LISTENING,AssistantScene.resolve(false,false,false,true,"ESPERANDO PETICIÓN"));
        assertEquals(AssistantScene.Mode.SPEAKING,AssistantScene.resolve(false,true,false,false,"INACTIVO"));
        assertEquals(AssistantScene.Mode.THINKING,AssistantScene.resolve(true,false,false,false,"INACTIVO"));
        assertFalse(AssistantScene.animated(AssistantScene.Mode.IDLE));assertFalse(AssistantScene.animated(AssistantScene.Mode.PAUSED));
    }
}
