from fastapi import FastAPI
from app.api.v1.router import api_v1_router

app = FastAPI(
    title="Pyxie Tarot API",
    description="A tarot reading API",
    version="0.1.0"
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Pyxie Tarot API"}

app.include_router(api_v1_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
