from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column,Session

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
    description: str

class Base(DeclarativeBase):
    pass

engine=create_engine("postgresql+psycopg2://minimalform:password@localhost:5432/form")

class Form(Base):
    __tablename__="forms"
    id:Mapped[int] =mapped_column(primary_key=True)
    title:Mapped[str] =mapped_column(nullable=False)
    description:Mapped[str] =mapped_column(nullable=True)

Base.metadata.create_all(engine)

@app.post("/api/forms")
def form(data: Form_structure):
    Form1=Form(title=data.title,description=data.description)
    with Session(engine) as session:
        session.add(Form1)
        session.commit()
    return "Success"