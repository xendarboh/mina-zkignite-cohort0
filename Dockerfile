ARG SWS_IMAGE
ARG SWS_TAG
FROM node:18-slim as BUILD

# https://github.com/dotnet/core/issues/2186#issuecomment-671105420
# Fix: Couldn't find a valid ICU package installed on the system.
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

WORKDIR /work/
COPY . .

# final destination of build files to serve
RUN mkdir /public
# RUN cp -av public/. /public/

# build libraries
RUN cd lib/snarky-bioauth \
  && npm install \
  && npm run build \
  # link for other components to use
  && npm link \
  && npm run docs \
  # move docs to avoid duplicate README from typedocs
  && mv build/docs/* .

# build docs
RUN cd docs \
  && npm install \
  && npx retype build . \
  && mv -v build/* /public/

# build contracts
RUN cd contracts \
  && npm install \
  && npm link snarky-bioauth \
  && npm run build

# build ui
RUN cd ui \
  && npm install \
  && npm link snarky-bioauth \
  && npm run build \
  && npm run export \
  && mv out /public/zkApp

FROM ${SWS_IMAGE}:${SWS_TAG}
COPY --from=BUILD /public /public
