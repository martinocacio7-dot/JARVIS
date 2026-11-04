package com.miguel.jarvis;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.time.Instant;
public class ReminderFollowUpPolicyTest {
    JSONObject item(long due,int remaining)throws Exception{return new JSONObject().put("id","test").put("text","lavar los platos").put("dueAt",Instant.ofEpochMilli(due).toString()).put("pending",true).put("remaining",remaining);}
    @Test public void repeatsUntilDoneWithoutAcceptingDuplicateOrEarlyAlarm()throws Exception{
        long now=1000000;JSONObject item=item(now,-1);
        assertFalse(ReminderFollowUpPolicy.deliver(item,now,now-1));
        for(int n=0;n<20;n++){long due=Instant.parse(item.getString("dueAt")).toEpochMilli();assertTrue(ReminderFollowUpPolicy.deliver(item,due,due));assertEquals(-1,item.getInt("remaining"));assertEquals(due+300000,Instant.parse(item.getString("dueAt")).toEpochMilli());assertFalse(ReminderFollowUpPolicy.deliver(item,due,due));}
        item.put("completed",true).put("pending",false);long due=Instant.parse(item.getString("dueAt")).toEpochMilli();assertFalse(ReminderFollowUpPolicy.deliver(item,due,due));
    }
    @Test public void optionalLimitStopsAndLateDeliveryDoesNotCreateBurst()throws Exception{
        long due=1000000;JSONObject item=item(due,1);assertTrue(ReminderFollowUpPolicy.deliver(item,due,due+600000));assertEquals(due+900000,Instant.parse(item.getString("dueAt")).toEpochMilli());assertEquals(0,item.getInt("remaining"));long next=Instant.parse(item.getString("dueAt")).toEpochMilli();assertTrue(ReminderFollowUpPolicy.deliver(item,next,next));assertFalse(item.getBoolean("pending"));assertFalse(ReminderFollowUpPolicy.deliver(item,next,next));
    }
    @Test public void onlyExplicitRepliesAreActionsWithinPromptWindow(){
        assertEquals("done",ReminderFollowUpPolicy.response("Ya lo hice"));assertEquals("snooze",ReminderFollowUpPolicy.response("Todavía no"));assertEquals("stop",ReminderFollowUpPolicy.response("No me lo recuerdes más"));
        assertEquals("",ReminderFollowUpPolicy.response("sí"));assertEquals("",ReminderFollowUpPolicy.response("qué significa hecho"));assertTrue(ReminderFollowUpPolicy.canAnswer(100,101));assertFalse(ReminderFollowUpPolicy.canAnswer(101,101));
    }
    @Test public void snoozeUsesFiveMinutesFromAnswerAndDoneCannotBeResurrected()throws Exception{
        JSONObject item=item(1000000,-1);assertTrue(ReminderFollowUpPolicy.change(item,"snooze",2000000,-1));assertEquals(2300000,Instant.parse(item.getString("dueAt")).toEpochMilli());
        assertTrue(ReminderFollowUpPolicy.change(item,"stop",2100000,-1));assertFalse(item.getBoolean("pending"));assertFalse(ReminderFollowUpPolicy.deliver(item,2300000,2300000));
        assertTrue(ReminderFollowUpPolicy.change(item,"snooze",2400000,-1));assertTrue(item.getBoolean("pending"));assertTrue(ReminderFollowUpPolicy.change(item,"done",2400001,-1));assertTrue(item.getBoolean("completed"));assertFalse(ReminderFollowUpPolicy.change(item,"snooze",2500000,-1));assertFalse(item.getBoolean("pending"));
    }
}
