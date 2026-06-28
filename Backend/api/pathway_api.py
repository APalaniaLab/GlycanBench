from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import urllib.parse
import logging
import io

pathway_api = APIRouter()

# Configure logging for this module/blueprint
# This will use the root logger or a logger specific to this module's name
# if you want more granular control.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(module)s - %(message)s')
logger = logging.getLogger(__name__) # Get a logger specific to this module

# KEGG API Endpoints
KEGG_FIND_PATHWAY_URL = "http://rest.kegg.jp/find/pathway/{query}"
KEGG_REST_IMAGE_URL_PATTERN = "https://rest.kegg.jp/get/{kegg_id}/image"
KEGG_DIRECT_IMAGE_URL_PATTERN = "https://www.kegg.jp/kegg/pathway/{pathway_id_part}/{pathway_id_full}.png"


@pathway_api.get("/api/pathway")
def get_pathway_image_url(kegg_id: str):
    logger.info(f"Received /pathway request: kegg_id='{kegg_id}'")

    if not kegg_id:
        logger.warning("Missing KEGG Pathway ID in request.")
        raise HTTPException(status_code=400, detail="Missing KEGG Pathway ID")

    plain_img_url_to_try = KEGG_REST_IMAGE_URL_PATTERN.format(kegg_id=kegg_id)
    logger.info(f"Attempting plain image via KEGG REST API: {plain_img_url_to_try}")

    try:
        response = requests.get(plain_img_url_to_try, stream=True, timeout=15, allow_redirects=True)
        final_url = response.url
        content_type = response.headers.get('Content-Type', '').lower()

        logger.info(f"KEGG REST API image response: Status {response.status_code}, Content-Type '{content_type}', Final URL '{final_url}'")

        if response.status_code == 200 and 'image' in content_type:
            logger.info(f"Successfully identified plain image for '{kegg_id}' via REST API.")
            return {
                "img_url": final_url,
                "kegg_id_used": kegg_id,
            }
        else:
            logger.warning(f"KEGG REST API did not return a valid image for '{kegg_id}'. Status: {response.status_code}, Content-Type: {content_type}. Will try direct PNG link.")
    except requests.exceptions.Timeout:
        logger.error(f"Timeout requesting KEGG pathway via REST API for '{kegg_id}'. URL: {plain_img_url_to_try}")
    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException for KEGG pathway via REST API '{kegg_id}': {e}. URL: {plain_img_url_to_try}")

    logger.info(f"Falling back to direct PNG link construction for '{kegg_id}'.")
    pathway_id_part = ""
    pathway_id_full = kegg_id

    if len(kegg_id) >= 3 and not kegg_id[:3].isdigit() and kegg_id[3:].isdigit():
        pathway_id_part = kegg_id[:3].lower()
    elif kegg_id.lower().startswith("map") and kegg_id[3:].isdigit():
        pathway_id_part = "map"
    elif kegg_id.isdigit() and len(kegg_id) == 5:
        pathway_id_part = "map"
        pathway_id_full = f"map{kegg_id}"
    else:
        logger.error(f"Cannot determine pathway prefix for direct PNG link for '{kegg_id}' after REST API attempt also failed.")
        raise HTTPException(status_code=404, detail=f"Could not find pathway image for '{kegg_id}'. Please check the ID format (e.g., map00010, hsa00010.")

    direct_img_url_to_try = KEGG_DIRECT_IMAGE_URL_PATTERN.format(pathway_id_part=pathway_id_part, pathway_id_full=pathway_id_full)
    logger.info(f"Attempting plain image via direct PNG link: {direct_img_url_to_try}")

    try:
        response = requests.head(direct_img_url_to_try, timeout=10)
        content_type = response.headers.get('Content-Type', '').lower()
        logger.info(f"Direct PNG HEAD response: Status {response.status_code}, Content-Type '{content_type}' for URL {direct_img_url_to_try}")

        if response.status_code == 200 and 'image' in content_type:
            logger.info(f"Successfully identified plain image for '{pathway_id_full}' via direct link.")
            return {
                "img_url": direct_img_url_to_try,
                "kegg_id_used": pathway_id_full,
            }
        else:
            error_detail = f"KEGG pathway image not found or invalid for ID '{kegg_id}'. Tried direct link: {direct_img_url_to_try}. Status: {response.status_code}, Content-Type: {content_type}."
            logger.warning(error_detail)
            raise HTTPException(status_code=404, detail=error_detail)
    except requests.exceptions.Timeout:
        logger.error(f"Timeout requesting plain KEGG pathway (direct link) for '{kegg_id}'. URL: {direct_img_url_to_try}")
        raise HTTPException(status_code=504, detail="Request to KEGG server for pathway image timed out (direct link attempt")
    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException for plain KEGG pathway (direct link) '{kegg_id}': {e}. URL: {direct_img_url_to_try}")
        raise HTTPException(status_code=502, detail=f"Error fetching pathway image from KEGG (direct link attempt: {str(e)}")
    except Exception as e:
        logger.error(f"An unexpected server error occurred while fetching plain image for '{kegg_id}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")


@pathway_api.get("/api/search_pathways")
def search_pathways(query: str = Query(..., min_length=3, description="Pathway name or keyword to search")):
    logger.info(f"Received /search_pathways request: query='{query}'")

    try:
        search_url = KEGG_FIND_PATHWAY_URL.format(query=urllib.parse.quote(query))
        logger.info(f"Searching KEGG: {search_url}")
        response = requests.get(search_url, timeout=10)
        response.raise_for_status()

        pathways = []
        if response.text:
            lines = response.text.strip().split('\n')
            for line in lines:
                if not line.strip():
                    continue
                parts = line.split('\t')
                if len(parts) == 2:
                    path_id_full, name = parts
                    path_id = path_id_full.split(':')[1] if ':' in path_id_full else path_id_full
                    pathways.append({"id": path_id, "name": name})

        logger.info(f"Found {len(pathways)} pathways for query '{query}'.")
        return pathways

    except requests.exceptions.Timeout:
        logger.error(f"KEGG API search timed out for query '{query}'.")
        raise HTTPException(status_code=504, detail="KEGG API request timed out")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            logger.info(f"No pathways found for query '{query}'.")
            return []
        logger.error(f"KEGG API search HTTPError for query '{query}': {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=f"KEGG API error: {e.response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Could not connect to KEGG API for search: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Could not connect to KEGG API: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in pathway search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")
    
@pathway_api.get("/api/proxy_image")
async def proxy_image_download(url: str = Query(..., description="URL of the image to download")):
    """
    This route downloads the image from the KEGG server and returns it as a file download.
    Used by the frontend Download button to bypass CORS and allow saving the file.
    """
    
    if not url:
        logger.warning("Missing 'url' parameter in /api/proxy_image request.")
        raise HTTPException(status_code=400, detail="Missing 'url' parameter")

    logger.info(f"Downloading image from KEGG for proxy: {url}")

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "image/png")

        logger.info(f"Image proxy successful. Content-Type: {content_type}, Size: {len(response.content)} bytes")
        
        filename = url.split("/")[-1] or "pathway_image.png"
        if not filename.endswith(('.png', '.jpg', '.jpeg', '.gif')):
            filename += '.png'
            
        headers = {
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": content_type
        }
        
        return StreamingResponse(
            io.BytesIO(response.content),
            media_type=content_type,
            headers=headers
        )
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout downloading image for proxy: {url}")
        raise HTTPException(status_code=504, detail="Timeout downloading image")
    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException in proxy_image: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to download image: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error in proxy_image_download")
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")
