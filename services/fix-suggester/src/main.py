from fastapi import FastAPI
from .routes import router
from .database import engine, Base

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FixSuggester Service",
    description="Generate YAML patches to fix GitHub Actions security vulnerabilities",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "fix-suggester",
        "version": "1.0.0"
    }
