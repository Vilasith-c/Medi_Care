import httpx
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# MedlinePlus Connect web service endpoint
MEDLINE_CONNECT_URL = "https://connect.medlineplus.gov/service"
RXNORM_CODE_SYSTEM = "2.16.840.1.113883.6.88"

# Resilient fallback summaries for essential medicines when US NIH server has network timeouts
OFFLINE_ESSENTIAL_SUMMARIES: Dict[str, Dict[str, str]] = {
    "161": {
        "title": "Acetaminophen (Paracetamol)",
        "summary": "Acetaminophen is used to relieve mild to moderate pain from headaches, muscle aches, menstrual periods, colds and sore throats, toothaches, backaches, and to reduce fever.",
        "url": "https://medlineplus.gov/druginfo/meds/a681004.html",
        "source": "MedlinePlus Connect (U.S. National Library of Medicine)"
    },
    "1151": {
        "title": "Ascorbic Acid (Vitamin C)",
        "summary": "Ascorbic acid (vitamin C) is used to prevent or treat low levels of vitamin C in people who do not get enough of the vitamin from their diets. Most people who eat a normal diet do not need extra ascorbic acid.",
        "url": "https://medlineplus.gov/druginfo/meds/a682583.html",
        "source": "MedlinePlus Connect (U.S. National Library of Medicine)"
    },
    "11251": {
        "title": "Vitamin B Complex",
        "summary": "Vitamin B complex consists of eight B vitamins (including thiamine, riboflavin, niacin, B6, folate, and B12) that support cellular metabolism, energy production, and red blood cell formation.",
        "url": "https://medlineplus.gov/bvitamins.html",
        "source": "MedlinePlus Connect (U.S. National Library of Medicine)"
    },
    "39954": {
        "title": "Zinc Sulfate",
        "summary": "Zinc is an essential mineral required for cellular immunity, wound healing, protein synthesis, and enzymatic reactions.",
        "url": "https://medlineplus.gov/minerals.html",
        "source": "MedlinePlus Connect (U.S. National Library of Medicine)"
    },
    "723": {
        "title": "Amoxicillin",
        "summary": "Amoxicillin is used to treat certain infections caused by bacteria, such as pneumonia; bronchitis; and infections of the ears, nose, throat, urinary tract, and skin.",
        "url": "https://medlineplus.gov/druginfo/meds/a685001.html",
        "source": "MedlinePlus Connect (U.S. National Library of Medicine)"
    }
}

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

        if rxcui in OFFLINE_ESSENTIAL_SUMMARIES:
            logger.info(f"Using local cached MedlinePlus summary for RxCUI {rxcui}")
            return OFFLINE_ESSENTIAL_SUMMARIES[rxcui]

        return None

medline_service = MedlinePlusService()
