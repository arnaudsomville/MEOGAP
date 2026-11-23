FROM docker_base_image AS production_image

ENV APP_SOURCES=/home/${USERNAME}/app_source
ENV PROJECT_NAME=meogap_cat

USER ${USERNAME}
WORKDIR ${APP_SOURCES}

COPY --from=python_builder ${APP_SOURCES}/projects/${PROJECT_NAME}/src/ ./src
COPY --from=python_builder ${APP_SOURCES}/projects/${PROJECT_NAME}/.venv/ ./.venv
COPY --from=python_builder ${APP_SOURCES}/.python ${APP_SOURCES}/.python

ENV VENV_BIN=${APP_SOURCES}/.venv/bin
ENV PATH="${VENV_BIN}:$PATH"
ENV PYTHONPATH=${APP_SOURCES}/src

EXPOSE 8003

ENTRYPOINT [ "/bin/bash", "-c" ]
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
CMD curl -f http://127.0.0.1:8003/internal/v1/health || exit 1

CMD [ "python -m meogap_cat.main" ]
