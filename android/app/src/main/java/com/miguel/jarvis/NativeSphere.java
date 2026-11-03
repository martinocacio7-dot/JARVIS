package com.miguel.jarvis;
import android.content.Context;
import android.graphics.*;
import android.view.View;
final class NativeSphere extends View {
    final Paint paint=new Paint(3);boolean moving;final long start=android.os.SystemClock.uptimeMillis();
    NativeSphere(Context context){super(context);setContentDescription("Esfera de JARVIS. Toca para activar la escucha");setFocusable(true);setClickable(true);}
    void moving(boolean value){moving=value;invalidate();}
    @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float cx=getWidth()/2f,cy=getHeight()/2f;double time=moving?(android.os.SystemClock.uptimeMillis()-start)/1200.0:0;float radius=Math.min(cx,cy)*.78f*(float)(moving?1+.025*Math.sin(time*3):1);
        for(int i=0;i<320;i++){double y=1-2*(i+.5)/320,r=Math.sqrt(1-y*y),angle=i*2.3999632297+time*.3,x=Math.cos(angle)*r,z=Math.sin(angle)*r;paint.setColor(Color.rgb(197,166,245));paint.setAlpha((int)(70+185*(z+1)/2));float size=(float)(1.2+1.3*(z+1)/2)*getResources().getDisplayMetrics().density;canvas.drawCircle(cx+(float)x*radius,cy+(float)y*radius,size,paint);}
        if(moving&&getWindowVisibility()==VISIBLE)postInvalidateOnAnimation();
    }
    @Override protected void onDetachedFromWindow(){moving=false;super.onDetachedFromWindow();}
}
