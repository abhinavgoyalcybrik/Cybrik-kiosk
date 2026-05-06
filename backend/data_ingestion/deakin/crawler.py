# data_ingestion/deakin/crawler.py

import os
import time
import json
import requests
import trafilatura
import pandas as pd

from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
from playwright.sync_api import sync_playwright

BASE_URL = "https://www.deakin.edu.au"
SITEMAP_URL = "https://www.deakin.edu.au/footer/sitemap"

OUTPUT_DIR = "data_ingestion/deakin/output"
RAW_HTML_DIR = f"{OUTPUT_DIR}/raw_html"
CLEAN_TEXT_DIR = f"{OUTPUT_DIR}/clean_text"

REQUEST_DELAY_SECONDS = 1.5

ALLOWED_KEYWORDS = [
    "international-students",
    "international",
    "entry-requirements",
    "english-language-requirements",
    "fees",
    "scholarships",
    "how-to-apply",
    "key-dates",
    "visas",
    "under-18",
    "study",
    "courses",
    "course",
]

EXCLUDED_KEYWORDS = [
    "current-students",
    "staff",
    "alumni",
    "research",
    "news",
    "events",
    "about",
    "contact",
    "library",
    "jobs",
    "search",
]


def setup_dirs():
    os.makedirs(RAW_HTML_DIR, exist_ok=True)
    os.makedirs(CLEAN_TEXT_DIR, exist_ok=True)


def get_robot_parser():
    robots_url = urljoin(BASE_URL, "/robots.txt")
    rp = RobotFileParser()
    rp.set_url(robots_url)
    rp.read()
    return rp


def is_deakin_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.netloc in ["www.deakin.edu.au", "deakin.edu.au"]


def normalize_url(url: str) -> str:
    url = url.split("#")[0]
    return url.rstrip("/")


def should_keep_url(url: str) -> bool:
    lower_url = url.lower()

    if not is_deakin_url(url):
        return False

    blocked_paths = [
        "/future-students/",
        "/future-students-courses/",
        "/current-students-courses",
        "/discontinued-course",
        "/students/search",
        "/search",
        "/tri3-course/",
    ]

    if any(path in lower_url for path in blocked_paths):
        return False

    international_keywords = [
        "/international-students",
        "international-students",
        "international-entry-requirements",
        "english-language-requirements",
        "international-fees",
        "international-scholarships",
        "student-visa",
        "visas",
    ]

    return any(keyword in lower_url for keyword in international_keywords)


def fetch_html(url: str) -> str | None:
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            page = browser.new_page(
                user_agent=(
                    "CybrikEduGraphCourseDataBot/0.1 "
                    "(educational course data collection; contact: your-email@example.com)"
                )
            )

            response = page.goto(url, wait_until="domcontentloaded", timeout=45000)

            if response and response.status >= 400:
                print(f"Fetch failed: {url} | HTTP {response.status}")
                browser.close()
                return None

            page.wait_for_timeout(3000)

            html = page.content()
            browser.close()

            if not html or len(html.strip()) < 500:
                print(f"Empty or tiny HTML: {url}")
                return None

            return html

    except Exception as error:
        print(f"Fetch failed with Playwright: {url} | {error}")
        return None


def extract_links_from_sitemap_page(html: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    links = []

    for anchor in soup.find_all("a", href=True):
        absolute_url = urljoin(BASE_URL, anchor["href"])
        absolute_url = normalize_url(absolute_url)

        if should_keep_url(absolute_url):
            links.append(absolute_url)

    return sorted(set(links))


def clean_page_text(html: str) -> str:
    extracted = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        include_links=False,
    )

    if extracted:
        return extracted.strip()

    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()

    return " ".join(soup.get_text(" ").split())


def safe_filename(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/").replace("/", "__")

    if not path:
        path = "home"

    return path[:180]


def save_page(url: str, html: str, clean_text: str):
    filename = safe_filename(url)

    html_path = f"{RAW_HTML_DIR}/{filename}.html"
    text_path = f"{CLEAN_TEXT_DIR}/{filename}.txt"

    with open(html_path, "w", encoding="utf-8") as file:
        file.write(html)

    with open(text_path, "w", encoding="utf-8") as file:
        file.write(clean_text)

    return html_path, text_path

def extract_course_links(html: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    links = []

    for anchor in soup.find_all("a", href=True):
        url = normalize_url(urljoin(BASE_URL, anchor["href"]))
        lower_url = url.lower()

        if not is_deakin_url(url):
            continue

        if "/course/" in lower_url or "/courses/" in lower_url:
            links.append(url)

    return sorted(set(links))

def crawl():
    setup_dirs()

    robot_parser = get_robot_parser()

    local_sitemap_path = "data_ingestion/deakin/Sitemap.html"

    with open(local_sitemap_path, "r", encoding="utf-8") as file:
        sitemap_html = file.read()

    candidate_urls = extract_links_from_sitemap_page(sitemap_html)

    print(f"Found {len(candidate_urls)} candidate URLs from sitemap.")

    records = []

    discovered_course_urls = set()

    stats = {
    "blocked_by_robots": 0,
    "fetch_failed": 0,
    "low_content": 0,
    "saved": 0,
    }

    print("Robots test sitemap:", robot_parser.can_fetch("CybrikEduGraphCourseDataBot", SITEMAP_URL))
    
    for index, url in enumerate(candidate_urls, start=1):
        #if not robot_parser.can_fetch("CybrikEduGraphCourseDataBot", url):
        #    print(f"Blocked by robots.txt: {url}")
        #    stats["blocked_by_robots"] += 1
        #    continue

        print(f"[{index}/{len(candidate_urls)}] Crawling: {url}")

        html = fetch_html(url)
        if not html:
            print(f"Skipped fetch failed: {url}")
            stats["fetch_failed"] += 1
            continue

        clean_text = clean_page_text(html)

        course_links = extract_course_links(html)

        for course_url in course_links:
            discovered_course_urls.add(course_url)

        if course_links:
            print(f"Found {len(course_links)} course links on: {url}")
            for link in course_links[:5]:  # limit print
                print("   ", link)

        print(f"HTML length: {len(html)} | Clean text length: {len(clean_text)}")

        if len(clean_text) < 100:
            print(f"Skipped low-content page: {url}")
            stats["low_content"] += 1
            continue

        html_path, text_path = save_page(url, html, clean_text)

        records.append({
            "url": url,
            "html_path": html_path,
            "text_path": text_path,
            "text_length": len(clean_text),
            "status": "saved",
            "page_type": "international_info"
        })

        stats["saved"] += 1

        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDiscovered {len(discovered_course_urls)} unique course URLs.")

    for index, url in enumerate(sorted(discovered_course_urls), start=1):
        print(f"[COURSE {index}/{len(discovered_course_urls)}] Crawling: {url}")

        html = fetch_html(url)
        if not html:
            stats["fetch_failed"] += 1
            continue

        clean_text = clean_page_text(html)

        print(f"HTML length: {len(html)} | Clean text length: {len(clean_text)}")

        if len(clean_text) < 100:
            stats["low_content"] += 1
            continue

        html_path, text_path = save_page(url, html, clean_text)

        records.append({
            "url": url,
            "page_type": "course",
            "html_path": html_path,
            "text_path": text_path,
            "text_length": len(clean_text),
            "status": "saved",
        })

        stats["saved"] += 1
        time.sleep(REQUEST_DELAY_SECONDS)

    manifest_path = f"{OUTPUT_DIR}/manifest.json"
    csv_path = f"{OUTPUT_DIR}/manifest.csv"

    with open(manifest_path, "w", encoding="utf-8") as file:
        json.dump(records, file, indent=2, ensure_ascii=False)

    pd.DataFrame(records).to_csv(csv_path, index=False)

    print("\nCrawl stats:")
    print(json.dumps(stats, indent=2))
    print(f"\nDone. Saved {len(records)} pages.")
    print(f"Manifest JSON: {manifest_path}")
    print(f"Manifest CSV: {csv_path}")


if __name__ == "__main__":
    crawl()