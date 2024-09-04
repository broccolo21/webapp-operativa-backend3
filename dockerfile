# Usa un'immagine Python ufficiale come base
FROM python:3.9

# Imposta le variabili d'ambiente
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Imposta la directory di lavoro nel container
WORKDIR /code

# Installa le dipendenze
COPY requirements.txt /code/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copia il progetto
COPY . /code/

# Esponi la porta su cui l'app sarà in ascolto
EXPOSE 8000

# Comando per avviare l'applicazione
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
