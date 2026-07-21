from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import intake, patient, clinician
from app.utils.logger import setup_logging
from app.middleware.logging import LoggingMiddleware

# Initialize logging configuration (JSON)
setup_logging()

app = FastAPI(title="Nurq API")

app.add_middleware(LoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intake.router)
app.include_router(patient.router)
app.include_router(clinician.router)

@app.get("/")
async def root():
    return {"message": "Hello, NurQ!"}