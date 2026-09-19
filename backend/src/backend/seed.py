import os
from pathlib import Path
import pandas as pd
from backend.database import engine
from backend.models.dataroom import Base
import backend.models.engine  # Importa para registrar tabelas de engine no metadata

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

def seed_database():
    """Carrega os dados dos arquivos CSV tratados diretamente para o banco SQLite."""
    print(f"Diretório de dados: {DATA_DIR}")
    print("Criando tabelas no banco SQLite se não existirem...")
    Base.metadata.create_all(bind=engine)

    csv_mapping = {
        "clientes": "clientes_tratado.csv",
        "estoque": "estoque_tratado.csv",
        "marketing": "marketing_tratado.csv",
        "vendas": "vendas_tratado.csv",
        "atendimento": "atendimento_tratado.csv",
    }

    with engine.connect() as conn:
        for table_name, filename in csv_mapping.items():
            csv_path = DATA_DIR / filename
            if not csv_path.exists():
                print(f"Aviso: Arquivo {csv_path} não encontrado. Pulando...")
                continue

            print(f"Lendo {filename} e carregando na tabela '{table_name}'...")
            df = pd.read_csv(csv_path)

            if table_name == "atendimento":
                # Tratamento de integridade dos tickets:
                # Tickets com status 'Aberto' ou 'Em Análise' ainda não foram concluídos.
                # O CSV original possuía datas sentinela (2025-12-31 23:59:00) e cálculo
                # distorcido de tempo de resolução que gerava milhares de horas irreais.
                # Definimos como NULL (None) tanto data_fechamento quanto tempo_resolucao_horas.
                mask_em_aberto = df["status_atendimento"].isin(["Aberto", "Em Análise"])
                df.loc[mask_em_aberto, "tempo_resolucao_horas"] = None
                df.loc[mask_em_aberto, "data_fechamento"] = None
                print(f"  -> {mask_em_aberto.sum()} tickets em aberto/análise tratados com tempo_resolucao_horas = NULL.")

            df.to_sql(
                name=table_name,
                con=conn,
                if_exists="replace",  # Garante idempotência e base atualizada
                index=False,
                chunksize=2000
            )
            print(f"Tabela '{table_name}' populada com sucesso: {len(df)} registros.")

    print("\nBanco de dados SQLite (vertice.db) carregado com os dados reais do case!")

if __name__ == "__main__":
    seed_database()
