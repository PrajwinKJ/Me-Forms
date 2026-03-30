from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine,ForeignKey
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column,Session

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List, Optional

class Question_structure(BaseModel):
    id: str  
    text: str 
    type: str 
    options: List[str]

class Form_structure(BaseModel):
    title: str
    description: str
    questions: List[Question_structure]

class Base(DeclarativeBase):
    pass

engine=create_engine("postgresql+psycopg2://minimalform:password@localhost:5432/form")

class Form(Base):
    __tablename__="forms"
    id:Mapped[int] =mapped_column(primary_key=True)
    title:Mapped[str] =mapped_column(nullable=False)
    description:Mapped[str] =mapped_column(nullable=True)

class Question(Base):
    __tablename__="questions"
    id: Mapped[int] =mapped_column(primary_key=True)
    form_id: Mapped[int] =mapped_column(ForeignKey("forms.id"))
    question: Mapped[str] =mapped_column()
    type: Mapped[str] =mapped_column()
    from sqlalchemy import JSON
    options: Mapped[list] =mapped_column(JSON, nullable=True)

Base.metadata.create_all(engine)

@app.post("/api/forms")
def form(data: Form_structure):
    with Session(engine) as session:
        Formobj=Form(title=data.title,description=data.description)
        session.add(Formobj)
        session.flush()
        for q in data.questions:
            qobj=Question(form_id=Formobj.id,question=q.text,type=q.type,options=q.options)
            session.add(qobj)
        session.commit()
    return "Success"

@app.get("/api/forms")
def get_all_forms():
    with Session(engine) as session:
        forms = session.query(Form).all()
        return [{"id": form.id, "title": form.title, "description": form.description} for form in forms]

@app.get("/api/forms/{formid}")
def getform(formid: int):
    with Session(engine) as session:
        form=session.get(Form,formid)
        questions=session.query(Question).filter(Question.form_id==formid).all()
    if form:
        return{
            "id": form.id,
            "title": form.title,
            "description": form.description,
            "questions": [{
                "id": str(q.id),
                "text": q.question,
                "type": q.type,
                "options": q.options or []
            } for q in questions]}
    else:
        return{
            "error": "Form not found!"
        }