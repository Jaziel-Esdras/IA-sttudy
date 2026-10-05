# StudyFlow

Aplicação de apoio aos estudos com interface web, matérias, checklist, materiais salvos e recursos de gamificação.

## Publicação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente o conteúdo de `IA-STUDY` a cada push para `main`. Ele também pode ser iniciado manualmente na aba **Actions**.

Na primeira publicação, abra **Settings → Pages** no repositório e selecione **GitHub Actions** como origem. O domínio personalizado configurado no projeto é:

<https://flowsttuffyyy.com>

O arquivo `IA-STUDY/CNAME` mantém o domínio na publicação, e `IA-STUDY/.nojekyll` instrui o Pages a servir os arquivos diretamente.

## Assistente e API

O GitHub Pages serve arquivos estáticos e não executa o backend Python. Sem uma API hospedada, o assistente mostra um resumo local e uma busca do YouTube. Para respostas completas e histórico:

1. Hospede o diretório `backend` em um serviço que execute Python.
2. Configure a variável `CORS_ORIGINS` nesse serviço como `https://flowsttuffyyy.com`.
3. Em `IA-STUDY/config.js`, defina `window.STUDYFLOW_API_BASE_URL` com a URL pública do backend, sem barra final.
4. Publique novamente o projeto.

Configure `OPENAI_API_KEY` como segredo/variável de ambiente do serviço backend. Não coloque essa chave nos arquivos públicos do site.

## Backend local

Na raiz do repositório, execute no PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

## Estrutura

- `IA-STUDY/`: interface estática publicada no GitHub Pages.
- `backend/`: API FastAPI e histórico local.
- `tests/`: testes automatizados.