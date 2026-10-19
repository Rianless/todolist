"""
SaveTube — 동영상 링크를 받아 MP4 또는 MP3로 저장해 주는 개인용 서버
실행: uvicorn app:app --host 0.0.0.0 --port 8000
"""
import os
import re
import shutil
import tempfile
import threading
import time
import uuid
from pathlib import Path

import yt_dlp
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent
WORK_DIR = Path(tempfile.gettempdir()) / "savetube"
WORK_DIR.mkdir(parents=True, exist_ok=True)

JOB_TTL_SEC = int(os.getenv("JOB_TTL_SEC", "1800"))       # 완료 파일 보관 시간(기본 30분)
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "2"))      # 동시 변환 개수
MAX_DURATION_SEC = int(os.getenv("MAX_DURATION_SEC", "10800"))  # 최대 길이(기본 3시간)
APP_PASSWORD = os.getenv("APP_PASSWORD", "")                # 설정하면 비밀번호 필요

# 유튜브가 서버 IP를 막을 때 쓰는 쿠키(선택). cookies.txt 내용을 환경변수에 그대로 넣으면 됨
COOKIE_PATH = None
if os.getenv("YTDLP_COOKIES"):
    COOKIE_PATH = WORK_DIR / "cookies.txt"
    COOKIE_PATH.write_text(os.environ["YTDLP_COOKIES"], encoding="utf-8")

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()
slots = threading.Semaphore(MAX_CONCURRENT)

app = FastAPI(title="SaveTube")

# 할 일 앱(다른 주소)의 SaveTube 카드에서 이 서버를 부를 수 있게 한다. 인증은 쿠키가 아니라 비밀번호 헤더라서 * 여도 안전하다.
# 특정 주소만 허용하려면 CORS_ORIGINS 에 쉼표로 적는다.
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])


# ---------- 공통 ----------

def check_key(key: str | None):
    if APP_PASSWORD and key != APP_PASSWORD:
        raise HTTPException(401, "비밀번호가 필요해요.")


URL_RE = re.compile(r"https?://[^\s<>\"']+")


def clean_url(raw: str) -> str:
    """공유 텍스트에 섞여 들어온 링크에서 URL만 뽑아낸다."""
    m = URL_RE.search(raw or "")
    if not m:
        raise HTTPException(400, "올바른 링크가 아니에요.")
    return m.group(0)


def base_opts() -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "restrictfilenames": False,
        "windowsfilenames": True,
        "socket_timeout": 30,
    }
    if COOKIE_PATH:
        opts["cookiefile"] = str(COOKIE_PATH)
    return opts


def friendly_error(e: Exception) -> str:
    msg = str(e)
    if "Sign in to confirm" in msg or "bot" in msg.lower():
        return "사이트가 서버 접속을 막았어요. 잠시 뒤 다시 시도하거나 쿠키 설정이 필요해요."
    if "Private video" in msg or "private" in msg.lower():
        return "비공개 영상이라 가져올 수 없어요."
    if "Unsupported URL" in msg:
        return "지원하지 않는 사이트의 링크예요."
    if "age" in msg.lower() and "restrict" in msg.lower():
        return "연령 제한 영상이라 쿠키 설정이 필요해요."
    return "가져오지 못했어요: " + msg.replace("ERROR: ", "")[:200]


# ---------- API ----------

class InfoReq(BaseModel):
    url: str


class JobReq(BaseModel):
    url: str
    kind: str = "video"      # video | mp3
    quality: str = "best"    # video: best/1080/720/480, mp3: 320/192/128


@app.post("/api/info")
def info(req: InfoReq, x_app_key: str | None = Header(default=None)):
    check_key(x_app_key)
    url = clean_url(req.url)
    try:
        with yt_dlp.YoutubeDL({**base_opts(), "skip_download": True}) as ydl:
            data = ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(400, friendly_error(e))
    return {
        "url": url,
        "title": data.get("title") or "제목 없음",
        "uploader": data.get("uploader") or data.get("channel") or "",
        "duration": data.get("duration") or 0,
        "thumbnail": data.get("thumbnail") or "",
        "site": data.get("extractor_key") or "",
    }


@app.post("/api/jobs")
def create_job(req: JobReq, x_app_key: str | None = Header(default=None)):
    check_key(x_app_key)
    url = clean_url(req.url)
    if req.kind not in ("video", "mp3"):
        raise HTTPException(400, "형식은 video 또는 mp3만 가능해요.")

    job_id = uuid.uuid4().hex[:12]
    with jobs_lock:
        jobs[job_id] = {
            "id": job_id,
            "status": "queued",   # queued → downloading → processing → done | error
            "progress": 0.0,
            "stage": "대기 중",
            "error": None,
            "file": None,
            "filename": None,
            "created": time.time(),
        }
    threading.Thread(target=run_job, args=(job_id, url, req.kind, req.quality), daemon=True).start()
    return {"id": job_id}


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str, key: str | None = None):
    check_key(key)
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없어요.")
    return {k: v for k, v in job.items() if k != "file"}


@app.get("/api/jobs/{job_id}/file")
def job_file(job_id: str, key: str | None = None):
    check_key(key)
    job = jobs.get(job_id)
    if not job or job["status"] != "done" or not job["file"] or not Path(job["file"]).exists():
        raise HTTPException(404, "파일이 없거나 만료됐어요.")
    path = Path(job["file"])
    media = "audio/mpeg" if path.suffix == ".mp3" else "video/mp4"
    return FileResponse(path, media_type=media, filename=job["filename"])


@app.get("/api/config")
def config():
    return {"needsPassword": bool(APP_PASSWORD)}


# ---------- 작업 실행 ----------

def update(job_id: str, **kw):
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(kw)


def video_format(quality: str) -> str:
    if quality in ("1080", "720", "480"):
        h = f"[height<={quality}]"
        return (f"bv*{h}[ext=mp4]+ba[ext=m4a]/b{h}[ext=mp4]/"
                f"bv*{h}+ba/b{h}/b")
    return "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b"


def run_job(job_id: str, url: str, kind: str, quality: str):
    job_dir = WORK_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    part = {"n": 0}

    def on_progress(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            done = d.get("downloaded_bytes") or 0
            pct = (done / total * 100) if total else 0
            label = "내려받는 중"
            if kind == "video" and part["n"] >= 1:
                label = "소리 내려받는 중"
            update(job_id, status="downloading", progress=round(pct, 1), stage=label)
        elif d["status"] == "finished":
            part["n"] += 1

    def on_post(d):
        if d["status"] == "started":
            update(job_id, status="processing", progress=100,
                   stage="MP3로 변환 중" if kind == "mp3" else "영상 합치는 중")

    opts = {
        **base_opts(),
        "outtmpl": str(job_dir / "%(title).120B.%(ext)s"),
        "progress_hooks": [on_progress],
        "postprocessor_hooks": [on_post],
        "match_filter": yt_dlp.utils.match_filter_func(f"!is_live & duration <= {MAX_DURATION_SEC}"),
    }

    if kind == "mp3":
        bitrate = quality if quality in ("320", "192", "128") else "192"
        opts.update({
            "format": "bestaudio/best",
            "writethumbnail": True,
            "postprocessors": [
                {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": bitrate},
                {"key": "FFmpegMetadata"},
                {"key": "EmbedThumbnail"},
            ],
        })
        want_ext = ".mp3"
    else:
        opts.update({
            "format": video_format(quality),
            "merge_output_format": "mp4",
            # 폰 갤러리에서 바로 재생되도록 mp4 컨테이너 유지
            "postprocessor_args": {"merger": ["-movflags", "+faststart"]},
        })
        want_ext = ".mp4"

    slots.acquire()
    try:
        update(job_id, stage="준비 중")
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])

        files = [p for p in job_dir.iterdir() if p.suffix == want_ext]
        if not files:  # 혹시 mp4가 아닌 형식으로 받아졌다면 가장 큰 파일 사용
            files = [p for p in job_dir.iterdir()
                     if p.suffix not in (".jpg", ".webp", ".png", ".part", ".ytdl")]
        if not files:
            raise RuntimeError("결과 파일을 찾지 못했어요. 생방송이거나 너무 긴 영상일 수 있어요.")
        out = max(files, key=lambda p: p.stat().st_size)
        update(job_id, status="done", progress=100, stage="완료",
               file=str(out), filename=out.name, size=out.stat().st_size)
    except Exception as e:
        update(job_id, status="error", stage="실패", error=friendly_error(e))
    finally:
        slots.release()


# ---------- 오래된 파일 청소 ----------

def janitor():
    while True:
        time.sleep(300)
        now = time.time()
        with jobs_lock:
            old = [j for j, v in jobs.items() if now - v["created"] > JOB_TTL_SEC]
            for j in old:
                jobs.pop(j, None)
        for j in old:
            shutil.rmtree(WORK_DIR / j, ignore_errors=True)


threading.Thread(target=janitor, daemon=True).start()

# 정적 파일(화면)은 맨 마지막에 연결
app.mount("/", StaticFiles(directory=BASE_DIR / "static", html=True), name="static")
