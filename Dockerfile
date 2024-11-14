# Use the official Deno image from the Docker Hub
FROM denoland/deno:2.0.6
WORKDIR /app
COPY . .
RUN deno install
EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "shitzooi.js"]