import json
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def classify_link(url: str, anchor_text: str, surrounding_text: str = ""):
    prompt = f"""
You are classifying university website links for international student data collection.

Return ONLY valid JSON.

Classify this link into one page_type:

- course
- scholarships
- fees
- entry_requirements
- english_requirements
- application_process
- key_dates
- visa
- campus
- ignore

Crawl only pages useful for international student course recommendation.

Rules:
- If the URL/title mentions scholarships, bursaries, financial aid, tuition support, or "fees and scholarships", classify as scholarships or fees.
- If it is an individual course page, classify as course.
- If it is a generic marketing/news/contact/alumni page, classify as ignore.
- If unsure but useful for international admissions, should_crawl = true.
- If not useful, should_crawl = false.

URL: {url}
Anchor text: {anchor_text}
Surrounding text: {surrounding_text[:500]}

Return schema:
{{
  "page_type": "",
  "should_crawl": false,
  "confidence": 0.0,
  "reason": ""
}}
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "llama3.1:8b",
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0,
                "top_p": 0.1,
                "num_predict": 250
            }
        },
        timeout=120
    )

    return json.loads(response.json()["response"])