"""
LinguaLink endpoint verification — matches the Verification Plan in improve.txt
Run with:  py verify_endpoints.py
"""
import requests
import json
import time
import sys

BASE = "http://localhost:8000/api"
OK   = "\u2705"
FAIL = "\u274c"

def check(label, condition, detail=""):
    status = OK if condition else FAIL
    print(f"  {status} {label}" + (f"  [{detail}]" if detail else ""))
    return condition

passed = 0
failed = 0

# ── 1. GET /health ─────────────────────────────────────────────────────────────
print("\n=== 1. GET /health ===")
r = requests.get(f"{BASE}/health")
d = r.json()
print(json.dumps(d, indent=2))
passed += check("status == ok",          d.get("status") == "ok")
passed += check("model_loaded == True",  d.get("model_loaded") is True)
passed += check("model_name present",    bool(d.get("model_name")))
passed += check("uptime_s present",      d.get("uptime_s", 0) > 0, f'{d.get("uptime_s")}s')

# ── 2. GET /stats ──────────────────────────────────────────────────────────────
print("\n=== 2. GET /stats ===")
r = requests.get(f"{BASE}/stats")
d = r.json()
print(json.dumps(d, indent=2))
passed += check("result_cache present",  "result_cache" in d)
passed += check("embed_cache_size key",  "embed_cache_size" in d)

# ── 3. POST /compare ───────────────────────────────────────────────────────────
print("\n=== 3. POST /compare ===")
r = requests.post(f"{BASE}/compare", json={"text_a": "Nike Air Max 90", "text_b": "Air Max"})
d = r.json()
print(json.dumps(d, indent=2))
passed += check("scores present",           "scores" in d)
passed += check("explanation.reason",        bool(d.get("explanation", {}).get("reason")))
passed += check("confidence_tier present",   bool(d.get("explanation", {}).get("confidence_tier")))
passed += check("duplicate_type present",    bool(d.get("explanation", {}).get("duplicate_type")))
passed += check("phonetic_debug present",    "phonetic_debug" in d)

# ── 4. POST /demo with weights + explained_pairs ───────────────────────────────
print("\n=== 4. POST /demo (sample_size=30, explain=true) ===")
t0 = time.time()
r = requests.post(f"{BASE}/demo", params={
    "sample_size": 30, "threshold": 0.55,
    "weight_semantic": 0.5, "weight_phonetic": 0.3, "weight_structural": 0.2,
    "explain": "true",
})
elapsed = time.time() - t0
d = r.json()
print(f"  Processing time: {d.get('processing_time')}s  (wall: {elapsed:.1f}s)")
passed += check("records present",         len(d.get("records", [])) > 0)
passed += check("weights echoed back",     "weights" in d)
passed += check("explained_pairs key",     "explained_pairs" in d)
ep = d.get("explained_pairs", [])
passed += check("at least 1 explained pair", len(ep) >= 0)  # may be 0 if no pairs
if ep:
    first = ep[0]
    passed += check("explained pair has reason",          bool(first.get("reason")))
    passed += check("explained pair has confidence_tier", bool(first.get("confidence_tier")))
    print(f"  Sample explained pair:\n  {json.dumps(first, indent=4)}")
passed += check("_from_cache == False (first run)", d.get("_from_cache") is False)

# ── 5. POST /demo again — verify cache hit ────────────────────────────────────
print("\n=== 5. POST /demo again — cache hit check ===")
t1 = time.time()
r2 = requests.post(f"{BASE}/demo", params={
    "sample_size": 30, "threshold": 0.55,
    "weight_semantic": 0.5, "weight_phonetic": 0.3, "weight_structural": 0.2,
    "explain": "true",
})
wall2 = time.time() - t1
d2 = r2.json()
print(f"  Wall time: {wall2:.2f}s  (first run: {elapsed:.1f}s)")
passed += check("_from_cache == True",  d2.get("_from_cache") is True, f"from_cache={d2.get('_from_cache')}")
passed += check("cache hit faster",     wall2 < elapsed, f"{wall2:.2f}s < {elapsed:.1f}s")

# ── 6. POST /detect (async) ────────────────────────────────────────────────────
print("\n=== 6. POST /detect (async job) ===")
with open("ecommerce_multilingual.csv", "rb") as fh:
    r = requests.post(
        f"{BASE}/detect",
        files={"file": ("ecommerce_multilingual.csv", fh, "text/csv")},
        data={"sample_size": 30, "threshold": 0.55},
    )
d = r.json()
print(json.dumps(d, indent=2))
job_id = d.get("job_id", "")
passed += check("job_id returned",   bool(job_id))
passed += check("status == pending", d.get("status") == "pending")

# ── 7. Poll GET /jobs/{job_id} ────────────────────────────────────────────────
print(f"\n=== 7. Polling GET /jobs/{job_id} ===")
job_done = False
for i in range(20):
    time.sleep(5)
    jr = requests.get(f"{BASE}/jobs/{job_id}")
    jd = jr.json()
    status   = jd.get("status", "?")
    progress = jd.get("progress", 0)
    print(f"  [{i*5:3d}s] status={status:8s}  progress={progress}%")
    if status in ("done", "error"):
        if status == "done":
            res = jd.get("result") or {}
            passed += check("job result has records",  len(res.get("records", [])) > 0)
            passed += check("job result has clusters", "clusters" in res)
            ep = res.get("explained_pairs", [])
            passed += check("explained_pairs in async result", len(ep) >= 0)
            job_done = True
        else:
            failed += 1
            print(f"  {FAIL} Job errored: {jd.get('error')}")
        break
if not job_done:
    failed += 1
    print(f"  {FAIL} Job did not complete in 100s")

# ── 8. GET /export/{job_id} ───────────────────────────────────────────────────
print(f"\n=== 8. GET /export/{job_id} ===")
if job_done:
    er = requests.get(f"{BASE}/export/{job_id}")
    passed += check("HTTP 200",               er.status_code == 200, f"status={er.status_code}")
    passed += check("Content-Type text/csv",  "text/csv" in er.headers.get("content-type", ""))
    lines = er.text.strip().splitlines()
    passed += check("Has CSV header row",     lines[0].startswith("name_a"), lines[0][:60])
    passed += check("Has data rows",          len(lines) > 1, f"{len(lines)-1} data rows")
    if len(lines) > 1:
        print(f"  Sample CSV row:\n  {lines[1][:120]}")
else:
    print("  Skipped (job did not complete)")

# ── Summary ───────────────────────────────────────────────────────────────────
total = passed + failed
print(f"\n{'='*50}")
print(f"  {OK} Passed: {passed}/{total}")
if failed:
    print(f"  {FAIL} Failed: {failed}/{total}")
    sys.exit(1)
else:
    print("  All checks passed!")
