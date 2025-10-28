from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io

app = FastAPI()

# Autoriser React (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Charger le modèle YOLOv8
model = YOLO("best.pt") 
# Valeur de chaque pièce 
labels = {
    "50m": 50,
    "100m": 100,
    "200m": 200,
    "500m": 500,
    "1dt": 1000,
    "2dt": 2000,
    "5dt": 5000,
    "10dt": 10000,
    "20dt": 20000,
    "50dt": 50000,
}

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))

    # Détection rapide (GPU si disponible)
    results = model.predict(img)  

    total = 0
    detections = []

    for box in results[0].boxes:
        cls_id = int(box.cls)
        label = results[0].names[cls_id]
        conf = float(box.conf)
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        value = labels.get(label, 0)
        total += value
        detections.append({
            "label": label,
            "value": value,
            "conf": round(conf, 2),
            "box": [x1, y1, x2, y2]
        })

    return {"sum": total, "detections": detections}

