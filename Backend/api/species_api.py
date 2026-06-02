from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import copy
import io
from glycowork.glycan_data.loader import df_species

species_api = APIRouter()

# Load DataFrame
species_df = pd.DataFrame(copy.deepcopy(df_species))

@species_api.get("/api/download")
def download_species_data(species: str):
    if not species:
        raise HTTPException(status_code=400, detail="Species name is required")

    # Case-insensitive filtering
    filtered_df = species_df[
        species_df["Species"].str.contains(species, case=False, na=False)
    ]

    if filtered_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for species: {species}")

    # Create CSV in memory
    buffer = io.StringIO()
    filtered_df.to_csv(buffer, index=False)
    buffer.seek(0)
    
    # Convert to bytes
    csv_bytes = io.BytesIO(buffer.getvalue().encode("utf-8"))
    csv_bytes.seek(0)

    # Return as streaming response
    filename = f"{species.replace(' ', '_')}_data.csv"
    return StreamingResponse(
        io.BytesIO(buffer.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
