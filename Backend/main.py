import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.visualize_api import visualize_api
from api.species_api import species_api
from api.network_api import network_api
from api.characterize_api import characterize_api
from api.convert_api import convert_api
from api.motif_api import motif_api
from api.draw_api import draw_api
from api.descriptor_api import descriptor_api
from api.seq_align_api import seq_align_api
from api.pathway_api import pathway_api
from api.insight_api import insight_api
from api.model_api import model_api
from api.compare_api import compare_api
from api.cluster_api import cluster_api
from api.chat.router import chat_api

app = FastAPI(
    title="GlycanBench API",
    description="Backend API for GlycanBench - Glycan analysis and prediction platform",
    version="1.0.0"
)

# Configure CORS
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(visualize_api)
app.include_router(species_api)
app.include_router(network_api)
app.include_router(characterize_api)
app.include_router(convert_api)
app.include_router(motif_api)
app.include_router(draw_api)
app.include_router(descriptor_api)
app.include_router(seq_align_api)
app.include_router(pathway_api)
app.include_router(insight_api)
app.include_router(model_api)
app.include_router(compare_api)
app.include_router(cluster_api)
app.include_router(chat_api)

@app.get("/")
def health():
    return {"status": "GlycanBench backend running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000, reload=True)