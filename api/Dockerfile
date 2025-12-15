FROM python:3.12-alpine AS builder

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

FROM python:3.12-alpine AS production

WORKDIR /code

RUN apk add --no-cache postgresql17-client=17.7-r0 \
    openssh-client=10.2_p1-r0

RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY *.ini /code/
COPY start-api.sh /code/
COPY ./alembic /code/alembic
COPY ./tests /code/tests
COPY ./app /code/app
COPY ./ansible /code/ansible
RUN chmod +x /code/start-api.sh

CMD ["/code/start-api.sh"]
