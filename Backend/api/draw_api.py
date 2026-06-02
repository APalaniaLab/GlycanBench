from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
import warnings
from glycowork.motif.draw import GlycoDraw
from typing import Optional

warnings.filterwarnings("ignore", message=".*FigureCanvasAgg is non-interactive.*")

# Pydantic models
class DrawRequest(BaseModel):
    glycan: str
    highlight_motif: Optional[str] = None

class DrawResponse(BaseModel):
    image: str

draw_api = APIRouter()

@draw_api.post("/api/draw", response_model=DrawResponse)
def draw_glycan(request: DrawRequest):
    glycan = request.glycan.strip()
    motif = request.highlight_motif

    if not glycan:
        raise HTTPException(status_code=400, detail='No glycan sequence provided.')

    try:
        GlycoDraw(draw_this=glycan, highlight_motif=motif)
        fig = plt.gcf()
        fig.canvas.draw()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
        buf.seek(0)

        encoded_img = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        return DrawResponse(image=encoded_img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to draw glycan. Details: {str(e)}')
