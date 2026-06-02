from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from glycowork.motif.query import get_insight, glytoucan_to_glycan
from glycowork.motif.processing import get_class 
import io
import sys
import traceback

from typing import List, Any

# Pydantic models
class InsightRequest(BaseModel):
    userInput: str

class InsightResponse(BaseModel):
    original_input: str
    analyzed_glycan_sequence: str
    glycan_class: str
    species: List[Any] = []
    phyla: List[Any] = []
    motifs: List[Any] = []
    glytoucan_id: str = "Not Found"
    cell_lines: List[Any] = []
    diseases: List[Any] = []

insight_api = APIRouter()

@insight_api.post('/api/glycan_insight', response_model=InsightResponse)
def glycan_insight(request: InsightRequest):
    user_input = request.userInput
    if not user_input:
        raise HTTPException(status_code=400, detail="No input provided")

    glycan_sequence = ""
    user_input = user_input.strip()

    # Step 1: Determine if it's a GlyTouCan ID or direct IUPAC
    try:
        if user_input.startswith('G') and '(' not in user_input:
            print(f"Detected GlyTouCan ID: {user_input}. Converting to sequence...")
            result_list = glytoucan_to_glycan([user_input])
            if result_list and result_list[0]:
                glycan_sequence = result_list[0]
            else:
                raise HTTPException(status_code=404, detail=f"Could not find a glycan sequence for ID: {user_input}")
        else:
            glycan_sequence = user_input
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed during input processing. Details: {str(e)}")

    # Step 2: Get Glycan Class
    try:
        glycan_class = get_class(glycan_sequence)
    except Exception:
        glycan_class = "Unknown"

    # Step 3: Capture stdout of get_insight
    original_stdout = sys.stdout
    buffer = io.StringIO()
    sys.stdout = buffer

    try:
        get_insight(glycan_sequence)
    except Exception as e:
        sys.stdout = original_stdout
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"An error occurred within the glycowork library. The sequence may be invalid. Details: {str(e)}")
    finally:
        sys.stdout = original_stdout

    output = buffer.getvalue()

    # Step 4: Parse output into structured JSON
    data = {
        "original_input": user_input,
        "analyzed_glycan_sequence": glycan_sequence,
        "glycan_class": glycan_class,
        "species": [],
        "phyla": [],
        "motifs": [],
        "glytoucan_id": "Not Found",
        "cell_lines": [],
        "diseases": []
    }

    for line in output.splitlines():
        try:
            if "This glycan occurs in the following species:" in line:
                data["species"] = eval(line.split(":", 1)[1].strip())
            elif "Here are the phyla" in line:
                data["phyla"] = eval(line.split(":", 1)[1].strip())
            elif "This glycan contains the following motifs:" in line:
                data["motifs"] = eval(line.split(":", 1)[1].strip())
            elif "This is the GlyTouCan ID for this glycan:" in line:
                data["glytoucan_id"] = line.split(":")[-1].strip()
            elif "This glycan has been reported to be expressed in:" in line:
                data["cell_lines"] = eval(line.split(":", 1)[1].strip())
            elif "This glycan has been reported to be dysregulated in" in line:
                disease_data = eval(line.split(":", 1)[1].strip())
                data["diseases"] = [entry for entry in disease_data if any(entry)]
        except (SyntaxError, IndexError):
            continue

    return InsightResponse(**data)