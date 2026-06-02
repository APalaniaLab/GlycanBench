from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from glycowork.network.biosynthesis import construct_network
from glycowork.glycan_data.loader import lib
import traceback
from typing import List, Optional

# Pydantic models
class NetworkRequest(BaseModel):
    glycans: List[str]
    allowed_ptms: Optional[List[str]] = None
    permitted_roots: Optional[List[str]] = None
    edge_type: Optional[str] = None

class NetworkResponse(BaseModel):
    elements: List[dict]
    metadata: dict

# --- APIRouter for API routes ---
network_api = APIRouter()

# Get all unique PTMs from the library for frontend options
try:
    ALL_AVAILABLE_PTMS = sorted(list(set(lib.ptm_dict.keys())))
except AttributeError:
    print("Warning: lib.ptm_dict not found or structured as expected. Using empty PTM list.")
    ALL_AVAILABLE_PTMS = []
    
DEFAULT_PTMS = {'4Ac', '1P', 'OAc', '6S', '3P', 'OS', '6P', '3S'}
DEFAULT_ROOTS = ['Gal(b1-4)GlcNAc-ol', 'Gal(b1-4)Glc-ol']
AVAILABLE_EDGE_TYPES = ['monolink', 'full_reaction', 'enzyme']

@network_api.get("/api/network-parameters")
def get_network_parameters():
    """Returns available parameters for network construction."""
    return {
        "available_ptms": ALL_AVAILABLE_PTMS,
        "default_ptms": list(DEFAULT_PTMS),
        "default_roots": DEFAULT_ROOTS,
        "available_edge_types": AVAILABLE_EDGE_TYPES
    }

@network_api.post("/api/network", response_model=NetworkResponse)
def generate_network_enhanced(request: NetworkRequest):
    glycans_input = request.glycans
    allowed_ptms_req = request.allowed_ptms
    permitted_roots_req = request.permitted_roots
    edge_type_req = request.edge_type

    # Validate and set allowed_ptms
    if allowed_ptms_req is None:
        allowed_ptms = DEFAULT_PTMS
    else:
        allowed_ptms = set(ptm for ptm in allowed_ptms_req if ptm in ALL_AVAILABLE_PTMS or ptm in DEFAULT_PTMS)
        if not allowed_ptms and allowed_ptms_req:
            allowed_ptms = set()

    # Validate and set permitted_roots
    if permitted_roots_req is None or not permitted_roots_req:
        permitted_roots = set(DEFAULT_ROOTS)
    else:
        permitted_roots = set(p for p in permitted_roots_req if isinstance(p, str) and p.strip())
        if not permitted_roots:
            permitted_roots = set(DEFAULT_ROOTS)

    # Validate and set edge_type
    if edge_type_req is None or edge_type_req not in AVAILABLE_EDGE_TYPES:
        edge_type = 'monolink'
    else:
        edge_type = edge_type_req

    if not glycans_input:
        raise HTTPException(status_code=400, detail="Glycans must be a non-empty list of strings.")
    
    # Filter empty strings from glycans_input
    glycans_input_filtered = [g.strip() for g in glycans_input if g.strip()]
    if not glycans_input_filtered:
        raise HTTPException(status_code=400, detail="No valid glycan strings provided after filtering.")

    # Ensure permitted_roots is not empty
    if not permitted_roots:
        print("Warning: Permitted roots became empty. Reverting to default roots.")
        permitted_roots = set(DEFAULT_ROOTS)

    try:
        print(f"Constructing network with: glycans={len(glycans_input_filtered)}, ptms={allowed_ptms}, roots={permitted_roots}, edge_type='{edge_type}'")
        network = construct_network(
            glycans=glycans_input_filtered,
            allowed_ptms=allowed_ptms,
            edge_type=edge_type,
            permitted_roots=list(permitted_roots)
        )

        cy_elements = []
        input_glycan_set = set(glycans_input_filtered)

        for node_id in network.nodes():
            node_data = {
                "id": node_id, 
                "is_input": node_id in input_glycan_set, 
                "is_root": node_id in permitted_roots
            }
            if node_id == "Gal(b1-4)Glc-ol":
                node_data["special_type"] = "lactose_derivative"
            cy_elements.append({"data": node_data})
            
        for source, target, data in network.edges(data=True):
            edge_data = {"source": source, "target": target}
            cy_elements.append({"data": edge_data})
            
        # Add metadata about the network generation
        metadata = {
            "num_nodes": network.number_of_nodes(),
            "num_edges": network.number_of_edges(),
            "params_used": {
                "allowed_ptms": sorted(list(allowed_ptms)),
                "permitted_roots": sorted(list(permitted_roots)),
                "edge_type": edge_type,
                "input_glycans_count": len(glycans_input_filtered)
            }
        }

        return NetworkResponse(elements=cy_elements, metadata=metadata)

    except ValueError as ve:
        error_message = f"Invalid input for network construction: {str(ve)}"
        print(f"ValueError: {error_message}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=error_message)
    except Exception as e:
        error_message = f"An internal error occurred during network generation."
        print(f"Error generating network: {e}") 
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_message)
