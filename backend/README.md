# Ai.Saule Language backend

Run from the project root:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8001
```

Endpoints:

- `GET http://127.0.0.1:8001/health`
- `GET http://127.0.0.1:8001/ready`
- `POST http://127.0.0.1:8001/translate`
- `POST http://127.0.0.1:8001/speech` (returns MP3)

Secrets and Azure endpoint settings are loaded from the ignored root `.env.local` file.

## Docker deployment

Build from the project root:

```powershell
docker build -f backend/Dockerfile -t aisaule-language-api .
docker run --env-file .env.local -p 8001:8001 aisaule-language-api
```

On the production host, set `TRANSLATOR_ALLOWED_ORIGINS` to the public frontend
origin and set `NEXT_PUBLIC_TRANSLATOR_API_URL` during the frontend build to the
public HTTPS URL of this backend.
