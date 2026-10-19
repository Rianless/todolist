FROM python:3.12-slim

# ffmpeg: MP3 변환·영상 합치기 / deno: 유튜브 해석에 yt-dlp가 사용하는 JS 런타임
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -U -r requirements.txt
COPY . .

ENV PORT=8000
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
