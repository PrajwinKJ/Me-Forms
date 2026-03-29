from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (for now)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Form_structure(BaseModel):
    title: str
    descripton: str

@app.post("/api/forms")
def form(data: Form_structure):
    print(data.title)
    return "ok"