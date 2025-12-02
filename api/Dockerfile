FROM python:3.12-alpine

WORKDIR /code

RUN apk add --no-cache postgresql17-client=17.7-r0

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY *.ini /code/
COPY start-api.sh /code/
COPY ./alembic /code/alembic
COPY ./tests /code/tests
COPY ./app /code/app
RUN mkdir -p /code/alembic/versions
RUN chmod +x /code/start-api.sh

CMD ["/code/start-api.sh"]
