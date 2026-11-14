import httpx
import logging
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST"

# Well-known international vs US non-proprietary synonym equivalences
GLOBAL_SYNONYMS: Dict[str, List[str]] = {
    "paracetamol": ["acetaminophen", "paracetamol"],
    "acetaminophen": ["paracetamol", "acetaminophen"],
    "ascorbic acid": ["vitamin c", "ascorbic acid"],
    "vitamin c": ["ascorbic acid", "vitamin c"],
    "salbutamol": ["albuterol", "salbutamol"],
    "albuterol": ["salbutamol", "albuterol"],
    "frusemide": ["furosemide", "frusemide"],
    "furosemide": ["frusemide", "furosemide"],
    "amoxicillin": ["amoxicillin", "amoxil"],
}

class RxNormService:
    def __init__(self, timeout: float = 8.0):
        self.timeout = timeout

    async def get_rxcui(self, drug_name: str) -> Optional[str]:
        rxcui, _ = await self.get_rxcui_and_name(drug_name)
        return rxcui

    async def get_rxcui_and_name(self, drug_name: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Query RxNorm REST API to find the RxCUI and canonical clinical name for a generic drug.
        """
        if not drug_name or not drug_name.strip():
            return None, None
            
        clean_name = drug_name.strip()
        url = f"{RXNORM_BASE_URL}/rxcui.json"
        params = {"name": clean_name, "search": 1}
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    id_group = data.get("idGroup", {})
                    rxnorm_ids = id_group.get("rxnormId", [])
                    if rxnorm_ids and len(rxnorm_ids) > 0:
                        rxcui = rxnorm_ids[0]
                        props = await self.get_drug_properties(rxcui)
                        return rxcui, props.get("name")
                        
                # Try approximate match if exact match fails
                approx_url = f"{RXNORM_BASE_URL}/approximateTerm.json"
                approx_resp = await client.get(approx_url, params={"term": clean_name, "maxEntries": 1})
                if approx_resp.status_code == 200:
                    approx_data = approx_resp.json()
                    candidates = approx_data.get("approximateGroup", {}).get("candidate", [])
                    if candidates and len(candidates) > 0:
                        rxcui = candidates[0].get("rxcui")
                        props = await self.get_drug_properties(rxcui)
                        return rxcui, props.get("name")
        except Exception as e:
            logger.warning(f"RxNorm lookup failed for '{clean_name}': {e}")
            
        return None, None

    async def get_drug_properties(self, rxcui: str) -> Dict[str, Any]:
        """
        Retrieve standardized name and properties for an RxCUI.
        """
        if not rxcui:
            return {}
            
        url = f"{RXNORM_BASE_URL}/rxcui/{rxcui}/properties.json"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json().get("properties", {})
        except Exception as e:
            logger.warning(f"RxNorm properties fetch failed for RxCUI '{rxcui}': {e}")
        return {}

rxnorm_service = RxNormService()
