from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
from glycowork.motif.analysis import characterize_monosaccharide
from typing import Optional

# Pydantic models
class CharacterizeRequest(BaseModel):
    sugar: str
    rank: Optional[str] = None
    focus: Optional[str] = None
    modifications: bool = False
    thresh: int = 10

class CharacterizeResponse(BaseModel):
    image: str

characterize_api = APIRouter()

@characterize_api.post("/api/characterize", response_model=CharacterizeResponse)
def characterize(request: CharacterizeRequest):
    sugar = request.sugar
    rank = request.rank
    focus = request.focus
    modifications = request.modifications
    thresh = request.thresh

    try:
        plt.figure(figsize=(10, 6))
        characterize_monosaccharide(sugar, rank=rank, focus=focus, modifications=modifications, thresh=thresh)
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return CharacterizeResponse(image=image_base64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
