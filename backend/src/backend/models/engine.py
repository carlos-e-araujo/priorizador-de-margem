from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.dataroom import Base

class PrioritizationRun(Base):
    __tablename__ = "prioritization_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    total_ebitda_potential: Mapped[float] = mapped_column(Float, default=0.0)
    critic_verdict: Mapped[str] = mapped_column(String(20), default="PENDING")
    critic_score: Mapped[float] = mapped_column(Float, default=0.0)
    summary: Mapped[str] = mapped_column(Text, default="")

    initiatives: Mapped[list["Initiative"]] = relationship(
        "Initiative", back_populates="run", cascade="all, delete-orphan"
    )

class Initiative(Base):
    __tablename__ = "initiatives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(Integer, ForeignKey("prioritization_runs.id"))
    title: Mapped[str] = mapped_column(String(150))
    pilar: Mapped[str] = mapped_column(String(50))
    fact_observed: Mapped[str] = mapped_column(Text)
    hypothesis: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text)
    estimated_impact_brl: Mapped[float] = mapped_column(Float)
    effort_level: Mapped[int] = mapped_column(Integer)   # 1=Baixo, 2=Médio, 3=Alto
    risk_level: Mapped[int] = mapped_column(Integer)     # 1=Baixo, 2=Médio, 3=Alto
    horizon_days: Mapped[int] = mapped_column(Integer)   # 30, 60 ou 90
    priority_score: Mapped[float] = mapped_column(Float)
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_status: Mapped[str] = mapped_column(String(20), default="PENDING")

    run: Mapped["PrioritizationRun"] = relationship("PrioritizationRun", back_populates="initiatives")
