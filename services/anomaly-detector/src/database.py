from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import time
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://anomaly_user:anomaly_pass@timescaledb:5432/anomalydb"
)

def get_engine(max_retries=5, delay=2):
    """Create database engine with retry logic for container startup."""
    for i in range(max_retries):
        try:
            engine = create_engine(DATABASE_URL)
            # Test connection
            with engine.connect() as conn:
                pass
            return engine
        except OperationalError:
            if i == max_retries - 1:
                raise
            print(f"Database not ready, retrying in {delay} seconds...")
            time.sleep(delay)

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
