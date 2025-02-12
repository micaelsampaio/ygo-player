# YGO Player

## Build the Docker Image

To build the Docker image, use the following command:

```bash
docker build -t player .
```

This will create the player image by building player, __tests__ and serving dist in nginx

## Run the Docker Container

Once the image is built, you can run the container with:

```bash
docker run -p 8081:80 --rm -d --name player player
```

This will start the HTTP server and bind port 8081 on your host to port 80 inside the container. The --rm flag ensures that the container is removed when stopped. You can access the card data at http://localhost:8081.


## Local Developement

Build the web component:

```bash
yarn dev
```

Run web app to test the web component:

```bash
cd __tests__
yarn dev
```