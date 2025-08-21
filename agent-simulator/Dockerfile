FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    tmux \
    && rm -rf /var/lib/apt/lists/*

# Copy simulator code
COPY simulator.py .
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create agent user
RUN useradd -m -s /bin/bash agent && \
    chown -R agent:agent /app

USER agent

# Run simulator
CMD ["python", "simulator.py"]