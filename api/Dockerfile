FROM python:3.12-alpine

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
COPY alembic.ini /code/
COPY ./alembic /code/alembic
COPY start-api.sh /code/
COPY ./app /code/app
COPY ./tests /code/tests

RUN chmod +x /code/start-api.sh
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
RUN apk add --no-cache postgresql17-client=17.7-r0


CMD ["/code/start-api.sh"]