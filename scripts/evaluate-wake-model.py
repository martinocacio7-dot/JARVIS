import ctypes,espeakng_loader,os,wave,audioop,json
from pathlib import Path
import argparse,importlib.metadata
from vosk import Model,KaldiRecognizer,SetLogLevel
lib=ctypes.CDLL(espeakng_loader.get_library_path())
lib.espeak_Initialize.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_char_p,ctypes.c_int]
rate=lib.espeak_Initialize(2,0,str(Path(espeakng_loader.get_data_path()).parent).encode(),0)
chunks=[]
CB=ctypes.CFUNCTYPE(ctypes.c_int,ctypes.POINTER(ctypes.c_short),ctypes.c_int,ctypes.c_void_p)
@CB
def cb(ptr,n,events):
 if ptr and n:chunks.append(ctypes.string_at(ptr,n*2))
 return 0
lib.espeak_SetSynthCallback(cb)
lib.espeak_SetVoiceByName.argtypes=[ctypes.c_char_p]
lib.espeak_Synth.argtypes=[ctypes.c_void_p,ctypes.c_size_t,ctypes.c_uint,ctypes.c_int,ctypes.c_uint,ctypes.c_uint,ctypes.c_void_p,ctypes.c_void_p]
parser=argparse.ArgumentParser()
parser.add_argument('--model',required=True)
parser.add_argument('--output',required=True)
parser.add_argument('--extended',action='store_true')
args=parser.parse_args()
SetLogLevel(-1);model=Model(args.model)
grammar=["jarvis","hola","gracias","buenos días","adiós","javier","carlos","avisa","servicio","mañana","quiero","que hora es","[unk]"]
positives=['Jarvis','Oye Jarvis','Jarvis por favor']
negatives=['Gracias por la ayuda','Vamos a cenar en casa','Buenos días señor','Javier ven un momento','¿Qué hora es?','Mañana tengo trabajo','Me llamo Miguel','El servicio está cerrado','Necesito crear un informe','Pon la cámara a grabar','Abre la puerta','La lavadora terminó']
if args.extended:
 positives=['Jarvis despierta','Hola Jarvis dime','Jarvis me escuchas']
 negatives=['El jardín está bonito','¿Ya ves la pantalla?','Lleva las llaves','Javier está en casa','El árbitro llegó','Gracias por venir','Harvey viene mañana','Es tarde para salir','Me avisas después','Hay varios archivos','La grabación empieza ahora','Estoy trabajando con el ordenador']
results=[]

for voice in ['es','es-la','en-us']:
 lib.espeak_SetVoiceByName(voice.encode())
 for idx,text in enumerate(positives+negatives):
  chunks.clear();b=text.encode();lib.espeak_Synth(b,len(b)+1,0,1,0,1,None,None)
  pcm,_=audioop.ratecv(b''.join(chunks),2,1,rate,16000,None)
  r=KaldiRecognizer(model,16000,json.dumps(grammar,ensure_ascii=False));r.SetWords(True)
  records=[]
  data=bytes(16000)+pcm+bytes(32000)
  for i in range(0,len(data),3200):
   if r.AcceptWaveform(data[i:i+3200]):records.append(json.loads(r.Result()))
  records.append(json.loads(r.FinalResult()))
  detected=any(w['word']=='jarvis' and w['conf']>=.85 for result in records for w in result.get('result',[]))
  row=dict(voice=voice,text=text,expected=idx<len(positives),detected=detected,results=records)
  results.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
report={'note':'Synthetic eSpeak voices only. Not a phone/microphone test or an estimate of real-world accuracy. Android Vosk SDK is 0.3.75; these acoustic checks use Python Vosk '+importlib.metadata.version('vosk')+'.',
'grammar':grammar,'threshold':.85,'results':results}
Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
