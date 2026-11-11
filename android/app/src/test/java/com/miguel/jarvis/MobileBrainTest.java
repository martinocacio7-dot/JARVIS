package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
public class MobileBrainTest {
    JSONObject data()throws Exception{try(InputStream in=getClass().getResourceAsStream("/mobile-brain.json")){assertNotNull(in);return new JSONObject(new String(in.readAllBytes(),StandardCharsets.UTF_8));}}
    @Test public void usesBundledModelWithSamePredictionsAsNodeFixtures()throws Exception{
        JSONObject data=data();MobileBrain brain=new MobileBrain(data);JSONArray fixtures=data.getJSONArray("fixtures");
        for(int i=0;i<fixtures.length();i++){JSONObject sample=fixtures.getJSONObject(i);assertEquals(sample.getString("text"),sample.getString("intent"),brain.predictIntent(sample.getString("text")));}
    }
    @Test public void localConceptsAndProgrammingWorkWithoutAnyServer()throws Exception{
        MobileBrain brain=new MobileBrain(data());assertTrue(brain.answer("Qué significa guapo").contains("atractiva"));assertTrue(brain.answer("Dame un ejemplo").contains("camisa"));
        assertTrue(brain.answer("Qué es astetic").contains("estético"));assertTrue(brain.answer("Explica variables en Python").contains("Python"));assertTrue(brain.answer("Dame un ejemplo").contains("print("));
        assertTrue(brain.answer("Por qué").contains("nombres"));brain.reset();assertFalse(brain.answer("Dame un ejemplo").contains("print("));
        assertTrue(brain.answer("Qué significa quuxzz").contains("todavía no"));
    }
    @Test public void staleTopicNeverAnswersAnUnrelatedDefinition()throws Exception{
        MobileBrain brain=new MobileBrain(data());brain.answer("Explica variables en Python");assertFalse(brain.answer("Qué es quuxzz").contains("En Python"));
    }
    @Test public void resumesEachLessonAndDefinitionWithoutReplayingActions()throws Exception{
        MobileBrain first=new MobileBrain(data());first.answer("Explica variables en Python");JSONObject saved=first.snapshot();
        MobileBrain second=new MobileBrain(data());second.restore(saved);assertTrue(second.answer("De qué hablábamos").contains("python"));assertTrue(second.answer("Dame un ejemplo").contains("print("));
        first.reset();first.answer("Qué significa guapo");second.restore(first.snapshot());assertTrue(second.answer("Retomemos").contains("guapo"));assertTrue(second.answer("Dame un ejemplo").contains("camisa"));
        first.reset();first.answer("Quiero aprender programación");assertTrue(first.answer("Continúa").contains("Paso 1"));second.restore(first.snapshot());assertTrue(second.answer("Continúa").contains("Paso 2"));
        second.restore(null);assertTrue(second.answer("Retomemos").contains("Todavía no"));
        saved.put("model",-100);second.restore(saved);assertTrue(second.answer("Retomemos").contains("Todavía no"));
    }
}
