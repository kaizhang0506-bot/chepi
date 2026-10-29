import sys, os, json, base64, io
from pathlib import Path
from http.server import BaseHTTPRequestHandler,HTTPServer
root=Path(__file__).parent
sys.path.insert(0,str(root/"vendor"))
os.environ["HF_HOME"]=str(root/"model-cache")
os.environ["HF_HUB_OFFLINE"]="1"
import numpy as np, cv2, torch
from PIL import Image
from transformers import AutoProcessor,CLIPSegForImageSegmentation
name="CIDAS/clipseg-rd64-refined"
processor=AutoProcessor.from_pretrained(name,local_files_only=True)
model=CLIPSegForImageSegmentation.from_pretrained(name,local_files_only=True).eval()
def dataurl(im):
 b=io.BytesIO();im.save(b,format="PNG");return "data:image/png;base64,"+base64.b64encode(b.getvalue()).decode()
def separate(raw):
 image=Image.open(io.BytesIO(base64.b64decode(raw.split(",",1)[1],validate=True))).convert("RGB")
 if image.width*image.height>4000000:raise ValueError("图片超过 400 万像素")
 w,h=image.size;source=np.asarray(image); occupied=np.zeros((h,w),dtype=bool);layers=[]
 for label,prompt in [("人物主体","anime woman character"),("艺术字或标题","stylized white text")]:
  inputs=processor(text=[prompt],images=[image],padding=True,return_tensors="pt")
  with torch.no_grad(): prediction=model(**inputs).logits
  probability=torch.sigmoid(prediction).squeeze().cpu().numpy()
  scaled=np.asarray(Image.fromarray(np.uint8(probability*255)).resize((w,h),Image.Resampling.BILINEAR))
  selected=(scaled>90)&~occupied
  if selected.sum()<w*h*.003:continue
  occupied|=selected
  rgba=np.dstack((source,selected.astype(np.uint8)*255))
  layers.append({"name":label,"src":dataurl(Image.fromarray(rgba)),"x":0,"y":0,"width":w,"height":h})
 if not layers:raise ValueError("未识别到可靠的人物或文字，请使用画笔")
 mask=(occupied.astype(np.uint8)*255); expanded=cv2.dilate(mask,np.ones((5,5),np.uint8))
 bgr=cv2.cvtColor(source,cv2.COLOR_RGB2BGR);filled=cv2.inpaint(bgr,expanded,3,cv2.INPAINT_TELEA)
 background=dataurl(Image.fromarray(cv2.cvtColor(filled,cv2.COLOR_BGR2RGB)))
 return {"width":w,"height":h,"background":background,"layers":layers,"warnings":["本地模型只尝试人物与标题，Logo 和其他装饰需要检查或手动补充。","背景由本地算法补绘，复杂纹理可能不准确；导出前请检查并修正。","文字为透明图片层，不能直接修改文字内容。"]}
class Handler(BaseHTTPRequestHandler):
 def do_POST(self):
  try:
   n=int(self.headers.get("Content-Length","0"))
   if self.path!="/separate" or n<1 or n>18000000:raise ValueError("请求无效或图片过大")
   data=json.loads(self.rfile.read(n));result=separate(data["image"]); status=200
  except Exception as e:result={"error":str(e)[:200]};status=400
  payload=json.dumps(result,ensure_ascii=False).encode();self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(payload)));self.end_headers();self.wfile.write(payload)
 def log_message(self,*args):pass
print("本地分层模型服务启动：127.0.0.1:8766",flush=True)
HTTPServer(("127.0.0.1",8766),Handler).serve_forever()
