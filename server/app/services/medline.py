import httpx
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# MedlinePlus Connect web service endpoint
MEDLINE_CONNECT_URL = "https://connect.medlineplus.gov/service"
RXNORM_CODE_SYSTEM = "2.16.840.1.113883.6.88"

class MedlinePlusService:
    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    async def lookup_by_rxcui(self, rxcui: str) -> Optional[Dict[str, Any]]:
        """
        Query MedlinePlus Connect using RxNorm CUI.
        """
        if not rxcui:
            return None

        params = {
            "mainSearchCriteria.v.cs": RXNORM_CODE_SYSTEM,
            "mainSearchCriteria.v.c": rxcui,
            "knowledgeResponseType": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(MEDLINE_CONNECT_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    feed = data.get("feed", {})
                    entries = feed.get("entry", [])
                    if entries:
                        # Extract the primary patient topic entry
                        primary_entry = entries[0]
                        title = primary_entry.get("title", {}).get("_value", "MedlinePlus Drug Information")
                        summary = primary_entry.get("summary", {}).get("_value", "")
                        
                        links = primary_entry.get("link", [])
                        url = "https://medlineplus.gov"
                        if isinstance(links, list) and len(links) > 0:
                            url = links[0].get("href", url)
                        elif isinstance(links, dict):
                            url = links.get("href", url)

                        return {
                            "title": title,
                            "summary": summary,
                            "url": url,
                            "source": "MedlinePlus Connect (U.S. National Library of Medicine)"
                        }
        except Exception as e:
            logger.warning(f"MedlinePlus Connect lookup failed for RxCUI '{rxcui}': {e}")

        return None

medline_service = MedlinePlusService()
