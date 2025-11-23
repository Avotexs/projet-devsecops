from fastapi import FastAPI
from .routes import router
from .database import engine, Base

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="VulnDetector Service")

app.include_router(router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
