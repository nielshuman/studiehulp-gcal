# Use the official Deno image from the Docker Hub
FROM denoland/deno:2.0.6
WORKDIR /app
COPY deno.json .
COPY deno.lock .
RUN deno install
COPY . .
EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "shitzooi.js"]