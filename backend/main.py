from fastapi import FastAPI,Depends,HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine,ForeignKey
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column,Session
from sqlalchemy import JSON
import os
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime,timedelta,UTC

pwdcontext=CryptContext(schemes=["sha256_crypt"],deprecated="auto")
def hashpwd(password):
    return pwdcontext.hash(password)

def verifypwd(password,hashed):
    return pwdcontext.verify(password,hashed)

def create_token(userid):
    Secret_key=str(os.getenv("SecretKey"))
    alg="HS256"
    payload={
        "userid":userid,
        "exp":datetime.now(UTC) + timedelta(hours=3)
    }
    token=jwt.encode(payload,Secret_key,alg)
    return token
security=HTTPBearer()
def gcu(credentials: HTTPAuthorizationCredentials=Depends(security)):
    token=credentials.credentials
    key=str(os.getenv("SecretKey"))
    try:
        payload=jwt.decode(token,key,algorithms="HS256")
        return payload.get("userid")
    except:
        raise HTTPException(status_code=401,detail="Invalid token")

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List

class User_struct(BaseModel):
    email: str
    password: str

class Question_structure(BaseModel):
    id: str  
    text: str 
    type: str 
    options: List[str]

class Form_structure(BaseModel):
    title: str
    description: str
    questions: List[Question_structure]

class Answer_structure(BaseModel):
    questionId: str
    questionText: str
    answerValue: str

class Response_structure(BaseModel):
    answers: List[Answer_structure]
    submittedAt: str

class Base(DeclarativeBase):
    pass

dburl=str(os.getenv("DatabaseUrl"))
if dburl.startswith("postgres://"):
    dburl=dburl.replace("postgres://","postgresql://")

engine=create_engine(dburl)

class User(Base):
    __tablename__="users"
    id:Mapped[int]=mapped_column(primary_key=True)
    email:Mapped[str]=mapped_column(nullable=False,unique=True)
    password:Mapped[str]=mapped_column(nullable=False)

class Form(Base):
    __tablename__="forms"
    id:Mapped[int] =mapped_column(primary_key=True)
    user_id:Mapped[int] =mapped_column(ForeignKey("users.id"))
    title:Mapped[str] =mapped_column(nullable=False)
    description:Mapped[str] =mapped_column(nullable=True)

class Question(Base):
    __tablename__="questions"
    id: Mapped[int] =mapped_column(primary_key=True)
    form_id: Mapped[int] =mapped_column(ForeignKey("forms.id"))
    question: Mapped[str] =mapped_column()
    type: Mapped[str] =mapped_column()
    options: Mapped[list] =mapped_column(JSON,nullable=True)

class Response(Base):
    __tablename__="responses"
    id: Mapped[int]= mapped_column(primary_key=True)
    form_id: Mapped[int]= mapped_column(ForeignKey("forms.id"))
    question_id: Mapped[int]= mapped_column(ForeignKey("questions.id"))
    answer: Mapped[str]= mapped_column()

Base.metadata.create_all(engine)

@app.api_route("/",methods=["GET","HEAD"])
def root():
    return{
        "status":"Backend is running"
    }

@app.post("/api/forms")
def form(data: Form_structure,userid: int=Depends(gcu)):                                             
    with Session(engine) as session:
        Formobj=Form(title=data.title,description=data.description,user_id=userid)
        session.add(Formobj)
        session.flush()
        for q in data.questions:
            qobj=Question(form_id=Formobj.id,question=q.text,type=q.type,options=q.options)
            session.add(qobj)
            
        form_id = Formobj.id
        session.commit()
        
    return form_id

@app.get("/api/forms")
def get_all_forms(userid: int=Depends(gcu)):
    with Session(engine) as session:
        forms = session.query(Form).filter(Form.user_id==userid).all()
        return [{"id": form.id, "title": form.title, "description": form.description} for form in forms]

@app.get("/api/forms/{formid}")
def getform(formid: int,userid: int=Depends(gcu)):
    with Session(engine) as session:
        form=session.query(Form).filter(Form.id==formid,Form.user_id==userid).first()
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
    
@app.get("/api/forms/{formid}/responses")
def response(formid: int, userid: int =Depends(gcu)):
    with Session(engine) as session:
        form=session.query(Form).filter(Form.id==formid,Form.user_id==userid).first()
        questions=session.query(Question).filter(Question.form_id==formid).all()
        answers=session.query(Response).filter(Response.form_id==formid).all()
    
    if form:
        return{
            "id":form.id,
            "title":form.title,
            "description":form.description,
            "questions":[
                {"id":q.id,
                 "text":q.question,
                 "type":q.type,
                 "options":q.options or []
                 } for q in questions
            ],
            "responses":[{
                "id": a.id,
                "question_id": a.question_id,
                "response": a.answer
            } for a in answers]
        }

@app.post("/api/forms/{formid}/submit")
def submit_response(formid: int, data: Response_structure):
    with Session(engine) as session:
        for ans in data.answers:
            qid=int(ans.questionId)
            answer=Response(form_id=formid,question_id=qid,answer=ans.answerValue)
            session.add(answer)
        session.commit()
    return {"message": "Success"}

@app.post("/api/signup")
def signup(data: User_struct):
    with Session(engine) as ss:
        exist=ss.query(User).filter(User.email== data.email).first()
        if exist:
            return{
                "error":"User already exists"
            }
        pwd=hashpwd(data.password)
        user=User(email=data.email,password=pwd)

        ss.add(user)
        ss.commit()
    
    return {
        "Success":"User created successfully"
    }

@app.post("/api/login")
def login(data: User_struct):
    with Session(engine) as ss:
        user=ss.query(User).filter(User.email==data.email).first()
        if not user:
            return{
                "Error":"User doesn't exist"
            }
        if not verifypwd(data.password,user.password):
            return {
                "Error":"Invalid credentials"
            }
        token=create_token(user.id)
    return {
        "access_token":token
    }