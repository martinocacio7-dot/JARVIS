package com.miguel.jarvis;
import android.content.Context;
import android.graphics.*;
import android.view.View;

/** A procedural illustration of the current state, not a live audio meter. */
final class NativeSphere extends View {
    final Paint paint=new Paint(3);AssistantScene.Mode mode=AssistantScene.Mode.IDLE;
    boolean active=true;final long start=android.os.SystemClock.uptimeMillis();
    NativeSphere(Context context){super(context);setContentDescription("Núcleo de JARVIS, en reposo. Toca para activar la escucha");setFocusable(true);setClickable(true);}
    void scene(AssistantScene.Mode value){if(mode!=value){mode=value;setContentDescription("Núcleo de JARVIS, "+AssistantScene.label(mode)+". Toca para activar o detener la escucha");}invalidate();}
    void moving(boolean value){active=value;invalidate();}
    int tint(){return mode==AssistantScene.Mode.ERROR?0xffffa678:mode==AssistantScene.Mode.PAUSED?0xff7a8b9c:0xff6de6f4;}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);float density=getResources().getDisplayMetrics().density;
        float cx=getWidth()/2f,cy=getHeight()*.43f,radius=Math.min(getWidth()*.24f,getHeight()*.32f);
        boolean motion=active&&AssistantScene.animated(mode)&&android.animation.ValueAnimator.areAnimatorsEnabled();
        double t=motion?(android.os.SystemClock.uptimeMillis()-start)/1000.0:0;
        float pulse=(float)(1+(mode==AssistantScene.Mode.SPEAKING?.06:.025)*Math.sin(t*3));radius*=pulse;
        paint.setStyle(Paint.Style.FILL);paint.setShader(new RadialGradient(cx,cy,radius*1.65f,new int[]{0x3340d8ee,0x1120b4da,0x0020b4da},null,Shader.TileMode.CLAMP));canvas.drawCircle(cx,cy,radius*1.65f,paint);paint.setShader(null);
        paint.setColor(tint());paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(density*.7f);paint.setAlpha(65);
        canvas.drawCircle(cx,cy,radius*1.16f,paint);canvas.drawArc(cx-radius*1.28f,cy-radius*1.28f,cx+radius*1.28f,cy+radius*1.28f,(float)(t*18+20),110,false,paint);
        canvas.drawArc(cx-radius*1.28f,cy-radius*1.28f,cx+radius*1.28f,cy+radius*1.28f,(float)(t*18+200),110,false,paint);paint.setStyle(Paint.Style.FILL);
        for(int i=0;i<480;i++){
            double y=1-2*(i+.5)/480,r=Math.sqrt(1-y*y),angle=i*2.3999632297+t*.22,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
            double distortion=mode==AssistantScene.Mode.SPEAKING?1+.045*Math.sin(i*.7+t*6):1;
            paint.setAlpha((int)(45+195*(z+1)/2));canvas.drawCircle(cx+(float)(x*radius*distortion),cy+(float)(y*radius*distortion),(float)(.7+1.1*(z+1)/2)*density,paint);
        }
        float base=getHeight()*.88f,spacing=Math.min(7*density,getWidth()/48f);
        for(int i=0;i<39;i++){
            double envelope=Math.exp(-Math.pow((i-19)/12.0,2));
            float height=(float)(2*density+(motion?(.4+.6*Math.abs(Math.sin(i*.8+t*(mode==AssistantScene.Mode.SPEAKING?7:3))))*envelope*12*density:0));
            paint.setAlpha(mode==AssistantScene.Mode.IDLE?60:180);float x=cx+(i-19)*spacing;canvas.drawRoundRect(x-density,base-height,x+density,base+height,density,density,paint);
        }
        if(motion&&isShown()&&getWindowVisibility()==VISIBLE)postInvalidateDelayed(33);
    }
    @Override protected void onDetachedFromWindow(){active=false;super.onDetachedFromWindow();}
}
