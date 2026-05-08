import os
import json
import requests
import pandas as pd
import re

OLLAMA_URL = "http://localhost:11434/api/generate"

INPUT_DIR = "data_ingestion/deakin/output/clean_text"
OUTPUT_JSON = "data_ingestion/deakin/output/extracted_courses.json"
OUTPUT_CSV = "data_ingestion/deakin/output/extracted_courses.csv"

def extract_ielts(text):
    match = re.search(
        r"IELTS overall score of (\d\.\d).*?no band score less than (\d\.\d)",
        text,
        re.IGNORECASE | re.DOTALL
    )

    if match:
        return {
            "ielts_overall": float(match.group(1)),
            "ielts_no_band_below": float(match.group(2))
        }

    return {
        "ielts_overall": None,
        "ielts_no_band_below": None
    }

def extract_fee(text):
    match = re.search(
        r"\$([\d,]+)\s+for\s+1\s+yr",
        text,
        re.IGNORECASE
    )

    if match:
        return int(match.group(1).replace(",", ""))

    return None

def extract_cricos(text):
    match = re.search(
        r"CRICOS code.*?([0-9]{6}[A-Z])",
        text,
        re.IGNORECASE | re.DOTALL
    )

    if match:
        return match.group(1)

    return None

def extract_duration(text):
    match = re.search(
        r"(\d+)\s+years?",
        text,
        re.IGNORECASE
    )

    if match:
        return f"{match.group(1)} years"

    return None

def extract_intakes(text):
    months = [
        "January", "February", "March",
        "April", "May", "June",
        "July", "August", "September",
        "October", "November", "December"
    ]

    found = []

    for month in months:
        if re.search(rf"\b{month}\b", text):
            found.append(month)

    return sorted(list(set(found)))

def extract_campuses(text):
    campuses = [
        "Burwood (Melbourne)",
        "Geelong",
        "Waurn Ponds",
        "Waterfront",
        "Warrnambool",
        "Online"
    ]

    found = []

    for campus in campuses:
        if campus.lower() in text.lower():
            found.append(campus)

    return sorted(list(set(found)))

def call_llm(prompt: str):
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
                "num_predict": 500
            }
        }
    )

    try:
        return json.loads(response.json()["response"])
    except Exception:
        print("Failed to parse JSON response")
        return None


def build_prompt(text: str, url: str):
    return f"""
You are an information extraction engine.

Your task:
Extract structured data ONLY from a REAL university course page.

IMPORTANT:
If this page is NOT a specific course page,
return EXACTLY:

{{
  "ignore": true
}}

A valid course page MUST contain at least TWO of:
- "Course overview"
- "Entry requirements"
- "Fees and scholarships"
- "Course structure"
- "CRICOS code"

Do NOT summarize marketing pages.
Do NOT infer missing values.
Do NOT invent data.

Return ONLY valid JSON.

Schema:

{{
  "course_name": null,
  "degree_level": null,
  "field_of_study": null,
  "cricos_code": null,
  "duration": null,
  "campuses": [],
  "intakes": [],
  "annual_tuition_fee_aud": null,
  "academic_requirements": null,
  "english_requirements": {{
    "ielts_overall": null,
    "ielts_no_band_below": null
  }},
  "application_deadlines": [],
  "scholarships": [],
  "source_url": "{url}"
}}

Extraction Rules:

1. course_name
- Extract official course title only.
Example:
"Bachelor of Software Engineering (Honours)"

2. degree_level
Map strictly:
- Undergraduate
- Postgraduate
- Masters
- PhD
- Diploma
- Certificate

3. cricos_code
Extract exact CRICOS code.
Example:
"092212D"

4. duration
Extract concise duration only.
Examples:
"3 years"
"4 years"
"2 years full-time"

Do NOT return:
"24 credit points"

5. campuses
Extract only campus names.

6. intakes
Extract intake months only.
Examples:
["March", "July", "November"]

7. annual_tuition_fee_aud
Extract numeric AUD amount only.

Examples:
"$42,000 for 1 yr full-time AUD"
→ 42000

"$55,400"
→ 55400

8. english_requirements
Extract IELTS values only.

Example:
"IELTS overall score of 6.0 (with no band score less than 6.0)"

→
{{
  "ielts_overall": 6.0,
  "ielts_no_band_below": 6.0
}}

9. academic_requirements
Return SHORT cleaned summary only.

10. scholarships
ONLY extract actual scholarship names.

A scholarship MUST explicitly contain words such as:
- scholarship
- bursary
- grant
- financial support

IMPORTANT:
- Use null if data is missing.
- Use [] for empty arrays.
- No explanations.
- No markdown.
- No commentary.

TEXT:
{text[:7000]}
"""


def extract_all():
    results = []

    files = [
        #f for f in os.listdir(INPUT_DIR)
        #if "course" in f.lower()
        "course__bachelor-software-engineering-honours-international.txt"
    ]

    for idx, file in enumerate(files, start=1):
        if not file.endswith(".txt"):
            continue

        path = os.path.join(INPUT_DIR, file)

        with open(path, "r", encoding="utf-8") as f:
            text = f.read()

        if len(text) < 200:
            continue

        print(f"[{idx}/{len(files)}] Processing: {file}")

        # derive URL from filename (simple fallback)
        url = file.replace("__", "/").replace(".txt", "")
        url = f"https://www.deakin.edu.au/{url}"

        regex_data = {
            "cricos_code": extract_cricos(text),
            "duration": extract_duration(text),
            "annual_tuition_fee_aud": extract_fee(text),
            "intakes": extract_intakes(text),
            "campuses": extract_campuses(text),
            "english_requirements": extract_ielts(text)
        }

        prompt = build_prompt(text, url)
        data = call_llm(prompt)

        if data:
            for key, value in regex_data.items():

                if key == "english_requirements":
                    if not data.get("english_requirements"):
                        data["english_requirements"] = value
                    else:
                        if not data["english_requirements"].get("ielts_overall"):
                            data["english_requirements"]["ielts_overall"] = value["ielts_overall"]

                        if not data["english_requirements"].get("ielts_no_band_below"):
                            data["english_requirements"]["ielts_no_band_below"] = value["ielts_no_band_below"]
                else:
                    if not data.get(key):
                        data[key] = value

        if data:
            results.append(data)

    # Save JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Save CSV
    df = pd.json_normalize(results)
    df.to_csv(OUTPUT_CSV, index=False)

    print(f"\nSaved {len(results)} extracted courses")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"CSV: {OUTPUT_CSV}")


if __name__ == "__main__":
    extract_all()