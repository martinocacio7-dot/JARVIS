package com.miguel.jarvis;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class TaskHistoryPolicyTest {
    @Test public void retainsPendingAndBoundsCompletedHistoryWithoutClaimingExecution()throws Exception{
        JSONArray data=new JSONArray();for(int i=0;i<60;i++)data.put(new JSONObject().put("id","done-"+i).put("completed",true));
        data.put(new JSONObject().put("id","pending").put("text","lavar platos").put("pending",false));JSONArray retained=TaskHistoryPolicy.retain(data);
        assertEquals(51,retained.length());assertEquals("done-10",retained.getJSONObject(0).getString("id"));assertEquals("pending",retained.getJSONObject(50).getString("id"));
        String summary=LocalControl.summary(new JSONObject().put("objetivo","Python"),retainedWithText(retained),false);assertTrue(summary.contains("1 pendientes"));assertTrue(summary.contains("50 marcados como hechos"));assertTrue(summary.contains("no comprobaciones"));assertTrue(summary.contains("avisos detenidos"));
    }
    JSONArray retainedWithText(JSONArray items)throws Exception{for(int i=0;i<items.length();i++)if(!items.getJSONObject(i).has("text"))items.getJSONObject(i).put("text","tarea");return items;}
}
