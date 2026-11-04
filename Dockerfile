FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security and cloud environments
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

RUN mkdir -p uploads

# Expose common cloud web ports (Render 10000, Spaces/Colab 7860, local 8765)
EXPOSE 7860 8765 10000

ENV HOST=0.0.0.0 \
    PYTHONUNBUFFERED=1

CMD ["python", "app.py", "--server"]
