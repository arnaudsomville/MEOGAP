FROM docker_base_image AS production_image

ENV APP_SOURCES=/home/${USERNAME}/app_source
ARG PROJECT_NAME

USER ${USERNAME}
WORKDIR ${APP_SOURCES}

COPY --from=python_builder ${APP_SOURCES}/projects/${PROJECT_NAME}/src/ ./src
COPY --from=python_builder ${APP_SOURCES}/projects/${PROJECT_NAME}/.venv/ ./.venv
COPY --from=python_builder ${APP_SOURCES}/.python ${APP_SOURCES}/.python

# Copy local dependency (dummy_project) into the final image
COPY --from=python_builder ${APP_SOURCES}/projects/dummy_project/src/ ./src
COPY --from=python_builder ${APP_SOURCES}/projects/dummy_project/.venv/ ./.venv

ENV VENV_BIN=${APP_SOURCES}/.venv/bin
ENV PATH="${VENV_BIN}:$PATH"
ENV PYTHONPATH=${APP_SOURCES}/src

EXPOSE 8000

ENTRYPOINT [ "/bin/bash", "-c" ]
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
CMD curl -f http://localhost:8000/ || exit 1

CMD [ "python -m dummy_project_with_local_dependancy.main" ]
