import httpx
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self, timeout: float = 8.0):
        self.api_key = settings.TAVILY_API_KEY
        self.trusted_domains = settings.TRUSTED_DOMAINS
        self.timeout = timeout

    async def search_trusted(self, generic_name: str, strength: str = "", form: str = "") -> List[Dict[str, Any]]:
        """
        Executes exactly ONE targeted Tavily search query restricted strictly to trusted clinical domains.
        """
        if not self.api_key:
            logger.info("Tavily API key not configured. Skipping web search step.")
            return []

        query = f"{generic_name} {strength} {form} uses warnings patient information".strip()
        url = "https://api.tavily.com/search"
        
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "basic",
            "include_domains": self.trusted_domains,
            "max_results": 3,
            "include_raw_content": False
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    raw_results = data.get("results", [])
                    results = []
                    for r in raw_results:
                        url_val = r.get("url", "")
                        domain = ""
                        for td in self.trusted_domains:
                            if td in url_val:
                                domain = td
                                break
                        if not domain:
                            # Extract host
                            domain = url_val.split("/")[2] if "://" in url_val else "trusted-domain"
                            
                        results.append({
                            "title": r.get("title", "Clinical Drug Reference"),
                            "url": url_val,
                            "domain": domain,
                            "content": r.get("content", "")
                        })
                    return results
                else:
                    logger.warning(f"Tavily returned HTTP {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Tavily search failed for '{query}': {e}")

        return []

search_service = SearchService()
