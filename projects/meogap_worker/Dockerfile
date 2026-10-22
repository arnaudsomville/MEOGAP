FROM docker_base_image AS production_image

ENV APP_SOURCES=/home/${USERNAME}/app_source
ENV PROJECT_NAME=meogap_worker

USER ${USERNAME}
WORKDIR ${APP_SOURCES}

COPY --from=python_builder ${APP_SOURCES}/projects/${PROJECT_NAME}/src/ ./src
COPY --from=python_builder ${APP_SOURCES}/projects/${PROJECT_NAME}/.venv/ ./.venv
COPY --from=python_builder ${APP_SOURCES}/.python ${APP_SOURCES}/.python

ENV VENV_BIN=${APP_SOURCES}/.venv/bin
ENV PATH="${VENV_BIN}:$PATH"
ENV PYTHONPATH=${APP_SOURCES}/src

ENTRYPOINT [ "/bin/bash", "-c" ]
STOPSIGNAL SIGTERM

CMD [ "python -m worker.main" ]
