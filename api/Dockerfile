FROM python:3.12-alpine

WORKDIR /code

RUN apk add --no-cache postgresql-client

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY alembic.ini /code/
COPY ./alembic /code/alembic
COPY start-api.sh /code/
RUN chmod +x /code/start-api.sh

COPY ./app /code/app
COPY ./tests /code/tests

CMD ["/code/start-api.sh"]