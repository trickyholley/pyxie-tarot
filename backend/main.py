from fastapi import FastAPI

# Create a FastAPI application instance
app = FastAPI(
    title="Pyxie Tarot API",
    description="A tarot reading API",
    version="0.1.0"
)


# Define your first endpoint
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {"message": "Welcome to Pyxie Tarot API"}


@app.get("/api/tarot/draw")
def draw_card():
    """Draw a random tarot card"""
    return {
        "card": "The Fool",
        "meaning": "New beginnings, taking a leap of faith",
        "suit": "Major Arcana"
    }


if __name__ == "__main__":
    import uvicorn
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8000)
