from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router

app = FastAPI(title="Pyxie Tarot API", description="A tarot reading API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,  # type: ignore
    allow_origins=[
        "http://localhost:5173",  # Move to .env later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to Pyxie Tarot API"}


app.include_router(api_v1_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
