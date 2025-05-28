# Deploy Demo Image

This demo docker image for Deploy will be deployed to a container as the demo image for initializing a Deploy pipeline. 

## Development

To test the index.html use [Live Preview](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server).

If you would like to build and run the image locally, you can use: 

### Build
```
docker build -t deploy-demo .
```
### Run
```
docker run -d -p 8080:80 deploy-demo
```

## Deployment

The Github Actions for this repository will automatically deploy the new image to GCP on a push to `main`. The image will be tagged with the git commit sha and `latest`. GCP's Artifact Registry will automatically maintain unique tags. There is no cleanup needed by the action for duplicate `latest` tags. 

The image is hosted at `us-docker.pkg.dev/hyphenai/public/deploy-demo` on GCP. This docker repository is publically accessible. 

## Usage

To pull the deployed image, use: 

```
docker pull us-docker.pkg.dev/hyphenai/public/deploy-demo
```
