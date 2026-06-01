<<<<<<< HEAD
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
=======
import uuid
from datetime import datetime
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

<<<<<<< HEAD
    sessions: Mapped[List["ChatSession"]] = relationship(back_populates="user")
=======
    sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user")
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
<<<<<<< HEAD
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[Optional["User"]] = relationship(back_populates="sessions")
    messages: Mapped[List["Message"]] = relationship(back_populates="session")
=======
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="sessions")
    messages: Mapped[list["Message"]] = relationship(back_populates="session")
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"))
<<<<<<< HEAD
    role: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
=======
    role: Mapped[str] = mapped_column(String)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
<<<<<<< HEAD
    type: Mapped[str] = mapped_column(String)
    rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
=======
    type: Mapped[str] = mapped_column(String)  # "credit" | "deposit" | "investment"
    rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
    url: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
