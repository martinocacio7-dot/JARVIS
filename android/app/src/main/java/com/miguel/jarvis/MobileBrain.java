package com.miguel.jarvis;
import org.json.*;
import java.util.*;

/** On-device classifier and reviewed knowledge. No HTTP, remote model or WebView. */
public final class MobileBrain {
    final JSONObject bundle,model;final JSONArray entries,lessons;
    final Map<String,Integer> features=new HashMap<>();final Set<String> vocabulary=new HashSet<>();
    final Set<String> common=new HashSet<>(Arrays.asList("a al con de del el la las los un una unos unas que como en es mi tu me te se y o por para su lo le quiero puedes favor jarvis".split(" ")));
    final double[][] input,output;final double[] hiddenBias,outputBias;
    JSONObject current,lesson;String language="javascript",last="",topic="";int step=0;boolean pendingPlay=false;
    public MobileBrain(JSONObject data)throws JSONException{
        bundle=data;model=data.getJSONObject("model");entries=data.getJSONArray("entries");lessons=data.getJSONArray("lessons");
        JSONArray f=model.getJSONArray("features"),v=model.getJSONArray("vocabulary");for(int i=0;i<f.length();i++)features.put(f.getString(i),i);for(int i=0;i<v.length();i++)vocabulary.add(v.getString(i));
        input=matrix(model.getJSONArray("inputWeights"));output=matrix(model.getJSONArray("outputWeights"));hiddenBias=vector(model.getJSONArray("hiddenBias"));outputBias=vector(model.getJSONArray("outputBias"));
    }
    static double[] vector(JSONArray a)throws JSONException{double[] out=new double[a.length()];for(int i=0;i<out.length;i++)out[i]=a.getDouble(i);return out;}
    static double[][] matrix(JSONArray a)throws JSONException{double[][] out=new double[a.length()][];for(int i=0;i<out.length;i++)out[i]=vector(a.getJSONArray(i));return out;}
    boolean near(String a,String b){
        if(a.length()<4||b.length()<4||Math.abs(a.length()-b.length())>1)return false;
        int i=0,j=0,edits=0;
        while(i<a.length()&&j<b.length()){if(a.charAt(i)==b.charAt(j)){i++;j++;continue;}if(++edits>1)return false;
            if(a.length()==b.length()&&i+1<a.length()&&j+1<b.length()&&a.charAt(i)==b.charAt(j+1)&&a.charAt(i+1)==b.charAt(j)){i+=2;j+=2;continue;}
            if(a.length()>=b.length())i++;if(b.length()>=a.length())j++;
        }
        return edits+(i<a.length()||j<b.length()?1:0)<=1;
    }
    String correct(String token){if(vocabulary.contains(token))return token;Set<String> repeat=new HashSet<>();for(int i=1;i<token.length();i++)if(token.charAt(i)==token.charAt(i-1)){String reduced=token.substring(0,i)+token.substring(i+1);if(vocabulary.contains(reduced))repeat.add(reduced);}if(repeat.size()==1)return repeat.iterator().next();String match=null;for(String w:vocabulary)if(near(token,w)){if(match!=null)return token;match=w;}return match==null?token:match;}
    void feature(Map<Integer,Double> active,String key,double value){Integer index=features.get(key);if(index!=null)active.put(index,value);}
    public String predictIntent(String text)throws JSONException{
        String normalized=java.text.Normalizer.normalize(text.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("[^a-z0-9]+"," ").trim();String[] raw=normalized.isEmpty()?new String[0]:normalized.split("\\s+");
        List<String> tokens=new ArrayList<>();Map<Integer,Double> active=new LinkedHashMap<>();for(String token:raw)tokens.add(correct(token));
        for(int i=0;i<tokens.size();i++){String word=tokens.get(i);feature(active,"w:"+word,1);if(i>0)feature(active,"b:"+tokens.get(i-1)+" "+word,.7);String marked="^"+word+"$";for(int j=0;j<marked.length()-2;j++){long hash=0;for(int k=j;k<j+3;k++)hash=(hash*31+marked.charAt(k))&0xffffffffL;feature(active,"c:"+(hash%model.optInt("charBuckets",128)),.15);}}
        int known=0,count=0;for(String token:tokens)if(!common.contains(token)){count++;if(vocabulary.contains(token))known++;}if(count==0)for(String token:tokens){count++;if(vocabulary.contains(token))known++;}
        double[] hidden=new double[input.length];for(int h=0;h<hidden.length;h++){double sum=hiddenBias[h];for(Map.Entry<Integer,Double> x:active.entrySet())sum+=input[h][x.getKey()]*x.getValue();hidden[h]=Math.tanh(sum);}
        double[] scores=new double[output.length];double max=-Double.MAX_VALUE;for(int k=0;k<scores.length;k++){scores[k]=outputBias[k];for(int h=0;h<hidden.length;h++)scores[k]+=output[k][h]*hidden[h];max=Math.max(max,scores[k]);}
        double total=0;for(int k=0;k<scores.length;k++){scores[k]=Math.exp(scores[k]-max);total+=scores[k];}int best=0;double second=0;for(int k=0;k<scores.length;k++)scores[k]/=total;for(int k=1;k<scores.length;k++)if(scores[k]>scores[best])best=k;for(int k=0;k<scores.length;k++)if(k!=best)second=Math.max(second,scores[k]);
        return count>0&&(double)known/count>=.6&&scores[best]>=.75&&scores[best]-second>=.2?model.getJSONArray("intents").getJSONObject(best).getString("id"):"desconocido";
    }
    public void reset(){current=null;lesson=null;pendingPlay=false;last="";topic="";step=0;}
    public JSONObject snapshot()throws JSONException{
        String definition=current==null?"":current.getJSONArray("aliases").getString(0);
        return new JSONObject().put("version",1).put("model",model.optInt("version")).put("definition",definition).put("lesson",lesson==null?"":lesson.optString("id")).put("language",language).put("topic",topic).put("step",step).put("last",last.substring(0,Math.min(4000,last.length()))).put("pendingPlay",pendingPlay);
    }
    public void restore(JSONObject state)throws JSONException{
        reset();if(state==null||state.optInt("version")!=1||state.optInt("model",-1)!=model.optInt("version"))return;
        for(int i=0;i<entries.length();i++)if(entries.getJSONObject(i).getJSONArray("aliases").getString(0).equals(state.optString("definition")))current=entries.getJSONObject(i);
        for(int i=0;i<lessons.length();i++)if(lessons.getJSONObject(i).optString("id").equals(state.optString("lesson")))lesson=lessons.getJSONObject(i);
        String guide=state.optString("topic");if(bundle.getJSONObject("guides").has(guide)){topic=guide;step=Math.max(0,Math.min(state.optInt("step"),bundle.getJSONObject("guides").getJSONObject(guide).getJSONArray("steps").length()));}
        String selected=state.optString("language");language=lesson!=null&&lesson.getJSONObject("examples").has(selected)?selected:"javascript";last=state.optString("last");if(last.length()>4000)last=last.substring(0,4000);pendingPlay=state.optBoolean("pendingPlay");
    }
    public String answer(String input)throws JSONException{
        String text=DeviceCommands.key(input).replaceFirst("^(?:me puedes|puedes|podrias) (?:decirme|explicarme) ","");
        if(text.matches("olvida el contexto|nueva conversacion|cancela")){reset();return "De acuerdo. Empezamos una conversación nueva; tus recuerdos guardados siguen separados.";}
        if(text.matches("(?:que significa |que es )?pley")){pendingPlay=true;return "¿Te refieres a la palabra inglesa play o a la tienda Google Play?";}
        String choice=pendingPlay?(text.matches("la palabra|en ingles")?"play":text.matches("la tienda|de android")?"google play":text):text;pendingPlay=false;
        for(int i=0;i<entries.length();i++){JSONObject entry=entries.getJSONObject(i);JSONArray aliases=entry.getJSONArray("aliases");for(int j=0;j<aliases.length();j++){String alias=aliases.getString(j);if(choice.equals(alias)||choice.matches("(?:que es|que significa|explicame|hablame de) (?:la palabra |el |la |ser )?"+java.util.regex.Pattern.quote(alias))){current=entry;lesson=null;last=entry.getString("answer")+"\n\n"+entry.getString("example");return last;}}}
        if(current!=null&&text.matches("dame un ejemplo|un ejemplo|mas facil|en resumen|por que|dame la fuente")){last=text.contains("ejemplo")?current.getString("example"):text.equals("dame la fuente")?current.getString("source"):text.equals("por que")?current.getString("limit"):current.getString("answer");return last;}
        if(text.matches("de que hablabamos|que estabamos viendo|retoma el tema|retomemos|en que nos quedamos")){
            if(current!=null)return "Estábamos viendo «"+current.getJSONArray("aliases").getString(0)+"». Puedes pedirme un ejemplo, la fuente o una explicación más sencilla.";
            if(lesson!=null)return "Estábamos viendo "+lesson.getString("title")+" en "+language+". Puedes decir dame un ejemplo o por qué.";
            if(!topic.isEmpty())return "Estábamos hablando de "+bundle.getJSONObject("guides").getJSONObject(topic).getString("name")+". Di continúa para seguir con la guía.";
            return "Todavía no hay un tema para retomar en este chat. ¿Qué quieres aprender o resolver?";
        }
        current=null;boolean lessonMatched=false;
        for(int i=0;i<lessons.length();i++){JSONObject item=lessons.getJSONObject(i);JSONArray aliases=item.getJSONArray("aliases");for(int j=0;j<aliases.length();j++)if((" "+text+" ").contains(" "+aliases.getString(j)+" ")&&text.matches(".*(?:explica|que es|que son|aprender|ejemplo|funciona|significa).*")){lesson=item;lessonMatched=true;}}
        if(lesson!=null&&!lessonMatched&&!text.matches("dame un ejemplo|un ejemplo|en python|en javascript|python|javascript|en resumen|mas facil|por que|dame argumentos"))lesson=null;
        if(lesson!=null&&(text.matches(".*(?:explica|que es|que son|ejemplo|python|javascript|resumen|facil|por que|argumentos).*"))){
            if(text.contains("python"))language="python";if(text.contains("javascript"))language="javascript";
            JSONObject examples=lesson.getJSONObject("examples");if(!examples.has(language))language=examples.keys().next();
            if(text.contains("por que")||text.contains("argumentos")){JSONObject why=bundle.getJSONObject("arguments").getJSONObject(lesson.getString("id"));last=why.getString("reason")+"\n\n"+why.getString("example")+"\n\n"+why.getString("limit");}
            else if(text.contains("ejemplo"))last=examples.getJSONObject(language).getString("code")+"\n\nResultado: "+examples.getJSONObject(language).getString("output");
            else last=lesson.optJSONObject("explanation")!=null&&lesson.getJSONObject("explanation").has(language)?lesson.getJSONObject("explanation").getString(language):lesson.getString(text.contains("facil")||text.contains("resumen")?"simple":"summary");return last;
        }
        if(text.matches("repite|repitelo")&&!last.isEmpty())return last;
        String intent=predictIntent(input);
        if(intent.equals("identidad"))return "Soy JARVIS. Esta versión usa un clasificador propio y conocimiento revisado dentro de tu teléfono, sin consultar Render. No soy un modelo de conversación general.";
        if(intent.equals("ayuda"))return "Puedo responder con mi conocimiento instalado, explicar programación, calcular, guardar recuerdos y crear recordatorios de este teléfono. También puedo abrir aplicaciones. No necesito Render para el chat.";
        if(intent.equals("limites"))return "Mi conocimiento está limitado a lo incluido en este APK. No investigo en Internet ni genero programas o documentos arbitrarios. Escribir funciona sin conexión; el dictado Android necesita un proveedor e idioma disponibles.";
        if(intent.equals("continuar")&&!topic.isEmpty()){JSONObject guide=bundle.getJSONObject("guides").getJSONObject(topic);JSONArray steps=guide.getJSONArray("steps");last=step<steps.length()?"Seguimos con "+guide.getString("name")+". Paso "+(step+1)+": "+steps.getString(step++):"Llegamos al final de esta guía. Puedes elegir otro tema o pedirme un ejemplo de programación.";return last;}
        if(intent.equals("recordar_tema")&&(!topic.isEmpty()||lesson!=null))return "Estábamos hablando de "+(lesson!=null?lesson.getString("title"):bundle.getJSONObject("guides").getJSONObject(topic).getString("name"))+".";
        if(bundle.getJSONObject("guides").has(intent)){topic=intent;step=0;if(intent.equals("organizacion"))return "Elige hasta tres prioridades y separa lo urgente de lo importante. Si alguna tiene hora, puedo guardarla con recuérdame seguido de la tarea y cuándo. Di continúa para ver los pasos de organización.";}
        if(intent.equals("cancelar")){reset();return "De acuerdo. Dejamos este tema; puedes preguntarme otra cosa.";}
        if(intent.equals("desarrollo_codigo")||intent.equals("documentos")||intent.equals("biblioteca"))return "Esta pantalla funciona en tu teléfono. La generación de documentos y proyectos y la biblioteca del servidor todavía no están disponibles en este motor móvil. Puedo explicar programación, conceptos y tus datos locales.";
        if(intent.equals("entrenar_red"))return "El clasificador ya viene entrenado dentro del APK. Guardar recuerdos no modifica sus pesos; ampliar el entrenamiento requiere una nueva versión evaluada.";
        if(intent.equals("memoria"))return "La memoria móvil se guarda en este teléfono. Puedes decir recuerda que mi objetivo es aprender Python o preguntar mis recuerdos. No se sincroniza con Render.";
        if(intent.equals("desconocido"))return text.startsWith("que significa ")?"Buscas una definición, pero todavía no la tengo en mi vocabulario del teléfono. ¿En qué frase aparece?":"No pude identificar la petición. Puedes pedirme una definición, una explicación de programación, la fecha o un recordatorio local.";
        JSONArray intents=model.getJSONArray("intents");for(int i=0;i<intents.length();i++)if(intents.getJSONObject(i).getString("id").equals(intent)){last=intents.getJSONObject(i).getString("reply");return last;}
        return "¿Puedes darme más detalles?";
    }
}
