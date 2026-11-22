"""Build an offline, attributed medication snapshot from public FDA NDC metadata."""

import argparse
import collections
import datetime
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
API = "https://api.fda.gov/drug/ndc.json"
QUERY = (
    'product_type:"HUMAN PRESCRIPTION DRUG" AND '
    '(marketing_category:"NDA" OR marketing_category:"ANDA" OR marketing_category:"BLA")'
)


def canonical_name(name):
    return re.sub(r"\s+", " ", name.strip()).casefold()


def build_catalog(count):
    app = (ROOT / "app.js").read_text()
    existing = {
        canonical_name(name)
        for name in re.findall(r'\{ name: "([^"]+)", strengths:', app)
    }
    records = {}
    last_updated = ""
    for skip in range(0, 20000, 1000):
        url = API + "?" + urllib.parse.urlencode({
            "search": QUERY, "limit": 1000, "skip": skip,
        })
        with urllib.request.urlopen(url, timeout=120) as response:
            payload = json.load(response)
        last_updated = payload["meta"]["last_updated"]
        for product in payload["results"]:
            name = product.get("generic_name", "").strip()
            key = canonical_name(name)
            ingredients = product.get("active_ingredients", [])
            if (
                not name or key in existing or not ingredients
                or not all(item.get("strength") for item in ingredients)
                or not product.get("dosage_form") or not product.get("route")
                or product.get("marketing_end_date")
            ):
                continue
            classes = sorted({
                re.sub(r"\s+\[EPC\]$", "", value)
                for value in product.get("pharm_class", [])
                if value.endswith("[EPC]")
            })
            # Prefer a source record with an established pharmacologic class.
            if key in records and (records[key]["classes"] or not classes):
                continue
            strengths = [
                ingredients[0]["strength"] if len(ingredients) == 1 else
                "; ".join(f'{item["name"]}: {item["strength"]}' for item in ingredients)
            ]
            set_ids = product.get("openfda", {}).get("spl_set_id", [])
            label_url = (
                "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=" +
                urllib.parse.quote(set_ids[0], safe="")
                if set_ids else
                "https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=" +
                urllib.parse.quote(name, safe="")
            )
            records[key] = {
                "name": name,
                "strengths": strengths,
                "classes": classes,
                "drugClass": " / ".join(classes) or "Class not supplied by FDA NDC",
                "dosageForm": product["dosage_form"],
                "routes": product["route"],
                "ingredients": ingredients,
                "productNdc": product["product_ndc"],
                "marketingCategory": product["marketing_category"],
                "labelUrl": label_url,
                "sourceUrl": API + "?" + urllib.parse.urlencode({
                    "search": f'product_ndc:"{product["product_ndc"]}"',
                }),
                "adverseEffects": "Not supplied by the NDC dataset. Review official labeling.",
                "cautions": "Review official labeling for indications, contraindications, and precautions. Not for clinical use.",
                "interactions": [],
                "interactionCoverage": "not-assessed",
                "source": "FDA NDC via openFDA",
            }
        print(f"Read {skip + len(payload['results'])} records; {len(records)} distinct medication names", flush=True)
        if len(records) >= count + 500:
            break
        if skip + len(payload["results"]) >= payload["meta"]["results"]["total"]:
            break
        time.sleep(0.3)

    if len(records) < count:
        raise RuntimeError(f"Need {count} distinct entries; found only {len(records)}")
    buckets = collections.defaultdict(list)
    for entry in sorted(records.values(), key=lambda entry: canonical_name(entry["name"])):
        buckets[entry["drugClass"]].append(entry)
    selected = []
    # Round-robin selection keeps rare classes represented rather than selecting
    # the first thousand alphabetic names or counting strengths as medications.
    while len(selected) < count:
        for drug_class in sorted(buckets):
            if buckets[drug_class] and len(selected) < count:
                selected.append(buckets[drug_class].pop(0))
    selected.sort(key=lambda entry: canonical_name(entry["name"]))
    return {
        "source": "FDA NDC via openFDA",
        "sourceUrl": "https://open.fda.gov/apis/drug/ndc/",
        "termsUrl": "https://open.fda.gov/terms/",
        "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sourceLastUpdated": last_updated,
        "query": QUERY,
        "count": count,
        "selection": "Distinct generic names; class-balanced sample; one representative product per name.",
        "limitations": "Labeler-submitted metadata, not FDA-verified safety, approval, stock availability, or clinical suitability. No interaction or diagnosis coverage.",
        "medications": selected,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1000)
    args = parser.parse_args()
    if args.count < 1:
        parser.error("count must be positive")
    catalog = build_catalog(args.count)
    output = ROOT / "medication-catalog.js"
    output.write_text(
        "// Generated by scripts/build_medication_catalog.py; FDA source metadata only.\n"
        "const sourcedMedicationCatalog = " +
        json.dumps(catalog, ensure_ascii=True, indent=2) + ";\n"
    )
    print(f"Wrote {len(catalog['medications'])} distinct entries to {output}")


if __name__ == "__main__":
    main()
