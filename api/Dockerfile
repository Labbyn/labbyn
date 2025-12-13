FROM python:3.12-alpine

WORKDIR /code

RUN apk add --no-cache postgresql17-client=17.7-r0 \
    openssh-client

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY *.ini /code/
COPY start-api.sh /code/
COPY ./alembic /code/alembic
COPY ./tests /code/tests
COPY ./app /code/app
COPY ./ansible /code/ansible
RUN mkdir -p /code/alembic/versions && \
    chmod +x /code/start-api.sh

RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

CMD ["/code/start-api.sh"]
